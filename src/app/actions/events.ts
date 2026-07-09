"use server";

import { db } from "@/db";
import { event } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, and, or, gte, lte, asc, like, isNotNull } from "drizzle-orm";
import { addXP } from "./gamification";
import { XP_VALUES } from "@/lib/constants";
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
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1, currentYear + 2, currentYear + 3];
  
  let totalInserted = 0;

  for (const sourceEvent of recurringEvents) {
    const [_, month, day] = sourceEvent.date.split("-");
    for (const year of years) {
      const targetDate = `${year}-${month}-${day}`;
      
      // Don't overwrite the source event itself if it's in this year
      if (targetDate === sourceEvent.date) continue;

      const [existing] = await db.select().from(event).where(
        and(
          eq(event.title, sourceEvent.title),
          eq(event.date, targetDate),
          eq(event.type, sourceEvent.type)
        )
      );

      if (!existing) {
        // Create a copy for the future year
        const { id, createdAt, ...eventData } = sourceEvent;
        await db.insert(event).values({
          ...eventData,
          date: targetDate,
          completed: false,
          isApi: true, // Mark instances as system-managed
          startTime: sourceEvent.startTime ? new Date(new Date(sourceEvent.startTime).setFullYear(year)) : null,
          endTime: sourceEvent.endTime ? new Date(new Date(sourceEvent.endTime).setFullYear(year)) : null,
        });
        totalInserted++;
      }
    }
  }
  return totalInserted;
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
  if (data.repeatsYearly) {
    await syncRecurringEvents();
  }
  revalidatePath("/calendar");
  revalidatePath("/");
  return newEvent;
}

export async function updateEvent(id: string, data: any) {
  const [existing] = await db.select().from(event).where(eq(event.id, id));
  if (existing?.isApi) return;
  const [updatedEvent] = await db.update(event)
    .set(data)
    .where(eq(event.id, id))
    .returning();
    
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

  const updateData: any = { completed };
  
  // If a task is being marked complete, update its date to today
  // so it correctly shows up in the history for the day it was actually completed.
  if (completed && existing.type === "task") {
    updateData.date = format(new Date(), "yyyy-MM-dd");
  }

  const [updatedEvent] = await db.update(event)
    .set(updateData)
    .where(eq(event.id, id))
    .returning();

  if (completed) {
    let xp = updatedEvent.type === "task"
      ? XP_VALUES.TASK
      : updatedEvent.tier === "epic"
        ? XP_VALUES.QUEST_EPIC
        : updatedEvent.tier === "main"
          ? XP_VALUES.QUEST_MAIN
          : XP_VALUES.QUEST_SIDE;
    
    await addXP(xp, updatedEvent.stat || undefined);
  }

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
    const [_, month, day] = existing.date.split("-");
    await db.delete(event).where(
      and(
        eq(event.title, existing.title),
        eq(event.type, existing.type),
        like(event.date, `%-${month}-${day}`)
      )
    );
  } else {
    // Otherwise just delete the single instance
    await db.delete(event).where(eq(event.id, id));
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

  let runDate = testDateStr ? new Date(testDateStr) : new Date();
  
  // Only run if it's the first day of the month or we are testing a specific date
  const isFirstOfMonth = runDate.getDate() === 1;

  if (!isFirstOfMonth && !testDateStr) {
    return { success: false, message: "Not the first of the month" };
  }

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

      for (const holiday of holidays) {
        const dateIso = holiday.date.iso.split('T')[0]; // Format: YYYY-MM-DD
        const key = `${holiday.name}_${dateIso}`;
        
        if (!existingKeys.has(key)) {
          await db.insert(event).values({
            title: holiday.name,
            description: holiday.description,
            date: dateIso,
            type: "special_day",
            tier: "main",
            isApi: true,
          });
          totalInserted++;
        }
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
