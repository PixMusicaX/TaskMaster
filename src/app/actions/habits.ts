"use server";

import { db } from "@/db";
import { habit, habitLog } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, and, asc } from "drizzle-orm";
import { requireUserId } from "@/lib/current-user";
import { invalidateSnapshots } from "@/lib/data/stats";
import { habitsFor } from "@/lib/data/habits";

// Pass `logsSince` (YYYY-MM-DD) to load only recent logs instead of each habit's full history
export async function getHabits(logsSince?: string) {
  return habitsFor(await requireUserId(), logsSince);
}

export async function getArchivedHabits() {
  const userId = await requireUserId();
  return await db.query.habit.findMany({
    where: and(eq(habit.userId, userId), eq(habit.archived, true)),
    with: {
      logs: true,
    },
    orderBy: [asc(habit.createdAt)],
  });
}

export async function addHabit(name: string, icon?: string, color?: string, frequency?: number[], stat?: string) {
  const userId = await requireUserId();
  const [newHabit] = await db.insert(habit).values({
    userId,
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
  const userId = await requireUserId();
  // Only these fields can be edited, whatever the caller sends
  const { name, icon, color, frequency, stat } = data;
  const [updatedHabit] = await db.update(habit)
    .set({ name, icon, color, frequency, stat })
    .where(and(eq(habit.id, id), eq(habit.userId, userId)))
    .returning();

  revalidatePath("/habits");
  return updatedHabit;
}

export async function archiveHabit(id: string) {
  const userId = await requireUserId();
  await db.update(habit)
    .set({ archived: true })
    .where(and(eq(habit.id, id), eq(habit.userId, userId)));

  revalidatePath("/habits");
}

export async function restoreHabit(id: string) {
  const userId = await requireUserId();
  await db.update(habit)
    .set({ archived: false })
    .where(and(eq(habit.id, id), eq(habit.userId, userId)));

  revalidatePath("/habits");
}

export async function deleteHabitPermanently(id: string) {
  const userId = await requireUserId();
  await db.delete(habit).where(and(eq(habit.id, id), eq(habit.userId, userId)));
  revalidatePath("/habits");
}

export async function toggleHabitLog(habitId: string, date: string, completed: boolean) {
  const userId = await requireUserId();
  // Fetch habit info to preserve metadata (and make sure the habit is this user's)
  const h = await db.query.habit.findFirst({
    where: and(eq(habit.id, habitId), eq(habit.userId, userId)),
  });
  if (!h) return null;

  if (!completed) {
    await db.delete(habitLog)
      .where(and(eq(habitLog.userId, userId), eq(habitLog.habitId, habitId), eq(habitLog.date, date)));
    await invalidateSnapshots(userId, date);
    revalidatePath("/habits");
    revalidatePath("/home");
    return null;
  }

  const [log] = await db.insert(habitLog)
    .values({
      userId,
      habitId,
      habitName: h.name,
      habitIcon: h.icon,
      date,
      completed,
    })
    .onConflictDoUpdate({
      target: [habitLog.habitId, habitLog.date],
      set: {
        completed,
        habitName: h.name,
        habitIcon: h.icon,
      },
    })
    .returning();

  await invalidateSnapshots(userId, date);

  revalidatePath("/habits");
  revalidatePath("/home");
  return log;
}

export async function getHabitLogs() {
  const userId = await requireUserId();
  return await db.query.habitLog.findMany({
    where: eq(habitLog.userId, userId),
    orderBy: [asc(habitLog.date)],
  });
}
