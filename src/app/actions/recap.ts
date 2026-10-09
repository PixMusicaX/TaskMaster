"use server";

import { db } from "@/db";
import { event, habit, habitLog, note, preparationTip, reliefRecommendation, smartMission } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { eachDayOfInterval, endOfMonth, format, getDaysInMonth, startOfMonth, subMonths } from "date-fns";
import { requireUserId } from "@/lib/current-user";
import { seasonTimelineFor } from "@/lib/data/stats";
import { noteTextLines } from "@/lib/types";

// Everything the season-end recap shows about last month, compared with the seasons before it
export async function getSeasonRecap(clientDateStr: string) {
  const userId = await requireUserId();
  const now = new Date(`${clientDateStr}T12:00:00`);
  const monthStart = startOfMonth(subMonths(now, 1));
  const monthEnd = endOfMonth(monthStart);
  const from = format(monthStart, "yyyy-MM-dd");
  const to = format(monthEnd, "yyyy-MM-dd");

  const [timeline, notes, logs, events, habits, missions, tips, reliefs] = await Promise.all([
    // [this month, last month, the month before, ...] — at least 13 so last month is ranked against a year
    seasonTimelineFor(userId, clientDateStr, 13),
    db.select({ date: note.date, content: note.content, mood: note.mood }).from(note)
      .where(and(eq(note.userId, userId), gte(note.date, from), lte(note.date, to))),
    db.select({ habitId: habitLog.habitId, habitName: habitLog.habitName, habitIcon: habitLog.habitIcon, date: habitLog.date })
      .from(habitLog).where(and(eq(habitLog.userId, userId), gte(habitLog.date, from), lte(habitLog.date, to), eq(habitLog.completed, true))),
    db.select({ type: event.type, tier: event.tier, completed: event.completed, startTime: event.startTime, date: event.date, isApi: event.isApi })
      .from(event).where(and(eq(event.userId, userId), gte(event.date, from), lte(event.date, to))),
    db.select({ id: habit.id, frequency: habit.frequency, icon: habit.icon }).from(habit).where(eq(habit.userId, userId)),
    db.select({ date: smartMission.date }).from(smartMission)
      .where(and(eq(smartMission.userId, userId), gte(smartMission.date, from), lte(smartMission.date, to), eq(smartMission.completed, true))),
    db.select({ date: preparationTip.date }).from(preparationTip)
      .where(and(eq(preparationTip.userId, userId), gte(preparationTip.date, from), lte(preparationTip.date, to), eq(preparationTip.completed, true))),
    db.select({ date: reliefRecommendation.date, completed: reliefRecommendation.completed, alt1: reliefRecommendation.alt1Completed, alt2: reliefRecommendation.alt2Completed })
      .from(reliefRecommendation).where(and(eq(reliefRecommendation.userId, userId), gte(reliefRecommendation.date, from), lte(reliefRecommendation.date, to))),
  ]);

  const [, season, previous] = timeline.seasons;
  const pastSeasons = timeline.seasons.slice(1, 13).filter(s => s.xp > 0);
  const seasonRank = season.xp > 0 ? pastSeasons.filter(s => s.xp > season.xp).length + 1 : null;

  // Per-day activity, for active days and the busiest day
  const activity = new Map<string, number>();
  const bump = (date: string, n = 1) => { if (n > 0) activity.set(date, (activity.get(date) ?? 0) + n); };

  let noteLines = 0;
  let noteDays = 0;
  const moods = { good: 0, neutral: 0, bad: 0 };
  for (const n of notes) {
    if (n.mood === "good" || n.mood === "neutral" || n.mood === "bad") moods[n.mood]++;
    const lines = noteTextLines(n.content).length;
    if (lines > 0) noteDays++;
    noteLines += lines;
    bump(n.date, lines);
  }

  const tasksDone = events.filter(e => e.type === "task" && e.completed);
  const questsDone = events.filter(e => e.type === "event" && !e.isApi && e.startTime && e.startTime <= monthEnd);
  tasksDone.forEach(e => bump(e.date));
  questsDone.forEach(e => bump(e.date));
  logs.forEach(l => bump(l.date));
  missions.forEach(m => bump(m.date));
  tips.forEach(t => bump(t.date));
  const reliefDone = reliefs.reduce((sum, r) => sum + Number(r.completed) + Number(r.alt1) + Number(r.alt2), 0);
  reliefs.forEach(r => bump(r.date, Number(r.completed) + Number(r.alt1) + Number(r.alt2)));

  let busiestDay: { date: string; count: number } | null = null;
  for (const [date, count] of activity) {
    if (!busiestDay || count > busiestDay.count || (count === busiestDay.count && date < busiestDay.date)) {
      busiestDay = { date, count };
    }
  }

  return {
    period: format(monthStart, "yyyy-MM"),
    monthName: season.monthName,
    year: season.year,
    daysInMonth: getDaysInMonth(monthStart),
    xp: season.xp,
    level: season.level,
    title: season.title,
    topStat: season.topStat,
    weakStat: season.weakStat,
    stats: season.stats,
    // Era the season started and ended in, and where the new season starts (see lib/eras.ts)
    era: { start: season.eraStart, end: season.eraEnd ?? season.eraStart, next: timeline.currentStart },
    previous: previous ? { monthName: previous.monthName, xp: previous.xp, level: previous.level, title: previous.title } : null,
    // 1 = best of the seasons on record in the last year (only seasons with XP count)
    seasonRank,
    seasonsCompared: pastSeasons.length,
    activeDays: activity.size,
    busiestDay,
    notes: { days: noteDays, lines: noteLines },
    moods,
    habits: { checks: logs.length, top: topHabit(logs, habits, monthStart, monthEnd) },
    tasksDone: tasksDone.length,
    quests: { done: questsDone.length, epic: questsDone.filter(q => q.tier === "epic").length },
    missionsDone: missions.length + tips.length + reliefDone,
    nextSeason: { daysInMonth: getDaysInMonth(now), monthName: format(now, "MMMM") },
  };
}

// The most-checked habit, with how consistent it was on its scheduled days and its best run
function topHabit(
  logs: { habitId: string | null; habitName: string | null; habitIcon: string | null; date: string }[],
  habits: { id: string; frequency: number[] | null; icon: string | null }[],
  monthStart: Date,
  monthEnd: Date
) {
  const byHabit = new Map<string, typeof logs>();
  for (const l of logs) {
    const key = l.habitId ?? `name:${l.habitName}`;
    byHabit.set(key, [...(byHabit.get(key) ?? []), l]);
  }
  const [key, best] = [...byHabit.entries()].sort((a, b) => b[1].length - a[1].length)[0] ?? [];
  if (!key || !best) return null;

  const current = habits.find(h => h.id === key);
  const freq = current?.frequency ?? [0, 1, 2, 3, 4, 5, 6];
  const done = new Set(best.map(l => l.date));
  const scheduled = eachDayOfInterval({ start: monthStart, end: monthEnd }).filter(d => freq.includes(d.getDay()));

  let streak = 0;
  let bestStreak = 0;
  for (const day of scheduled) {
    streak = done.has(format(day, "yyyy-MM-dd")) ? streak + 1 : 0;
    bestStreak = Math.max(bestStreak, streak);
  }

  return {
    name: best[0].habitName ?? "Habit",
    // Older logs may not have preserved the icon; fall back to the habit's current one
    icon: best[0].habitIcon ?? current?.icon ?? null,
    checks: done.size,
    scheduledDays: scheduled.length,
    bestStreak,
  };
}
