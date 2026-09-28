import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { getProfile, getSeasonHistory, invalidateSeasonSnapshots } from "@/app/actions/gamification";
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
