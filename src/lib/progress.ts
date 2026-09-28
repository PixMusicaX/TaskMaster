import { format, subDays } from "date-fns";
import { RPG_TITLES } from "./constants";

export interface ProfileSnapshot {
  xp: number;
  level: number;
  levelProgress: number;
  nextLevelXP: number;
}

export interface ProgressDiff {
  xpDelta: number;
  levelUp: { from: number; to: number } | null;
  rankUp: { from: string; to: string } | null;
}

export function rankForLevel(level: number): string {
  return [...RPG_TITLES].reverse().find(t => level >= t.minLevel)?.title ?? "Novice";
}

// What changed between two profile fetches; null on the first fetch or when nothing moved
export function diffProfiles(prev: ProfileSnapshot | null, next: ProfileSnapshot): ProgressDiff | null {
  if (!prev) return null;
  const xpDelta = next.xp - prev.xp;
  if (xpDelta === 0 && next.level === prev.level) return null;

  const fromRank = rankForLevel(prev.level);
  const toRank = rankForLevel(next.level);
  return {
    xpDelta,
    levelUp: next.level > prev.level ? { from: prev.level, to: next.level } : null,
    rankUp: next.level > prev.level && toRank !== fromRank ? { from: fromRank, to: toRank } : null,
  };
}

// Consecutive scheduled days completed, counting back from today. Today may still be
// open, so an unfinished today doesn't break the streak; unscheduled days are skipped.
export function currentStreak(
  habit: { frequency?: number[] | null; logs?: { date: string; completed: boolean }[] },
  today: Date
): number {
  const freq = habit.frequency || [0, 1, 2, 3, 4, 5, 6];
  if (freq.length === 0) return 0;
  const done = new Set((habit.logs || []).filter(l => l.completed).map(l => l.date));
  let streak = 0;
  for (let i = 0; i < 366; i++) {
    const day = subDays(today, i);
    if (!freq.includes(day.getDay())) continue;
    if (done.has(format(day, "yyyy-MM-dd"))) streak++;
    else if (i > 0) break;
  }
  return streak;
}
