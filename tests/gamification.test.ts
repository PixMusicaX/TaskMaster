import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { getProfile, getSeasonHistory, getSeasonPace, getSeasonTimeline, getEraProgress, invalidateSeasonSnapshots } from "@/app/actions/gamification";
import { saveNote } from "@/app/actions/notes";
import { toggleHabitLog } from "@/app/actions/habits";
import { seasonSnapshot } from "@/db/schema";
import { db } from "./helpers/test-db";
import {
  setToday, noteLines, insertNote, insertEvent, insertHabit, insertHabitLog,
  insertMission, insertPrepTip, insertRelief,
} from "./helpers/fixtures";

describe("getProfile (XP for the current month)", () => {
  beforeEach(() => setToday("2026-09-28"));

  it("returns a zeroed Novice profile when nothing has happened", async () => {
    const profile = await getProfile("2026-09-28");
    expect(profile).toMatchObject({ xp: 0, level: 1, title: "Novice", levelProgress: 0 });
  });

  it("awards XP from every source to the right stats", async () => {
    const h = await insertHabit({ name: "Gym" });
    await insertHabitLog(h.id, "2026-09-10");                                          // +10 vitality
    await insertHabitLog(h.id, "2026-09-11");                                          // +10 vitality
    await insertEvent({ title: "Done task", date: "2026-09-12", completed: true });    // +30 strength
    await insertEvent({ title: "Open task", date: "2026-09-12" });                     // 0
    await insertEvent({                                                                // +60 wealth (past)
      title: "Past quest", type: "event", tier: "main", date: "2026-09-27",
      startTime: new Date("2026-09-27T09:00:00"),
    });
    await insertEvent({                                                                // 0 (future)
      title: "Future quest", type: "event", tier: "epic", date: "2026-09-30",
      startTime: new Date("2026-09-30T09:00:00"),
    });
    await insertNote("2026-09-01", noteLines("one", "", "two"));                       // +20 intelligence
    await insertNote("2026-09-02", noteLines(""), "good");                             // 0 (mood only)
    await insertNote("2026-09-03", "plain text note");                                 // +10 intelligence
    await insertMission({ date: "2026-09-04", completed: true, xpReward: 50, stat: "charisma" });
    await insertMission({ date: "2026-09-05", completed: false, xpReward: 50 });       // 0
    await insertPrepTip({ date: "2026-09-06", completed: true, xpReward: 25, stat: "intelligence" });
    await insertRelief({ date: "2026-09-07", completed: true, alt1Completed: true, xpReward: 10, stat: "charisma" });
    await insertNote("2026-08-31", noteLines("last month"));                           // outside the month

    const profile = await getProfile("2026-09-28");

    expect(profile.stats).toEqual({ vitality: 20, strength: 30, wealth: 60, intelligence: 55, charisma: 70 });
    expect(profile.xp).toBe(235);
    expect(profile.level).toBe(3);
    expect(profile.levelProgress).toBe(35);
    expect(profile.topStat).toBe("charisma");
    expect(profile.weakStat).toBe("vitality");
  });

  it("gives higher titles at higher levels", async () => {
    const h = await insertHabit({ name: "Read" });
    // 50 habit checks = 500 XP = level 6 = Squire
    for (let d = 1; d <= 25; d++) {
      await insertHabitLog(h.id, `2026-09-${String(d).padStart(2, "0")}`);
    }
    const h2 = await insertHabit({ name: "Run" });
    for (let d = 1; d <= 25; d++) {
      await insertHabitLog(h2.id, `2026-09-${String(d).padStart(2, "0")}`);
    }
    const profile = await getProfile("2026-09-28");
    expect(profile.level).toBe(6);
    expect(profile.title).toBe("Squire");
  });
});

