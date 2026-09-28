"use server";

import { db } from "@/db";
import { event } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, and, or, gte, lte, asc, like, isNotNull, inArray } from "drizzle-orm";
import { invalidateSeasonSnapshots } from "./gamification";
import { format } from "date-fns";

export async function getEventsByDateRange(start: Date, end: Date) {
  const startStr = format(start, "yyyy-MM-dd");
  const endStr = format(end, "yyyy-MM-dd");
  return await db.select().from(event).where(
    and(
      gte(event.date, startStr),
      lte(event.date, endStr)
    )
  ).orderBy(asc(event.date), asc(event.startTime));
}

export async function getDashboardTasks(targetDateStr: string) {
  return await db.select().from(event).where(
    or(
      eq(event.date, targetDateStr),
      and(
        eq(event.type, "task"),
        eq(event.completed, false),
        lte(event.date, targetDateStr)
      )
    )
  ).orderBy(asc(event.date), asc(event.startTime));
}

export async function syncRecurringEvents() {
  const recurringEvents = await db.select().from(event).where(eq(event.repeatsYearly, true));
  if (recurringEvents.length === 0) return 0;

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1, currentYear + 2, currentYear + 3];

  // Build every target instance up front, then check existence with a single query
  const candidates = recurringEvents.flatMap((sourceEvent) => {
    const [, month, day] = sourceEvent.date.split("-");
    return years
      .map((year) => ({ sourceEvent, year, targetDate: `${year}-${month}-${day}` }))
      // Don't overwrite the source event itself if it's in this year
      .filter(({ targetDate }) => targetDate !== sourceEvent.date);
  });

  const existing = await db.select({ title: event.title, date: event.date, type: event.type }).from(event).where(
    and(
      inArray(event.title, Array.from(new Set(recurringEvents.map(e => e.title)))),
      inArray(event.date, Array.from(new Set(candidates.map(c => c.targetDate))))
    )
  );
  const existingKeys = new Set(existing.map(e => `${e.title}|${e.date}|${e.type}`));

  const seen = new Set<string>();
  const toInsert = candidates.flatMap(({ sourceEvent, year, targetDate }) => {
    const key = `${sourceEvent.title}|${targetDate}|${sourceEvent.type}`;
    if (existingKeys.has(key) || seen.has(key)) return [];
    seen.add(key);
    // Create a copy for the future year
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- drop DB-generated fields before re-inserting
      const { id, createdAt, ...eventData } = sourceEvent;
    return [{
      ...eventData,
      date: targetDate,
      completed: false,
      isApi: true, // Mark instances as system-managed
      startTime: sourceEvent.startTime ? new Date(new Date(sourceEvent.startTime).setFullYear(year)) : null,
      endTime: sourceEvent.endTime ? new Date(new Date(sourceEvent.endTime).setFullYear(year)) : null,
    }];
  });

  if (toInsert.length > 0) {
    await db.insert(event).values(toInsert);
    await invalidateSeasonSnapshots(...toInsert.map(e => e.date));
  }
  return toInsert.length;
}

export async function addEvent(data: {
  title: string;
  description?: string;
  startTime?: Date | null;
  endTime?: Date | null;
  date: string;
  type: string;
  tier?: string;
  notification?: boolean;
  repeatsYearly?: boolean;
}) {
  const [newEvent] = await db.insert(event).values(data).returning();
  await invalidateSeasonSnapshots(newEvent.date);
  if (data.repeatsYearly) {
    await syncRecurringEvents();
  }
  revalidatePath("/calendar");
  revalidatePath("/");
  return newEvent;
}

export async function updateEvent(id: string, data: Partial<typeof event.$inferInsert>) {
  const [existing] = await db.select().from(event).where(eq(event.id, id));
  if (existing?.isApi) return;
  const [updatedEvent] = await db.update(event)
    .set(data)
    .where(eq(event.id, id))
    .returning();
  await invalidateSeasonSnapshots(existing?.date, updatedEvent?.date);
    
  if (data.repeatsYearly || existing?.repeatsYearly) {
    await syncRecurringEvents();
  }
  
  revalidatePath("/calendar");
  revalidatePath("/");
  return updatedEvent;
}

export async function toggleEventCompletion(id: string, completed: boolean) {
  const [existing] = await db.select().from(event).where(eq(event.id, id));
  if (!existing) return null;

  const updateData: Partial<typeof event.$inferInsert> = { completed };
  
  // If a task is being marked complete, update its date to today
  // so it correctly shows up in the history for the day it was actually completed.
  if (completed && existing.type === "task") {
    updateData.date = format(new Date(), "yyyy-MM-dd");
  }

  const [updatedEvent] = await db.update(event)
    .set(updateData)
    .where(eq(event.id, id))
    .returning();

  await invalidateSeasonSnapshots(existing.date, updatedEvent.date);

  revalidatePath("/calendar");
  revalidatePath("/");
  return updatedEvent;
}

export async function deleteEvent(id: string) {
  const [existing] = await db.select().from(event).where(eq(event.id, id));
  if (!existing) return;

  if (existing.isApi && existing.type !== "special_day") return;

  if (existing.repeatsYearly) {
    // If it's a recurring event, delete all instances across years
    const [, month, day] = existing.date.split("-");
    const deleted = await db.delete(event).where(
      and(
        eq(event.title, existing.title),
        eq(event.type, existing.type),
        like(event.date, `%-${month}-${day}`)
      )
    ).returning({ date: event.date });
    await invalidateSeasonSnapshots(...deleted.map(e => e.date));
  } else {
    // Otherwise just delete the single instance
    await db.delete(event).where(eq(event.id, id));
    await invalidateSeasonSnapshots(existing.date);
  }

  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function getAllEvents() {
  return await db.select().from(event).orderBy(asc(event.startTime));
}

export async function syncMonthlyHolidays(testDateStr?: string) {
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
  await cleanupDuplicateSpecialDays();

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
  const userRecurringInserted = await syncRecurringEvents();
  
  revalidatePath("/calendar");
  revalidatePath("/");
  return { success: true, message: `Inserted ${totalInserted} new holidays and ${userRecurringInserted} recurring user events` };
}

export async function cleanupDuplicateSpecialDays() {
  const result = await db.delete(event).where(
    and(
      eq(event.type, "special_day"),
      isNotNull(event.startTime)
    )
  ).returning();
  
  if (result.length > 0) {
    console.log(`Cleaned up ${result.length} duplicate special days`);
  }
  
  // 2. Ensure all special days are marked as isApi (system items)
  await db.update(event).set({ isApi: true }).where(eq(event.type, "special_day"));
  
  revalidatePath("/calendar");
  revalidatePath("/");
  return { success: true, count: result.length };
}
