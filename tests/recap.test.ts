import { describe, it, expect, beforeEach } from "vitest";
import { getSeasonRecap } from "@/app/actions/recap";
import { recapHeadline, recapInsights, nextSeasonGoal } from "@/lib/recap";
import type { SeasonRecap } from "@/lib/types";
import {
  setToday, noteLines, insertNote, insertEvent, insertHabit, insertHabitLog, insertMission, insertRelief,
} from "./helpers/fixtures";

beforeEach(() => setToday("2026-09-28"));

describe("getSeasonRecap", () => {
  it("summarises last month's activity", async () => {
    const gym = await insertHabit({ name: "Gym", icon: "dumbbell" });
    const read = await insertHabit({ name: "Read" });
    for (const d of ["01", "02", "03", "05", "06"]) await insertHabitLog(gym.id, `2026-08-${d}`, "Gym");
    await insertHabitLog(read.id, "2026-08-02", "Read");

    await insertNote("2026-08-02", noteLines("one", "two", ""), "good");
    await insertNote("2026-08-03", noteLines(""), "bad"); // mood only
    await insertNote("2026-08-04", noteLines("three"), "good");
    await insertEvent({ title: "Task", date: "2026-08-02", completed: true });
    await insertEvent({ title: "Open task", date: "2026-08-02" });
    await insertEvent({ title: "Epic quest", type: "event", tier: "epic", date: "2026-08-20", startTime: new Date("2026-08-20T10:00:00") });
    await insertEvent({ title: "Holiday", type: "special_day", date: "2026-08-15", isApi: true });
    await insertMission({ date: "2026-08-02", completed: true });
    await insertRelief({ date: "2026-08-09", completed: true, alt2Completed: true });
    await insertNote("2026-09-01", noteLines("this month, ignored"));

    const r = await getSeasonRecap("2026-09-28");

    expect(r).toMatchObject({
      period: "2026-08", monthName: "August", year: 2026, daysInMonth: 31,
      notes: { days: 2, lines: 3 },
      moods: { good: 2, neutral: 0, bad: 1 },
      tasksDone: 1,
      quests: { done: 1, epic: 1 },
      missionsDone: 3, // 1 smart mission + 2 relief completions
      nextSeason: { monthName: "September", daysInMonth: 30 },
    });
    // Aug 2: 2 note lines + 2 habit checks + 1 task + 1 mission
    expect(r.busiestDay).toEqual({ date: "2026-08-02", count: 6 });
    // Aug 1, 2, 3, 4, 5, 6, 9 and 20 (Aug 3's note is mood-only, but Gym was checked)
    expect(r.activeDays).toBe(8);
    expect(r.habits).toEqual({
      checks: 6,
      top: { name: "Gym", icon: "dumbbell", checks: 5, scheduledDays: 31, bestStreak: 3 },
    });
    expect(r.xp).toBeGreaterThan(0);
  });

  it("compares with the month before and ranks the season", async () => {
    await insertNote("2026-07-10", noteLines("a", "b", "c", "d")); // July: 40 XP
    await insertNote("2026-06-10", noteLines("a"));                // June: 10 XP
    await insertNote("2026-08-10", noteLines("a", "b"));           // August: 20 XP

    const r = await getSeasonRecap("2026-09-28");
    expect(r.xp).toBe(20);
    expect(r.previous).toMatchObject({ monthName: "July", xp: 40 });
    expect(r.seasonRank).toBe(2);
    expect(r.seasonsCompared).toBe(3);
  });

  it("handles a month with nothing in it", async () => {
    const r = await getSeasonRecap("2026-09-28");
    expect(r).toMatchObject({ xp: 0, activeDays: 0, busiestDay: null, seasonRank: null, habits: { checks: 0, top: null } });
  });
});

const base: SeasonRecap = {
  period: "2026-08", monthName: "August", year: 2026, daysInMonth: 31,
  xp: 3725, level: 38, title: "Paladin", topStat: "vitality", weakStat: "charisma",
  stats: { strength: 900, intelligence: 800, wealth: 700, vitality: 1200, charisma: 125 },
  previous: { monthName: "July", xp: 3000, level: 31, title: "Sentinel" },
  seasonRank: 2, seasonsCompared: 6, activeDays: 29,
  busiestDay: { date: "2026-08-14", count: 12 },
  notes: { days: 27, lines: 140 },
  moods: { good: 18, neutral: 8, bad: 3 },
  habits: { checks: 90, top: { name: "Gym", icon: null, checks: 20, scheduledDays: 22, bestStreak: 9 } },
  tasksDone: 40, quests: { done: 6, epic: 1 }, missionsDone: 30,
  nextSeason: { monthName: "September", daysInMonth: 30 },
};

describe("recapHeadline", () => {
  it("celebrates the best season", () => {
    expect(recapHeadline({ ...base, seasonRank: 1 })).toBe("Your best of the last 6 seasons");
  });
  it("compares with last month", () => {
    expect(recapHeadline(base)).toBe("Up 24% on July");
    expect(recapHeadline({ ...base, xp: 2000 })).toBe("Down 33% on July");
    expect(recapHeadline({ ...base, xp: 3100 })).toBe("Steady with July");
  });
  it("handles first and empty seasons", () => {
    expect(recapHeadline({ ...base, previous: null })).toBe("Your first season on record");
    expect(recapHeadline({ ...base, xp: 0 })).toBe("A quiet season");
  });
});

describe("recapInsights", () => {
  it("lists the strongest facts first, up to the limit", () => {
    expect(recapInsights(base).map(i => i.text)).toEqual([
      "Active on 29 of 31 days",
      "Gym on 20 of 22 scheduled days, best run 9 in a row",
      "Busiest day: Friday, Aug 14, 12 things done",
      "Wrote on 27 days, 140 lines in all",
    ]);
    const all = recapInsights(base, 6);
    expect(all.map(i => i.kind)).toEqual(["days", "habit", "busiest", "notes", "mood", "quests"]);
    expect(all[4].text).toBe("Mostly good days: 18 of 29");
    expect(all[5].text).toBe("6 quests completed, 1 epic");
  });

  it("skips facts that don't apply", () => {
    const quiet: SeasonRecap = {
      ...base, activeDays: 0, busiestDay: null, notes: { days: 0, lines: 0 },
      moods: { good: 0, neutral: 0, bad: 0 }, habits: { checks: 0, top: null }, quests: { done: 0, epic: 0 },
    };
    expect(recapInsights(quiet)).toEqual([]);
  });
});

describe("nextSeasonGoal", () => {
  it("spreads last season's total plus one over the new month", () => {
    expect(nextSeasonGoal(base)).toEqual({ target: 3726, perDay: 125 });
  });
});
