"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { XP_VALUES } from "@/lib/constants";
import { startOfMonth, endOfMonth, format, subMonths, isSameMonth } from "date-fns";

export async function getStatsForPeriod(startDate: Date, endDate: Date) {
  try {
    const startStr = format(startDate, "yyyy-MM-dd");
    const endStr = format(endDate, "yyyy-MM-dd");

    const results = await Promise.all([
      prisma.habit.findMany({
        include: {
          logs: {
            where: {
              completed: true,
              date: { gte: startStr, lte: endStr }
            }
          }
        }
      }),
      prisma.event.findMany({
        where: {
          AND: [{
            OR: [
              { startTime: { gte: startDate, lte: endDate } },
              { date: { gte: startStr, lte: endStr } }
            ]
          }]
        }
      }),
      prisma.note.findMany({
        where: { date: { gte: startStr, lte: endStr } }
      }),
      (prisma as any).smartMission 
        ? (prisma as any).smartMission.findMany({
            where: { date: { gte: startStr, lte: endStr }, completed: true }
          })
        : Promise.resolve([]),
      (prisma as any).reliefRecommendation
        ? (prisma as any).reliefRecommendation.findMany({
            where: { date: { gte: startStr, lte: endStr } }
          })
        : Promise.resolve([])
    ]);

    const [habits, events, notes, smartMissions, reliefRecommendations] = results as any[];

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
    const tier = (e as any).tier?.toLowerCase() || "side";
    const reward = tier === "epic" ? XP_VALUES.QUEST_EPIC : 
                   tier === "main" ? XP_VALUES.QUEST_MAIN : 
                   XP_VALUES.QUEST_SIDE;

    if (e.type === "task" && e.completed) {
      xp = reward;
      totalXP += xp;
      stats.strength += xp;
    } else if (e.type === "event") {
      const eventTime = e.startTime ? new Date(e.startTime) : null;
      // If it's a past event or a completed event in this period
      if (eventTime && eventTime < new Date()) {
        xp = reward;
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

  // Add Smart Mission XP
  smartMissions.forEach(sm => {
    let reward = sm.xpReward;
    if (reward === 25) reward = 50; // Legacy doubling
    
    totalXP += reward;
    if (sm.stat === "charisma") stats.charisma += reward;
    else if (sm.stat === "strength") stats.strength += reward;
    else if (sm.stat === "intelligence") stats.intelligence += reward;
    else if (sm.stat === "wealth") stats.wealth += reward;
    else if (sm.stat === "vitality") stats.vitality += reward;
  });

  // Add Relief Recommendation XP (3 separate tasks)
  reliefRecommendations.forEach(rr => {
    const awardXP = (isCompleted: boolean) => {
      if (isCompleted) {
        let reward = rr.xpReward;
        if (reward === 5) reward = 10; // Legacy doubling
        
        totalXP += reward;
        if (rr.stat === "charisma") stats.charisma += reward;
        else if (rr.stat === "strength") stats.strength += reward;
        else if (rr.stat === "intelligence") stats.intelligence += reward;
        else if (rr.stat === "wealth") stats.wealth += reward;
        else if (rr.stat === "vitality") stats.vitality += reward;
      }
    };

    awardXP(rr.completed);
    awardXP(rr.alt1Completed);
    awardXP(rr.alt2Completed);
  });

  // Calculate Level (Flat 70 XP per level for frequent progression)
  let currentLevel = 1;
  let remainingXP = totalXP;
  while (remainingXP >= 70) {
    remainingXP -= 70;
    currentLevel++;
  }

  // Identify Top and Weakest stats
  const statEntries = Object.entries(stats).map(([name, val]) => ({ name, val: val as number }));
  const sortedStats = [...statEntries].sort((a, b) => b.val - a.val);
  const topStat = sortedStats[0].name;
  const weakStat = sortedStats[sortedStats.length - 1].name;

    return {
      xp: totalXP,
      level: currentLevel,
      levelProgress: remainingXP,
      nextLevelXP: 70,
      topStat,
      weakStat,
      ...stats,
      stats,
      monthName: format(startDate, "MMMM"),
      year: startDate.getFullYear()
    };
  } catch (error) {
    console.error("Database error in getStatsForPeriod:", error);
    return {
      xp: 0,
      level: 1,
      levelProgress: 0,
      nextLevelXP: 70,
      topStat: "none",
      weakStat: "none",
      stats: { strength: 0, intelligence: 0, wealth: 0, vitality: 0, charisma: 0 },
      strength: 0, intelligence: 0, wealth: 0, vitality: 0, charisma: 0,
      monthName: format(startDate, "MMMM"),
      year: startDate.getFullYear()
    };
  }
}

export async function getProfile() {
  const now = new Date();
  return getStatsForPeriod(startOfMonth(now), endOfMonth(now));
}

export async function getSeasonHistory(monthsCount: number = 6) {
  const history = [];
  const now = new Date();
  
  for (let i = 0; i < monthsCount; i++) {
    const date = subMonths(now, i);
    const stats = await getStatsForPeriod(startOfMonth(date), endOfMonth(date));
    history.push(stats);
  }
  
  return history;
}

export async function addXP(amount: number, stat?: string) {
  return { xp: 0, level: 1 };
}
