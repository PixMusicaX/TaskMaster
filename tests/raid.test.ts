import { describe, it, expect, beforeEach, vi } from "vitest";
import { safeGenerateContent } from "@/lib/ai-utils";
import { getReliefRecommendation, regenerateReliefRecommendation } from "@/app/actions/relief";
import { getProfile } from "@/app/actions/gamification";
import { isRaid, isRaidDay, raidTargets, seatStats, statShort } from "@/lib/raid";
import { pickOfflineRaid } from "@/lib/offline-missions";
import { XP_VALUES } from "@/lib/constants";
import { reliefRecommendation } from "@/db/schema";
import { db } from "./helpers/test-db";
import { setToday, insertEvent, insertHabit, insertHabitLog, insertMission, insertNote, insertRelief, noteLines } from "./helpers/fixtures";

const ai = vi.mocked(safeGenerateContent);
const MONDAY = "2026-09-28";
const stats = (s: Partial<Record<string, number>>) => ({ strength: 0, intelligence: 0, wealth: 0, vitality: 0, charisma: 0, ...s });
// Rolls handed out in turn, for raidTargets' tie-breaking shuffle
const rolls = (...values: number[]) => { let i = 0; return () => values[i++ % values.length]; };

// A season where wealth is lowest, intelligence second lowest, and the rest well clear
async function seedSeason() {
  const gym = await insertHabit({ name: "Gym" });
  await insertHabitLog(gym.id, "2026-09-10", "Gym");
  await insertHabitLog(gym.id, "2026-09-11", "Gym");                    // vitality 20
  await insertNote("2026-09-10", noteLines("One line"));                 // intelligence 10
  await insertEvent({ title: "Done", date: "2026-09-12", completed: true }); // strength 30
  await insertMission({ date: "2026-09-13", completed: true, xpReward: 50 }); // charisma 50
}

beforeEach(() => setToday(MONDAY));

describe("raid rules", () => {
  it("happens on Mondays only", () => {
    expect(isRaidDay("2026-09-28")).toBe(true);
    expect(isRaidDay("2026-09-29")).toBe(false);
    expect(isRaidDay("2026-10-04")).toBe(false);
  });

  it("aims two objectives at the lowest stat and one at the second lowest", () => {
    expect(raidTargets(stats({ strength: 50, intelligence: 10, wealth: 30, vitality: 20, charisma: 40 }))).toEqual(["intelligence", "intelligence", "vitality"]);
  });

  it("breaks a tie for lowest at random, either way round", () => {
    const tied = stats({ strength: 50, intelligence: 10, wealth: 30, vitality: 10, charisma: 40 });
    // Rolls follow strength, intelligence, wealth, vitality, charisma
    expect(raidTargets(tied, rolls(0.1, 0.2, 0.3, 0.4, 0.5))).toEqual(["intelligence", "intelligence", "vitality"]);
    expect(raidTargets(tied, rolls(0.1, 0.9, 0.3, 0.4, 0.5))).toEqual(["vitality", "vitality", "intelligence"]);
  });

  it("reads each seat's stat, falling back to the row's", () => {
    expect(seatStats({ stat: "wealth", alternatives: [{ stat: "wealth" }, { stat: "vitality" }] })).toEqual(["wealth", "wealth", "vitality"]);
    expect(seatStats({ stat: "charisma", alternatives: [{ title: "Tea" }] })).toEqual(["charisma", "charisma", "charisma"]);
    expect(statShort("wealth")).toBe("WLT");
    expect(statShort("vitality")).toBe("VIT");
  });

  it("picks three different offline objectives for the targets, avoiding recent ones", () => {
    const first = pickOfflineRaid(["vitality", "vitality", "charisma"], [], rolls(0));
    expect(first.map(o => o.stat)).toEqual(["vitality", "vitality", "charisma"]);
    expect(new Set(first.map(o => o.title)).size).toBe(3);
    expect(first.every(o => o.title.includes("[OFF]"))).toBe(true);
    const next = pickOfflineRaid(["vitality", "vitality", "charisma"], first.map(o => o.title), rolls(0));
    expect(next.some(o => first.map(f => f.title).includes(o.title))).toBe(false);
  });
});

