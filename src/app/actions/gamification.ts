"use server";

import { db, client } from "@/db";
import { habitLog, event, note, smartMission, reliefRecommendation, seasonSnapshot, preparationTip } from "@/db/schema";
import type { StatName, Stats } from "@/lib/types";
import { XP_VALUES, RPG_TITLES, LEVEL_UP_XP } from "@/lib/constants";
import { startOfMonth, endOfMonth, format, subMonths } from "date-fns";
import { and, or, gte, lte, eq, inArray } from "drizzle-orm";

export async function getStatsForPeriod(startDate: Date, endDate: Date, referenceDate: Date = new Date()) {
  try {
    const startStr = format(startDate, "yyyy-MM-dd");
    const endStr = format(endDate, "yyyy-MM-dd");

    const [habitLogs, events, notes, smartMissions, reliefRecommendations, preparationTips] = await Promise.all([
      db.select().from(habitLog).where(
        and(
          eq(habitLog.completed, true),
          gte(habitLog.date, startStr),
          lte(habitLog.date, endStr)
        )
      ),
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
      ),
      db.select().from(preparationTip).where(
        and(
          gte(preparationTip.date, startStr),
          lte(preparationTip.date, endStr),
          eq(preparationTip.completed, true)
        )
      )
    ]);

    // Dynamic Stat XP
    const stats: Stats = {
      strength: 0,
      intelligence: 0,
      wealth: 0,
      vitality: 0,
      charisma: 0
    };

    let totalXP = 0;

    // Rewards always count toward total XP; they feed a stat only when it's a known one
    const award = (stat: string, reward: number) => {
      totalXP += reward;
      if (stat in stats) stats[stat as StatName] += reward;
    };

    // Add Habit XP -> Vitality
    const habitXP = habitLogs.length * XP_VALUES.HABIT_CHECK;
    totalXP += habitXP;
    stats.vitality += habitXP;

    // Add Event/Task XP
    events.forEach((e) => {
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
        if (eventTime && eventTime < referenceDate) {
          xp = reward;
          totalXP += xp;
          stats.wealth += xp;
        }
      }
    });

    // Add Note XP -> Intelligence
    notes.forEach((n) => {
      try {
        const parsed = JSON.parse(n.content);
        if (Array.isArray(parsed)) {
          const xp = parsed.filter((line: { text?: string }) => line?.text?.trim()).length * XP_VALUES.NOTE_ENTRY;
          totalXP += xp;
          stats.intelligence += xp;
        }
      } catch {
        if (n.content.trim()) {
          totalXP += XP_VALUES.NOTE_ENTRY;
          stats.intelligence += XP_VALUES.NOTE_ENTRY;
        }
      }
    });

    // Add Smart Mission XP
    smartMissions.forEach((sm) => award(sm.stat, sm.xpReward));

    // Add Preparation Tip XP
    preparationTips.forEach((pt) => award(pt.stat, pt.xpReward));

    // Add Relief Recommendation XP (3 separate tasks)
    reliefRecommendations.forEach((rr) => {
      [rr.completed, rr.alt1Completed, rr.alt2Completed].forEach(done => {
        if (done) award(rr.stat, rr.xpReward);
      });
    });

    // Calculate Level (Flat XP per level for frequent progression)
    let currentLevel = 1;
    let remainingXP = totalXP;
    while (remainingXP >= LEVEL_UP_XP) {
      remainingXP -= LEVEL_UP_XP;
      currentLevel++;
    }

    // Identify Top and Weakest stats
    const statEntries = Object.entries(stats).map(([name, val]) => ({ name, val }));
    const sortedStats = [...statEntries].sort((a, b) => b.val - a.val);
    const topStat = sortedStats[0].name;
    const weakStat = sortedStats[sortedStats.length - 1].name;

    const title = [...RPG_TITLES].reverse().find((t) => currentLevel >= t.minLevel)?.title || "Novice";

    return {
      xp: totalXP,
      level: currentLevel,
      title,
      levelProgress: remainingXP,
      nextLevelXP: LEVEL_UP_XP,
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
      nextLevelXP: LEVEL_UP_XP,
      topStat: "none",
      weakStat: "none",
      stats: { strength: 0, intelligence: 0, wealth: 0, vitality: 0, charisma: 0 },
      strength: 0, intelligence: 0, wealth: 0, vitality: 0, charisma: 0,
      monthName: format(startDate, "MMMM"),
      year: startDate.getFullYear()
    };
  }
}

