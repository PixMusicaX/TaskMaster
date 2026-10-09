"use server";

import { db } from "@/db";
import { event } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, and, or, lte, asc, like, isNotNull } from "drizzle-orm";
import { format } from "date-fns";
import { requireUserId } from "@/lib/current-user";
import { invalidateSnapshots } from "@/lib/data/stats";
import { eventsByDateRange, syncRecurringEventsFor } from "@/lib/data/events";

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

// Holidays are copied into each player's own calendar, so this runs once a month per account
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

  const currentYear = runDate.getFullYear();
  // Up to next 3 years
  const years = [currentYear, currentYear + 1, currentYear + 2, currentYear + 3];
  let totalInserted = 0;

  for (const year of years) {
    try {
      const response = await fetch(`https://calendarific.com/api/v2/holidays?api_key=${apiKey}&country=IN&year=${year}`);
      const data = await response.json();

      if (data.meta.code !== 200) continue;

      const holidays = data.response.holidays;

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
        const dateIso = holiday.date.iso.split('T')[0]; // Format: YYYY-MM-DD
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

  // Also sync user recurring events
  const userRecurringInserted = await syncRecurringEventsFor(userId);

  revalidateEventPages();
  return { success: true, message: `Inserted ${totalInserted} new holidays and ${userRecurringInserted} recurring user events` };
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
