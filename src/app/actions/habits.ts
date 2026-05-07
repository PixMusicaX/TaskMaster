"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getHabits() {
  return await prisma.habit.findMany({
    where: { archived: false },
    include: {
      logs: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function getArchivedHabits() {
  return await prisma.habit.findMany({
    where: { archived: true },
    include: {
      logs: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

import { addXP } from "./gamification";
import { XP_VALUES } from "@/lib/constants";

export async function addHabit(name: string, icon?: string, color?: string, frequency?: number[], stat?: string) {
  const habit = await prisma.habit.create({
    data: { name, icon, color, frequency, stat },
  });
  revalidatePath("/habits");
  return habit;
}

export async function updateHabit(id: string, data: { name?: string; icon?: string; color?: string; frequency?: number[]; stat?: string }) {
  const habit = await prisma.habit.update({
    where: { id },
    data,
  });
  revalidatePath("/habits");
  return habit;
}

export async function archiveHabit(id: string) {
  await prisma.habit.update({
    where: { id },
    data: { archived: true },
  });
  revalidatePath("/habits");
}

export async function restoreHabit(id: string) {
  await prisma.habit.update({
    where: { id },
    data: { archived: false },
  });
  revalidatePath("/habits");
}

export async function deleteHabitPermanently(id: string) {
  await prisma.habit.delete({ where: { id } });
  revalidatePath("/habits");
}

export async function toggleHabitLog(habitId: string, date: string, completed: boolean) {
  const log = await prisma.habitLog.upsert({
    where: {
      habitId_date: {
        habitId,
        date,
      },
    },
    update: {
      completed,
    },
    create: {
      habitId,
      date,
      completed,
    },
  });

  if (completed) {
    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    await addXP(XP_VALUES.HABIT_CHECK, habit?.stat || undefined);
  }

  revalidatePath("/habits");
  revalidatePath("/");
  return log;
}