describe("getSeasonHistory (cached past months)", () => {
  beforeEach(() => setToday("2026-09-28"));

  it("returns one entry per month, newest first", async () => {
    const history = await getSeasonHistory(3, "2026-09-28");
    expect(history.map(h => h.monthName)).toEqual(["September", "August", "July"]);
  });

  it("snapshots past months but always computes the current month live", async () => {
    await insertNote("2026-08-10", noteLines("august"));
    await getSeasonHistory(2, "2026-09-28");

    const periods = (await db.select().from(seasonSnapshot)).map(s => s.period);
    expect(periods).toEqual(["2026-08"]);

    // New data for the current month shows up immediately
    await insertNote("2026-09-10", noteLines("september"));
    const [september] = await getSeasonHistory(1, "2026-09-28");
    expect(september.xp).toBe(10);
  });

  it("serves the snapshot until data for that month changes through an action", async () => {
    await insertNote("2026-08-10", noteLines("august"));
    expect((await getSeasonHistory(2, "2026-09-28"))[1].xp).toBe(10);

    // Written behind the app's back: the snapshot is still served
    await insertNote("2026-08-11", noteLines("sneaky"));
    expect((await getSeasonHistory(2, "2026-09-28"))[1].xp).toBe(10);

    // Saving through the app clears the stale snapshot
    await saveNote("2026-08-12", noteLines("via app"));
    expect((await getSeasonHistory(2, "2026-09-28"))[1].xp).toBe(30);
  });

  it("recomputes a past month after a habit is toggled on that month", async () => {
    const h = await insertHabit({ name: "Walk" });
    expect((await getSeasonHistory(2, "2026-09-28"))[1].xp).toBe(0);

    await toggleHabitLog(h.id, "2026-08-05", true);
    expect((await getSeasonHistory(2, "2026-09-28"))[1].xp).toBe(10);
  });

  it("invalidates only the months it is given", async () => {
    await getSeasonHistory(3, "2026-09-28");
    await invalidateSeasonSnapshots("2026-08-15", null, undefined);
    const periods = (await db.select().from(seasonSnapshot)).map(s => s.period);
    expect(periods).toEqual(["2026-07"]);
    expect(await db.select().from(seasonSnapshot).where(eq(seasonSnapshot.period, "2026-08"))).toHaveLength(0);
  });
});

describe("getSeasonPace", () => {
  it("compares with last month's XP up to the same day, plus its final total", async () => {
    setToday("2026-09-28");
    await insertNote("2026-08-10", noteLines("early"));     // counts toward the pace
    await insertNote("2026-08-28", noteLines("same day"));  // counts (inclusive)
    await insertNote("2026-08-30", noteLines("late"));      // only in the final total

    expect(await getSeasonPace("2026-09-28")).toEqual({
      dayOfMonth: 28,
      daysInMonth: 30,
      lastMonthName: "August",
      lastMonthPaceXP: 20,
      lastMonthTotalXP: 30,
    });
  });

  it("uses the whole of a shorter last month on the 31st", async () => {
    setToday("2026-10-31");
    await insertNote("2026-09-30", noteLines("last day of September"));
    const pace = await getSeasonPace("2026-10-31");
    expect(pace).toMatchObject({ dayOfMonth: 31, lastMonthName: "September", lastMonthPaceXP: 10, lastMonthTotalXP: 10 });
  });

  it("reports zero when last month has no activity", async () => {
    setToday("2026-09-05");
    expect(await getSeasonPace("2026-09-05")).toMatchObject({ lastMonthPaceXP: 0, lastMonthTotalXP: 0 });
  });
});

describe("getSeasonTimeline", () => {
  beforeEach(() => setToday("2026-09-28"));

  it("covers every month since the first activity, with eras, newest first", async () => {
    await insertNote("2026-06-10", noteLines("a"));           // June: 10 XP
    await insertNote("2026-07-10", noteLines("a", "b", "c")); // July: 30 XP, beats June
    await insertNote("2026-08-10", noteLines("a"));           // August: 10 XP, falls short

    const { seasons, currentStart } = await getSeasonTimeline("2026-09-28");
    expect(seasons.map(s => s.monthName)).toEqual(["September", "August", "July", "June"]);
    expect(seasons.map(s => [s.eraStart, s.eraEnd])).toEqual([[1, null], [2, 2], [1, 2], [0, 1]]);
    expect(currentStart).toBe(1);
  });

  it("starts at Era I with no history", async () => {
    const { seasons, currentStart } = await getSeasonTimeline("2026-09-28");
    expect(seasons).toHaveLength(1);
    expect(currentStart).toBe(0);
  });

  it("can pad the timeline to a minimum length", async () => {
    const { seasons } = await getSeasonTimeline("2026-09-28", 13);
    expect(seasons).toHaveLength(13);
  });
});

describe("getEraProgress", () => {
  beforeEach(() => setToday("2026-09-28"));

  it("places you one era up while ahead of last month's pace", async () => {
    await insertNote("2026-08-10", noteLines("a", "b")); // August: 20 XP by day 28 → season starts at II
    await insertNote("2026-09-02", noteLines("a"));       // September: 10 XP, behind
    expect(await getEraProgress("2026-09-28")).toEqual({
      startIndex: 1, lastMonthName: "August", lastMonthPaceXP: 20, index: 1,
    });

    await insertNote("2026-09-03", noteLines("a", "b"));  // September: 30 XP, ahead
    expect((await getEraProgress("2026-09-28")).index).toBe(2);
  });
});