describe("the Monday raid", () => {
  it("replaces the Tavern with three AI objectives aimed at the weakest stats", async () => {
    await seedSeason();
    ai.mockResolvedValueOnce(JSON.stringify({
      objectives: [
        { title: "Budget the week", description: "Set a spending cap.", stat: "charisma" },
        { title: "Cancel one subscription", description: "The one you never use." },
        { title: "Read a chapter", description: "Any book." },
      ],
    }));

    const raid = await getReliefRecommendation(undefined, undefined, MONDAY);
    expect(isRaid(raid)).toBe(true);
    // The stats come from the season, whatever the model claimed
    expect(raid).toMatchObject({ title: "Budget the week", stat: "wealth", xpReward: XP_VALUES.RAID });
    expect(raid?.alternatives).toEqual([
      { title: "Cancel one subscription", description: "The one you never use.", type: "raid", stat: "wealth" },
      { title: "Read a chapter", description: "Any book.", type: "raid", stat: "intelligence" },
    ]);
    expect(String(ai.mock.calls[0][0])).toContain("WEALTH");
  });

  it("falls back to offline objectives when the AI fails", async () => {
    await seedSeason();
    const raid = await getReliefRecommendation(undefined, undefined, MONDAY);
    expect(isRaid(raid)).toBe(true);
    expect(raid?.title).toContain("[OFF]");
    expect(seatStats(raid!)).toEqual(["wealth", "wealth", "intelligence"]);
    expect(await db.select().from(reliefRecommendation)).toHaveLength(1);
  });

  it("feeds each completed objective's XP to its own stat", async () => {
    await insertRelief({
      date: MONDAY, type: "raid", stat: "vitality", xpReward: XP_VALUES.RAID,
      alternatives: [{ title: "B", type: "raid", stat: "vitality" }, { title: "C", type: "raid", stat: "wealth" }],
      completed: true, alt2Completed: true,
    });
    const profile = await getProfile(MONDAY);
    expect(profile.stats).toMatchObject({ vitality: XP_VALUES.RAID, wealth: XP_VALUES.RAID, charisma: 0 });
    expect(profile.xp).toBe(2 * XP_VALUES.RAID);
  });

  it("recaps last week against the week before, and last Monday's raid", async () => {
    await insertRelief({
      date: "2026-09-21", type: "raid", stat: "wealth", xpReward: XP_VALUES.RAID,
      alternatives: [{ title: "B", type: "raid", stat: "wealth" }, { title: "C", type: "raid", stat: "vitality" }],
      completed: true, alt1Completed: true,
    });
    await insertNote("2026-09-16", noteLines("Week before"));
    const raid = await getReliefRecommendation(undefined, undefined, MONDAY);
    expect(raid?.raidRecap).toEqual({ xp: 2 * XP_VALUES.RAID, previousXp: XP_VALUES.NOTE_ENTRY, cleared: 2 });
  });

  it("calls a new raid on regenerate, without the objectives it threw away", async () => {
    await insertRelief({ date: MONDAY, type: "raid", title: "Lights Out by Eleven [OFF]", stat: "vitality", alternatives: [] });
    const raid = await regenerateReliefRecommendation(undefined, undefined, MONDAY);
    expect(isRaid(raid)).toBe(true);
    expect(raid?.title).not.toBe("Lights Out by Eleven [OFF]");
    expect(await db.select().from(reliefRecommendation)).toHaveLength(1);
  });

  it("leaves Tuesday to the Tavern", async () => {
    setToday("2026-09-29");
    const relief = await getReliefRecommendation(undefined, undefined, "2026-09-29", "Pune", "Clear", "26");
    expect(isRaid(relief)).toBe(false);
    expect(relief?.raidRecap).toBeUndefined();
  });
});
