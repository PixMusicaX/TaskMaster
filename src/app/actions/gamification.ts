"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { XP_VALUES } from "@/lib/constants";
import { subDays, format } from "date-fns";

export async function getProfile() {
  const last28Days = subDays(new Date(), 28);
  const last28DaysStr = format(last28Days, "yyyy-MM-dd");

  // Calculate Habit XP
  const habits = await prisma.habit.findMany({
    include: {
      logs: {
        where: {
          completed: true,
          date: { gte: last28DaysStr }
        }
      }
    }
  });

  // Calculate Event XP
  const events = await prisma.event.findMany({
    where: {
      OR: [
        { startTime: { gte: last28Days } },
        { date: { gte: last28DaysStr } }
      ]
    }
  });

  // Calculate Note XP
  const notes = await prisma.note.findMany({
    where: {
      date: { gte: last28DaysStr }
    }
  });

  // Dynamic Stat XP
  const stats: any = {
    strength: 0,
    intelligence: 0,
    wealth: 0,
    vitality: 0,
    charisma: 0
  };

  let totalXP = 0;

  // Add Habit XP -> Vitality
  habits.forEach(h => {
    const xp = h.logs.length * XP_VALUES.HABIT_CHECK;
    totalXP += xp;
    stats.vitality += xp;
  });

  // Add Event/Task XP
  events.forEach(e => {
    let xp = 0;
    if (e.type === "task" && e.completed) {
      xp = XP_VALUES.TASK_COMPLETE;
      totalXP += xp;
      stats.strength += xp;
    } else if (e.type === "event") {
      const eventTime = e.startTime ? new Date(e.startTime) : null;
      if (eventTime && eventTime < new Date()) {
        xp = XP_VALUES.EVENT_PASSED;
        totalXP += xp;
        stats.wealth += xp;
      }
    }
  });

  // Add Note XP -> Intelligence
  notes.forEach(n => {
    try {
      const parsed = JSON.parse(n.content);
      if (Array.isArray(parsed)) {
        const xp = parsed.length * XP_VALUES.NOTE_ENTRY;
        totalXP += xp;
        stats.intelligence += xp;
      }
    } catch (e) {
      totalXP += XP_VALUES.NOTE_ENTRY;
      stats.intelligence += XP_VALUES.NOTE_ENTRY;
    }
  });

  // Calculate Level based on 4-week window
  // Level 1: 0-100, Level 2: 100-300, Level 3: 300-600...
  // Or just use the level * 100 curve for each level step
  let currentLevel = 1;
  let remainingXP = totalXP;
  while (remainingXP >= currentLevel * 100) {
    remainingXP -= currentLevel * 100;
    currentLevel++;
  }

  return {
    xp: totalXP,
    level: currentLevel,
    ...stats
  };
}

// addXP is no longer needed as XP is dynamic based on logs
export async function addXP(amount: number, stat?: string) {
  // Placeholder to avoid breaking imports, though it should be removed from callers
  return { xp: 0, level: 1 };
}
