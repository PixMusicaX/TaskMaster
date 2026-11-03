// The Weekly Raid: on Mondays the Tavern turns into a raid on the player's weakest stats. Three
// objectives, two aimed at the lowest stat and one at the second lowest, each worth XP_VALUES.RAID
// to the stat it targets. A raid is stored as that day's relief row (type "raid"), with each
// objective's stat on it, so it is toggled, counted and remembered like the Tavern it replaces.
// Safe to import from the client.
import { XP_VALUES } from "./constants";
import type { StatName, Stats } from "./types";

export const RAID_TYPE = "raid";
export const RAID_XP = XP_VALUES.RAID;

const STAT_NAMES: StatName[] = ["strength", "intelligence", "wealth", "vitality", "charisma"];

// What each stat stands for in a raid objective (the prompt and the offline picks both use it)
export const RAID_STAT_MEANING: Record<StatName, string> = {
  strength: "grit and getting things done: clearing a lingering task, a physical effort, finishing what was started",
  intelligence: "the mind: learning, reading, reflecting, writing something down",
  wealth: "money and the long game: a budget, a career step, planning or building something lasting",
  vitality: "health: sleep, movement, food, water, the habits that keep the body going",
  charisma: "people: reaching out, kindness, speaking up, time with someone",
};

// Raids happen on Mondays. `date` is the player's own day, "YYYY-MM-DD".
export function isRaidDay(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay() === 1;
}

export function isRaid(relief: { type?: string | null } | null | undefined) {
  return relief?.type === RAID_TYPE;
}

// The stat each objective targets: the lowest twice, then the second lowest. Ties are broken at
// random, so when the two lowest are level either may get the pair.
export function raidTargets(stats: Stats, rng: () => number = Math.random): [StatName, StatName, StatName] {
  const shuffled = STAT_NAMES.map(name => ({ name, roll: rng() })).sort((a, b) => a.roll - b.roll).map(s => s.name);
  // Array.prototype.sort is stable, so within a tie the shuffled order stands
  const [lowest, second] = shuffled.sort((a, b) => (stats[a] ?? 0) - (stats[b] ?? 0));
  return [lowest, lowest, second];
}

type RaidRow = { stat: string; alternatives?: unknown };

// The stat each of a raid's three seats feeds: the main objective's is the row's own, the other
// two ride on their alternatives (an older row without one falls back to the row's)
export function seatStats(row: RaidRow): string[] {
  const alternatives = Array.isArray(row.alternatives) ? (row.alternatives as { stat?: string }[]) : [];
  return [row.stat, alternatives[0]?.stat ?? row.stat, alternatives[1]?.stat ?? row.stat];
}

const STAT_LABEL: Record<StatName, string> = {
  strength: "Strength", intelligence: "Intelligence", wealth: "Wealth", vitality: "Vitality", charisma: "Charisma",
};

export function statLabel(stat: string | null | undefined) {
  return stat && stat in STAT_LABEL ? STAT_LABEL[stat as StatName] : "XP";
}

// Three letters, for where a whole word won't fit (STR, INT, WLT, VIT, CHA)
export function statShort(stat: string | null | undefined) {
  if (stat === "wealth") return "WLT";
  return stat && stat in STAT_LABEL ? stat.slice(0, 3).toUpperCase() : "XP";
}

// What the Raid shows for last week: XP earned Monday to Sunday against the week before, and how
// much of last Monday's raid was cleared (null when there wasn't one)
export type RaidRecap = { xp: number; previousXp: number; cleared: number | null };
