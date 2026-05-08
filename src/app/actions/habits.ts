"use server";

import { db } from "@/db";
import { habit, habitLog } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, and, asc } from "drizzle-orm";
import { addXP } from "./gamification";
import { XP_VALUES } from "@/lib/constants";

export async function getHabits() {
  return await db.query.habit.findMany({
    where: eq(habit.archived, false),
    with: {
      logs: true,
    },
    orderBy: [asc(habit.createdAt)],
  });
}

export async function getArchivedHabits() {
  return await db.query.habit.findMany({
    where: eq(habit.archived, true),
    with: {
      logs: true,
    },
    orderBy: [asc(habit.createdAt)],
  });
}

export async function addHabit(name: string, icon?: string, color?: string, frequency?: number[], stat?: string) {
  const [newHabit] = await db.insert(habit).values({
    name,
    icon,
    color,
    frequency,
    stat,
  }).returning();
  
  revalidatePath("/habits");
  return newHabit;
}

export async function updateHabit(id: string, data: { name?: string; icon?: string; color?: string; frequency?: number[]; stat?: string }) {
  const [updatedHabit] = await db.update(habit)
    .set(data)
    .where(eq(habit.id, id))
    .returning();
    
  revalidatePath("/habits");
  return updatedHabit;
}

export async function archiveHabit(id: string) {
  await db.update(habit)
    .set({ archived: true })
    .where(eq(habit.id, id));
    
  revalidatePath("/habits");
}

export async function restoreHabit(id: string) {
  await db.update(habit)
    .set({ archived: false })
    .where(eq(habit.id, id));
    
  revalidatePath("/habits");
}

export async function deleteHabitPermanently(id: string) {
  await db.delete(habit).where(eq(habit.id, id));
  revalidatePath("/habits");
}

export async function toggleHabitLog(habitId: string, date: string, completed: boolean) {
  const [log] = await db.insert(habitLog)
    .values({
      habitId,
      date,
      completed,
    })
    .onConflictDoUpdate({
      target: [habitLog.habitId, habitLog.date],
      set: { completed },
    })
    .returning();

  if (completed) {
    const h = await db.query.habit.findFirst({
      where: eq(habit.id, habitId),
    });
    await addXP(XP_VALUES.HABIT_CHECK, h?.stat || undefined);
  }

  revalidatePath("/habits");
  revalidatePath("/");
  return log;
}

