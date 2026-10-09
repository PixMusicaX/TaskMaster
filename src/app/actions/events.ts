"use server";

import { db } from "@/db";
import { event } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, and, or, lte, asc, like, isNotNull, inArray } from "drizzle-orm";
import { format } from "date-fns";
import { requireUserId } from "@/lib/current-user";
import { invalidateSnapshots } from "@/lib/data/stats";
import { eventsByDateRange, syncRecurringEventsFor } from "@/lib/data/events";
import { preferencesFor, saveHolidayRegion } from "@/lib/data/preferences";
import { isHolidayRegion } from "@/lib/personalization";

// What a client may set on an event; ownership and system fields are never taken from it
type EventInput = {
  title?: string;
  description?: string | null;
  startTime?: Date | null;
  endTime?: Date | null;
  date?: string;
  type?: string;
  tier?: string;
  stat?: string | null;
  completed?: boolean;
  notification?: boolean;
  repeatsYearly?: boolean;
};

function pickEventInput(data: EventInput): EventInput {
  const { title, description, startTime, endTime, date, type, tier, stat, completed, notification, repeatsYearly } = data;
  const picked = { title, description, startTime, endTime, date, type, tier, stat, completed, notification, repeatsYearly };
  return Object.fromEntries(Object.entries(picked).filter(([, v]) => v !== undefined));
}

function revalidateEventPages() {
  revalidatePath("/calendar");
  revalidatePath("/home");
}

export async function getEventsByDateRange(start: Date, end: Date) {
  return eventsByDateRange(await requireUserId(), start, end);
}

export async function getDashboardTasks(targetDateStr: string) {
  const userId = await requireUserId();
  return await db.select().from(event).where(
    and(
      eq(event.userId, userId),
      or(
        eq(event.date, targetDateStr),
        and(
          eq(event.type, "task"),
          eq(event.completed, false),
          lte(event.date, targetDateStr)
        )
      )
    )
  ).orderBy(asc(event.date), asc(event.startTime));
}

export async function syncRecurringEvents() {
  return syncRecurringEventsFor(await requireUserId());
}

export async function addEvent(data: EventInput & { title: string; date: string; type: string }) {
  const userId = await requireUserId();
  const values = pickEventInput(data) as EventInput & { title: string; date: string; type: string };
  const [newEvent] = await db.insert(event).values({ ...values, userId }).returning();
  await invalidateSnapshots(userId, newEvent.date);
  if (data.repeatsYearly) {
    await syncRecurringEventsFor(userId);
  }
  revalidateEventPages();
  return newEvent;
}

export async function updateEvent(id: string, data: EventInput) {
  const userId = await requireUserId();
  const mine = and(eq(event.id, id), eq(event.userId, userId));
  const [existing] = await db.select().from(event).where(mine);
  if (!existing || existing.isApi) return;
  const [updatedEvent] = await db.update(event)
    .set(pickEventInput(data))
    .where(mine)
    .returning();
  await invalidateSnapshots(userId, existing.date, updatedEvent?.date);

  if (data.repeatsYearly || existing.repeatsYearly) {
    await syncRecurringEventsFor(userId);
  }

  revalidateEventPages();
  return updatedEvent;
}

export async function toggleEventCompletion(id: string, completed: boolean) {
  const userId = await requireUserId();
  const mine = and(eq(event.id, id), eq(event.userId, userId));
  const [existing] = await db.select().from(event).where(mine);
  if (!existing) return null;

  const updateData: Partial<typeof event.$inferInsert> = { completed };

  // If a task is being marked complete, update its date to today
  // so it correctly shows up in the history for the day it was actually completed.
  if (completed && existing.type === "task") {
    updateData.date = format(new Date(), "yyyy-MM-dd");
  }

  const [updatedEvent] = await db.update(event)
    .set(updateData)
    .where(mine)
    .returning();

  await invalidateSnapshots(userId, existing.date, updatedEvent.date);

  revalidateEventPages();
  return updatedEvent;
}

export async function deleteEvent(id: string) {
  const userId = await requireUserId();
  const mine = and(eq(event.id, id), eq(event.userId, userId));
  const [existing] = await db.select().from(event).where(mine);
  if (!existing) return;

  if (existing.isApi && existing.type !== "special_day") return;

  if (existing.repeatsYearly) {
    // If it's a recurring event, delete all instances across years
    const [, month, day] = existing.date.split("-");
    const deleted = await db.delete(event).where(
      and(
        eq(event.userId, userId),
        eq(event.title, existing.title),
        eq(event.type, existing.type),
        like(event.date, `%-${month}-${day}`)
      )
    ).returning({ date: event.date });
    await invalidateSnapshots(userId, ...deleted.map(e => e.date));
  } else {
    // Otherwise just delete the single instance
    await db.delete(event).where(mine);
    await invalidateSnapshots(userId, existing.date);
  }

  revalidateEventPages();
}

export async function getAllEvents() {
  const userId = await requireUserId();
  return await db.select().from(event).where(eq(event.userId, userId)).orderBy(asc(event.startTime));
}

// The four years of holidays kept on a calendar, starting from the year of `from`
const holidayYears = (from: Date) => [0, 1, 2, 3].map(n => from.getFullYear() + n);

// One country's holidays for one year from Calendarific (null when the request fails)
async function fetchHolidays(apiKey: string, country: string, year: number): Promise<{ name: string; description: string; date: string }[] | null> {
  const response = await fetch(`https://calendarific.com/api/v2/holidays?api_key=${apiKey}&country=${country}&year=${year}`);
  const data = await response.json();
  if (data.meta.code !== 200) return null;
  return (data.response.holidays as { name: string; description: string; date: { iso: string } }[])
    .map(h => ({ name: h.name, description: h.description, date: h.date.iso.split("T")[0] }));
}

