"use server";

import { db } from "@/db";
import { event } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, and, or, gte, lte, asc } from "drizzle-orm";
import { addXP } from "./gamification";
import { XP_VALUES } from "@/lib/constants";

export async function getEventsByDateRange(start: Date, end: Date) {
  return await db.select().from(event).where(
    and(
      gte(event.startTime, start),
      lte(event.startTime, end)
    )
  ).orderBy(asc(event.startTime));
}

export async function getDashboardTasks(targetDateStr: string) {
  const [year, month, day] = targetDateStr.split('-').map(Number);
  const startOfToday = new Date(year, month - 1, day, 0, 0, 0, 0);
  const endOfToday = new Date(year, month - 1, day, 23, 59, 59, 999);
  
  return await db.select().from(event).where(
    or(
      and(
        gte(event.startTime, startOfToday),
        lte(event.startTime, endOfToday)
      ),
      and(
        eq(event.type, "task"),
        eq(event.completed, false),
        lte(event.startTime, startOfToday)
      )
    )
  ).orderBy(asc(event.startTime));
}

export async function addEvent(data: {
  title: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  date: string;
  type: string;
  notification?: boolean;
}) {
  const [newEvent] = await db.insert(event).values(data).returning();
  revalidatePath("/calendar");
  revalidatePath("/");
  return newEvent;
}

export async function toggleEventCompletion(id: string, completed: boolean) {
  const [updatedEvent] = await db.update(event)
    .set({ completed })
    .where(eq(event.id, id))
    .returning();

  if (completed) {
    let xp = XP_VALUES.QUEST_SIDE;
    if (updatedEvent.tier === "main") xp = XP_VALUES.QUEST_MAIN;
    if (updatedEvent.tier === "epic") xp = XP_VALUES.QUEST_EPIC;
    
    await addXP(xp, updatedEvent.stat || undefined);
  }

  revalidatePath("/calendar");
  revalidatePath("/");
  return updatedEvent;
}

export async function deleteEvent(id: string) {
  await db.delete(event).where(eq(event.id, id));
  revalidatePath("/calendar");
}

export async function updateEvent(id: string, data: any) {
  const [updatedEvent] = await db.update(event)
    .set(data)
    .where(eq(event.id, id))
    .returning();
    
  revalidatePath("/calendar");
  revalidatePath("/");
  return updatedEvent;
}