export async function getProfile(clientDateStr?: string) {
  const now = clientDateStr ? new Date(clientDateStr) : new Date();
  return getStatsForPeriod(startOfMonth(now), endOfMonth(now), now);
}

let seasonSnapshotTableInitialized = false;
async function ensureSeasonSnapshotTable() {
  if (seasonSnapshotTableInitialized) return;

  await client`
    CREATE TABLE IF NOT EXISTS "SeasonSnapshot" (
      "id" text PRIMARY KEY,
      "period" text NOT NULL,
      "monthName" text NOT NULL,
      "year" integer NOT NULL,
      "xp" integer DEFAULT 0 NOT NULL,
      "level" integer DEFAULT 1 NOT NULL,
      "title" text NOT NULL,
      "topStat" text NOT NULL,
      "weakStat" text NOT NULL,
      "strength" integer DEFAULT 0 NOT NULL,
      "intelligence" integer DEFAULT 0 NOT NULL,
      "wealth" integer DEFAULT 0 NOT NULL,
      "vitality" integer DEFAULT 0 NOT NULL,
      "charisma" integer DEFAULT 0 NOT NULL,
      "createdAt" timestamp DEFAULT now() NOT NULL
    );
  `;

  await client`
    CREATE UNIQUE INDEX IF NOT EXISTS "SeasonSnapshot_period_key" ON "SeasonSnapshot" ("period");
  `;

  seasonSnapshotTableInitialized = true;
}

async function getSnapshotForPeriod(startDate: Date, endDate: Date) {
  const period = format(startDate, "yyyy-MM");
  await ensureSeasonSnapshotTable();

  const existingRows = await db.select().from(seasonSnapshot).where(eq(seasonSnapshot.period, period)).limit(1);
  const existing = existingRows[0];
  if (existing) {
    return {
      xp: existing.xp,
      level: existing.level,
      title: existing.title,
      topStat: existing.topStat,
      weakStat: existing.weakStat,
      strength: existing.strength,
      intelligence: existing.intelligence,
      wealth: existing.wealth,
      vitality: existing.vitality,
      charisma: existing.charisma,
      monthName: existing.monthName,
      year: existing.year,
      stats: {
        strength: existing.strength,
        intelligence: existing.intelligence,
        wealth: existing.wealth,
        vitality: existing.vitality,
        charisma: existing.charisma,
      },
    };
  }

  const stats = await getStatsForPeriod(startDate, endDate);
  await db.insert(seasonSnapshot).values({
    period,
    monthName: stats.monthName,
    year: stats.year,
    xp: stats.xp,
    level: stats.level,
    title: stats.title,
    topStat: stats.topStat,
    weakStat: stats.weakStat,
    strength: stats.strength,
    intelligence: stats.intelligence,
    wealth: stats.wealth,
    vitality: stats.vitality,
    charisma: stats.charisma,
  }).onConflictDoNothing();
  return stats;
}

export async function getSeasonHistory(monthsCount: number = 6, clientDateStr?: string) {
  const now = clientDateStr ? new Date(clientDateStr) : new Date();
  const currentMonthStart = startOfMonth(now);
  const periods = Array.from({ length: monthsCount }).map((_, i) => subMonths(now, i));

  // Past months are frozen in SeasonSnapshot; only the current month is computed live
  const promises = periods.map(async (date) => {
    const start = startOfMonth(date);
    return start < currentMonthStart
      ? getSnapshotForPeriod(start, endOfMonth(date))
      : getStatsForPeriod(start, endOfMonth(date), now);
  });

  return await Promise.all(promises);
}

// Drop cached snapshots for the months containing these dates (YYYY-MM-DD) so they are recomputed
export async function invalidateSeasonSnapshots(...dates: (string | null | undefined)[]) {
  const periods = Array.from(new Set(dates.filter((d): d is string => !!d).map(d => d.slice(0, 7))));
  if (periods.length === 0) return;
  try {
    await ensureSeasonSnapshotTable();
    await db.delete(seasonSnapshot).where(inArray(seasonSnapshot.period, periods));
  } catch (e) {
    console.error("Failed to invalidate season snapshot:", e);
  }
}
