import { format, parseISO } from "date-fns";
import type { SeasonRecap } from "./types";

export type InsightKind = "days" | "habit" | "notes" | "busiest" | "mood" | "quests";
export interface Insight { kind: InsightKind; text: string }

const MOOD_LABEL = { good: "good", neutral: "steady", bad: "tough" } as const;

// One-line verdict on the season: how it compares with the ones before it
export function recapHeadline(r: SeasonRecap): string {
  if (r.xp === 0) return "A quiet season";
  if (r.seasonRank === 1 && r.seasonsCompared >= 3) return `Your best of the last ${r.seasonsCompared} seasons`;
  if (!r.previous || r.previous.xp === 0) return "Your first season on record";

  const change = Math.round(((r.xp - r.previous.xp) / r.previous.xp) * 100);
  if (change >= 15) return `Up ${change}% on ${r.previous.monthName}`;
  if (change <= -15) return `Down ${Math.abs(change)}% on ${r.previous.monthName}`;
  return `Steady with ${r.previous.monthName}`;
}

// The most telling facts about the season, strongest first (at most `limit`)
export function recapInsights(r: SeasonRecap, limit = 4): Insight[] {
  const insights: Insight[] = [];
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  if (r.activeDays > 0) {
    insights.push({ kind: "days", text: `Active on ${r.activeDays} of ${r.daysInMonth} days` });
  }
  const h = r.habits.top;
  if (h && h.checks > 0) {
    const run = h.bestStreak > 1 ? `, best run ${h.bestStreak} in a row` : "";
    insights.push({ kind: "habit", text: `${h.name} on ${h.checks} of ${h.scheduledDays} scheduled days${run}` });
  }
  if (r.busiestDay && r.busiestDay.count > 1) {
    insights.push({ kind: "busiest", text: `Busiest day: ${format(parseISO(r.busiestDay.date), "EEEE, MMM d")}, ${r.busiestDay.count} things done` });
  }
  if (r.notes.days > 0) {
    insights.push({ kind: "notes", text: `Wrote on ${plural(r.notes.days, "day")}, ${plural(r.notes.lines, "line")} in all` });
  }
  const moodTotal = r.moods.good + r.moods.neutral + r.moods.bad;
  if (moodTotal > 0) {
    const [mood, count] = (Object.entries(r.moods) as [keyof typeof MOOD_LABEL, number][]).sort((a, b) => b[1] - a[1])[0];
    insights.push({ kind: "mood", text: `Mostly ${MOOD_LABEL[mood]} days: ${count} of ${moodTotal}` });
  }
  if (r.quests.done > 0) {
    const epic = r.quests.epic > 0 ? `, ${r.quests.epic} epic` : "";
    insights.push({ kind: "quests", text: `${plural(r.quests.done, "quest")} completed${epic}` });
  }
  return insights.slice(0, limit);
}

// What it takes to top last season in the new one
export function nextSeasonGoal(r: SeasonRecap) {
  const target = r.xp + 1;
  return { target, perDay: Math.ceil(target / r.nextSeason.daysInMonth) };
}
