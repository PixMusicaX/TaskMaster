"use server";

import { db } from "@/db";
import { habit, habitLog, event, note, smartMission, reliefRecommendation } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { XP_VALUES, RPG_TITLES } from "@/lib/constants";
import { startOfMonth, endOfMonth, format, subMonths, isSameMonth } from "date-fns";
import { and, or, gte, lte, eq } from "drizzle-orm";

export async function getStatsForPeriod(startDate: Date, endDate: Date) {
  try {
    const startStr = format(startDate, "yyyy-MM-dd");
    const endStr = format(endDate, "yyyy-MM-dd");

    const [habits, events, notes, smartMissions, reliefRecommendations] = await Promise.all([
      db.query.habit.findMany({
        with: {
          logs: {
            where: and(
              eq(habitLog.completed, true),
              gte(habitLog.date, startStr),
              lte(habitLog.date, endStr)
            )
          }
        }
      }),
      db.select().from(event).where(
        or(
          and(gte(event.startTime, startDate), lte(event.startTime, endDate)),
          and(gte(event.date, startStr), lte(event.date, endStr))
        )
      ),
      db.select().from(note).where(
        and(gte(note.date, startStr), lte(note.date, endStr))
      ),
      db.select().from(smartMission).where(
        and(
          gte(smartMission.date, startStr),
          lte(smartMission.date, endStr),
          eq(smartMission.completed, true)
        )
      ),
      db.select().from(reliefRecommendation).where(
        and(gte(reliefRecommendation.date, startStr), lte(reliefRecommendation.date, endStr))
      )
    ]);

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
    habits.forEach((h: any) => {
      const xp = h.logs.length * XP_VALUES.HABIT_CHECK;
      totalXP += xp;
      stats.vitality += xp;
    });

    // Add Event/Task XP
    events.forEach((e: any) => {
      let xp = 0;
      const tier = e.tier?.toLowerCase() || "side";
      const reward = tier === "epic" ? XP_VALUES.QUEST_EPIC : 
                     tier === "main" ? XP_VALUES.QUEST_MAIN : 
                     XP_VALUES.QUEST_SIDE;

      if (e.type === "task" && e.completed) {
        xp = XP_VALUES.TASK;
        totalXP += xp;
        stats.strength += xp;
      } else if (e.type === "event") {
        const eventTime = e.startTime ? new Date(e.startTime) : null;
        if (eventTime && eventTime < new Date()) {
          xp = reward;
          totalXP += xp;
          stats.wealth += xp;
        }
      }
    });

    // Add Note XP -> Intelligence
    notes.forEach((n: any) => {
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
    smartMissions.forEach((sm: any) => {
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
    reliefRecommendations.forEach((rr: any) => {
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

    const title = [...RPG_TITLES].reverse().find((t: any) => currentLevel >= t.minLevel)?.title || "Novice";

    return {
      xp: totalXP,
      level: currentLevel,
      title,
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
      title: "Novice",
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
  const now = new Date();
  
  const promises = Array.from({ length: monthsCount }).map((_, i) => {
    const date = subMonths(now, i);
    return getStatsForPeriod(startOfMonth(date), endOfMonth(date));
  });
  
  return await Promise.all(promises);
}

export async function addXP(amount: number, stat?: string) {
  return { xp: 0, level: 1 };
}

