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
