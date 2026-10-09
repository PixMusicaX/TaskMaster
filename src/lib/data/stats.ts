// XP, levels and seasons for one user. Server only: the actions in app/actions/gamification.ts
// resolve who is asking and call in here, as do the other actions that need a profile.
import { db } from "@/db";
import { habitLog, event, note, smartMission, reliefRecommendation, seasonSnapshot, preparationTip } from "@/db/schema";
import type { StatName, Stats } from "@/lib/types";
import { XP_VALUES, RPG_TITLES, LEVEL_UP_XP } from "@/lib/constants";
import { startOfMonth, endOfMonth, endOfDay, format, subMonths, addDays, min, getDaysInMonth, differenceInCalendarMonths, parseISO } from "date-fns";
import { and, or, gte, lte, eq, inArray, min as minOf } from "drizzle-orm";
import { liveEraIndex, seasonEras } from "@/lib/eras";

export async function statsForPeriod(userId: string, startDate: Date, endDate: Date, referenceDate: Date = new Date()) {
  try {
    const startStr = format(startDate, "yyyy-MM-dd");
    const endStr = format(endDate, "yyyy-MM-dd");

    const [habitLogs, events, notes, smartMissions, reliefRecommendations, preparationTips] = await Promise.all([
      db.select().from(habitLog).where(
        and(
          eq(habitLog.userId, userId),
          eq(habitLog.completed, true),
          gte(habitLog.date, startStr),
          lte(habitLog.date, endStr)
        )
      ),
      db.select().from(event).where(
        and(
          eq(event.userId, userId),
          or(
            and(gte(event.startTime, startDate), lte(event.startTime, endDate)),
            and(gte(event.date, startStr), lte(event.date, endStr))
          )
        )
      ),
      db.select().from(note).where(
        and(eq(note.userId, userId), gte(note.date, startStr), lte(note.date, endStr))
      ),
      db.select().from(smartMission).where(
        and(
          eq(smartMission.userId, userId),
          gte(smartMission.date, startStr),
          lte(smartMission.date, endStr),
          eq(smartMission.completed, true)
        )
      ),
      db.select().from(reliefRecommendation).where(
        and(eq(reliefRecommendation.userId, userId), gte(reliefRecommendation.date, startStr), lte(reliefRecommendation.date, endStr))
      ),
      db.select().from(preparationTip).where(
        and(
          eq(preparationTip.userId, userId),
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
    console.error("Database error in statsForPeriod:", error);
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

export async function profileFor(userId: string, clientDateStr?: string) {
  const now = clientDateStr ? new Date(clientDateStr) : new Date();
  return statsForPeriod(userId, startOfMonth(now), endOfMonth(now), now);
}

async function snapshotForPeriod(userId: string, startDate: Date, endDate: Date) {
  const period = format(startDate, "yyyy-MM");

  const existingRows = await db.select().from(seasonSnapshot)
    .where(and(eq(seasonSnapshot.userId, userId), eq(seasonSnapshot.period, period))).limit(1);
  if (existingRows[0]) return snapshotToSeason(existingRows[0]);
  return computeSnapshot(userId, startDate, endDate);
}

function snapshotToSeason(existing: typeof seasonSnapshot.$inferSelect) {
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

async function computeSnapshot(userId: string, startDate: Date, endDate: Date) {
  const period = format(startDate, "yyyy-MM");
  const stats = await statsForPeriod(userId, startDate, endDate);
  await db.insert(seasonSnapshot).values({
    userId,
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

export async function seasonHistoryFor(userId: string, monthsCount: number = 6, clientDateStr?: string) {
  const now = clientDateStr ? new Date(clientDateStr) : new Date();
  const currentMonthStart = startOfMonth(now);
  const periods = Array.from({ length: monthsCount }).map((_, i) => subMonths(now, i));

  // Past months are frozen in SeasonSnapshot (read in one query); only the current month and
  // months never snapshotted are computed
  const pastPeriods = periods.filter(d => startOfMonth(d) < currentMonthStart).map(d => format(d, "yyyy-MM"));
  const saved = pastPeriods.length
    ? await db.select().from(seasonSnapshot).where(and(eq(seasonSnapshot.userId, userId), inArray(seasonSnapshot.period, pastPeriods)))
    : [];
  const byPeriod = new Map(saved.map(row => [row.period, row]));

  const promises = periods.map(async (date) => {
    const start = startOfMonth(date);
    if (start >= currentMonthStart) return statsForPeriod(userId, start, endOfMonth(date), now);
    const row = byPeriod.get(format(start, "yyyy-MM"));
    return row ? snapshotToSeason(row) : computeSnapshot(userId, start, endOfMonth(date));
  });

  return await Promise.all(promises);
}

// Last month's XP as of the same day-of-month (its "pace"), plus its final total, so the
// dashboard can race the current season against it
export async function seasonPaceFor(userId: string, clientDateStr?: string) {
  const now = clientDateStr ? new Date(clientDateStr) : new Date();
  const dayOfMonth = clientDateStr ? Number(clientDateStr.slice(8, 10)) : now.getDate();
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(lastMonthStart);
  // Day 31 against a 30-day month compares with that month's last day
  const paceEnd = endOfDay(min([addDays(lastMonthStart, dayOfMonth - 1), lastMonthEnd]));

  const [pace, final] = await Promise.all([
    statsForPeriod(userId, lastMonthStart, paceEnd, paceEnd),
    snapshotForPeriod(userId, lastMonthStart, lastMonthEnd),
  ]);

  return {
    dayOfMonth,
    daysInMonth: getDaysInMonth(now),
    lastMonthName: format(lastMonthStart, "MMMM"),
    lastMonthPaceXP: pace.xp,
    lastMonthTotalXP: final.xp,
  };
}

// This season's XP as it stood when today began, so the dashboard can tell how much was earned today
export async function seasonXPBeforeTodayFor(userId: string, clientDateStr?: string) {
  const now = clientDateStr ? new Date(clientDateStr) : new Date();
  const dayOfMonth = clientDateStr ? Number(clientDateStr.slice(8, 10)) : now.getDate();
  if (dayOfMonth <= 1) return 0;
  const monthStart = startOfMonth(now);
  const yesterdayEnd = endOfDay(addDays(monthStart, dayOfMonth - 2));
  return (await statsForPeriod(userId, monthStart, yesterdayEnd, yesterdayEnd)).xp;
}

// Every season since the first recorded activity, newest first, with the era each started and
// ended in (see lib/eras.ts). The current season has no end yet.
export async function seasonTimelineFor(userId: string, clientDateStr?: string, minMonths: number = 1) {
  const now = clientDateStr ? new Date(clientDateStr) : new Date();
  const [[notes], [logs], [events]] = await Promise.all([
    db.select({ first: minOf(note.date) }).from(note).where(eq(note.userId, userId)),
    db.select({ first: minOf(habitLog.date) }).from(habitLog).where(and(eq(habitLog.userId, userId), eq(habitLog.completed, true))),
    db.select({ first: minOf(event.date) }).from(event).where(and(eq(event.userId, userId), eq(event.isApi, false))),
  ]);
  const firsts = [notes?.first, logs?.first, events?.first].filter((d): d is string => !!d).sort();
  const sinceFirst = firsts.length ? differenceInCalendarMonths(now, parseISO(firsts[0])) + 1 : 1;
  const months = Math.min(120, Math.max(minMonths, sinceFirst));

  const history = await seasonHistoryFor(userId, months, clientDateStr);
  const finished = history.slice(1).reverse();
  const eras = seasonEras(finished.map(s => s.xp));
  const finishedWithEras = finished.map((season, i) => ({
    ...season,
    eraStart: eras.seasons[i].start,
    eraEnd: eras.seasons[i].end as number | null,
  })).reverse();

  return {
    // Where the current season started
    currentStart: eras.nextStart,
    seasons: [{ ...history[0], eraStart: eras.nextStart, eraEnd: null as number | null }, ...finishedWithEras],
  };
}

// What the dashboard needs to place you in an era live: this season's starting era and last
// month's pace for today (XP comes from the profile as it changes)
export async function eraProgressFor(userId: string, clientDateStr?: string) {
  const [timeline, pace] = await Promise.all([seasonTimelineFor(userId, clientDateStr), seasonPaceFor(userId, clientDateStr)]);
  const current = timeline.seasons[0];
  return {
    startIndex: timeline.currentStart,
    lastMonthName: pace.lastMonthName,
    lastMonthPaceXP: pace.lastMonthPaceXP,
    // Where you stand with this XP (the client recomputes it as XP changes)
    index: liveEraIndex(timeline.currentStart, current.xp, pace.lastMonthPaceXP),
  };
}

// Drop cached snapshots for the months containing these dates (YYYY-MM-DD) so they are recomputed
export async function invalidateSnapshots(userId: string, ...dates: (string | null | undefined)[]) {
  const periods = Array.from(new Set(dates.filter((d): d is string => !!d).map(d => d.slice(0, 7))));
  if (periods.length === 0) return;
  try {
    await db.delete(seasonSnapshot).where(and(eq(seasonSnapshot.userId, userId), inArray(seasonSnapshot.period, periods)));
  } catch (e) {
    console.error("Failed to invalidate season snapshot:", e);
  }
}