// Holidays are copied into each player's own calendar, for the country they picked on the
// account page, so this runs once a month per account
export async function syncMonthlyHolidays(testDateStr?: string) {
  const userId = await requireUserId();
  const apiKey = process.env.calendarific_key;
  if (!apiKey) {
    console.error("No Calendarific API key found in .env");
    return { success: false, message: "No API key" };
  }

  const runDate = testDateStr ? new Date(testDateStr) : new Date();

  // Only run if it's the first day of the month or we are testing a specific date
  const isFirstOfMonth = runDate.getDate() === 1;

  if (!isFirstOfMonth && !testDateStr) {
    return { success: false, message: "Not the first of the month" };
  }

  // Monthly housekeeping for special days, run alongside the holiday sync
  await cleanupSpecialDaysFor(userId);

  const { holidayRegion } = await preferencesFor(userId);
  const totalInserted = holidayRegion ? await addHolidays(userId, apiKey, holidayRegion, runDate) : 0;

  // Also sync user recurring events
  const userRecurringInserted = await syncRecurringEventsFor(userId);

  revalidateEventPages();
  return { success: true, message: `Inserted ${totalInserted} new holidays and ${userRecurringInserted} recurring user events` };
}

// Copies a country's holidays into this player's calendar (this year and the next three),
// skipping any already there
async function addHolidays(userId: string, apiKey: string, country: string, from: Date) {
  let totalInserted = 0;

  for (const year of holidayYears(from)) {
    try {
      const holidays = await fetchHolidays(apiKey, country, year);
      if (!holidays) continue;

      const existingDays = await db.select().from(event).where(
        and(
          eq(event.userId, userId),
          eq(event.type, "special_day"),
          like(event.date, `${year}-%`)
        )
      );

      const existingKeys = new Set(existingDays.map(e => `${e.title}_${e.date}`));
      const toInsert: (typeof event.$inferInsert)[] = [];

      for (const holiday of holidays) {
        const dateIso = holiday.date; // Format: YYYY-MM-DD
        const key = `${holiday.name}_${dateIso}`;

        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          toInsert.push({
            userId,
            title: holiday.name,
            description: holiday.description,
            date: dateIso,
            type: "special_day",
            tier: "main",
            isApi: true,
          });
        }
      }

      if (toInsert.length > 0) {
        await db.insert(event).values(toInsert);
        totalInserted += toInsert.length;
      }
    } catch (err) {
      console.error(`Error processing year ${year}:`, err);
    }
  }

  return totalInserted;
}

// Takes one country's holidays back out of this player's calendar. Only entries that match that
// country's own list by name and date go, so special days the player added themselves stay.
async function removeHolidays(userId: string, apiKey: string, country: string, from: Date) {
  let totalRemoved = 0;
  for (const year of holidayYears(from)) {
    try {
      const holidays = await fetchHolidays(apiKey, country, year);
      if (!holidays || holidays.length === 0) continue;
      const listed = new Set(holidays.map(h => `${h.name}_${h.date}`));
      const candidates = await db.select({ id: event.id, title: event.title, date: event.date }).from(event).where(
        and(eq(event.userId, userId), eq(event.type, "special_day"), eq(event.isApi, true), like(event.date, `${year}-%`))
      );
      const ids = candidates.filter(e => listed.has(`${e.title}_${e.date}`)).map(e => e.id);
      if (ids.length === 0) continue;
      await db.delete(event).where(and(eq(event.userId, userId), inArray(event.id, ids)));
      totalRemoved += ids.length;
    } catch (err) {
      console.error(`Error removing holidays for ${year}:`, err);
    }
  }
  return totalRemoved;
}

// Account page: change which country's holidays fill the calendar ("" for none). The old
// country's holidays from this year on are swapped for the new one's.
export async function changeHolidayRegion(region: string, clientDateStr?: string) {
  const userId = await requireUserId();
  if (!isHolidayRegion(region)) return { success: false as const, message: "Unknown region." };
  const apiKey = process.env.calendarific_key;
  if (!apiKey) return { success: false as const, message: "Holidays aren't set up on this server." };

  const { holidayRegion: previous } = await preferencesFor(userId);
  if (previous === region) return { success: true as const, region, removed: 0, added: 0 };

  const from = clientDateStr ? new Date(clientDateStr) : new Date();
  try {
    await saveHolidayRegion(userId, region);
  } catch (e) {
    console.error("Could not save the holiday region:", e);
    return { success: false as const, message: "Could not save the region." };
  }
  const removed = previous ? await removeHolidays(userId, apiKey, previous, from) : 0;
  const added = region ? await addHolidays(userId, apiKey, region, from) : 0;

  revalidateEventPages();
  return { success: true as const, region, removed, added };
}

async function cleanupSpecialDaysFor(userId: string) {
  const result = await db.delete(event).where(
    and(
      eq(event.userId, userId),
      eq(event.type, "special_day"),
      isNotNull(event.startTime)
    )
  ).returning();

  if (result.length > 0) {
    console.log(`Cleaned up ${result.length} duplicate special days`);
  }

  // 2. Ensure all special days are marked as isApi (system items)
  await db.update(event).set({ isApi: true }).where(and(eq(event.userId, userId), eq(event.type, "special_day")));

  return result.length;
}

export async function cleanupDuplicateSpecialDays() {
  const count = await cleanupSpecialDaysFor(await requireUserId());
  revalidateEventPages();
  return { success: true, count };
}
