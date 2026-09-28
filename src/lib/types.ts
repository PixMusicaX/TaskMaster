// Shared data shapes, derived from the schema and server actions so they can't drift.
import type { event, note, smartMission, reliefRecommendation, preparationTip } from "@/db/schema";
import type { getHabits } from "@/app/actions/habits";
import type { getProfile, getSeasonHistory } from "@/app/actions/gamification";
import type { getMoodsByDateRange } from "@/app/actions/notes";

export type EventRow = typeof event.$inferSelect;
export type NoteRow = typeof note.$inferSelect;
export type SmartMissionRow = typeof smartMission.$inferSelect;
export type ReliefRow = typeof reliefRecommendation.$inferSelect;
export type PrepTipRow = typeof preparationTip.$inferSelect;

export type HabitWithLogs = Awaited<ReturnType<typeof getHabits>>[number];
export type HabitLog = HabitWithLogs["logs"][number];
export type Profile = Awaited<ReturnType<typeof getProfile>>;
export type Season = Awaited<ReturnType<typeof getSeasonHistory>>[number];
export type MoodEntry = Awaited<ReturnType<typeof getMoodsByDateRange>>[number];

export type StatName = "strength" | "intelligence" | "wealth" | "vitality" | "charisma";
export type Stats = Record<StatName, number>;

// One bullet line of a daily note (notes store a JSON array of these)
export type NoteLine = { id: string; bullet: string; text: string };

// Extra suggestions stored in ReliefRecommendation.alternatives
export type ReliefAlternative = { title: string; type?: string; description?: string };

// A relief row as held by the dashboard, flagged when it used a cached location
export type Relief = ReliefRow & { isCached?: boolean };

// Parse a note's content into bullet lines; legacy plain-text notes return null
export function parseNoteLines(content: string): NoteLine[] | null {
  try {
    const parsed: unknown = JSON.parse(content);
    return Array.isArray(parsed) ? (parsed as NoteLine[]) : null;
  } catch {
    return null;
  }
}
