import { describe, it, expect } from "vitest";
import { currentStreak, diffProfiles, rankForLevel } from "@/lib/progress";

const snap = (xp: number, level: number) => ({ xp, level, levelProgress: xp % 100, nextLevelXP: 100 });

describe("rankForLevel", () => {
  it("maps levels onto title thresholds", () => {
    expect(rankForLevel(1)).toBe("Novice");
    expect(rankForLevel(4)).toBe("Novice");
    expect(rankForLevel(5)).toBe("Squire");
    expect(rankForLevel(99)).toBe("Hero");
  });
});

describe("diffProfiles", () => {
  it("stays quiet on the first load and when nothing changed", () => {
    expect(diffProfiles(null, snap(250, 3))).toBeNull();
    expect(diffProfiles(snap(250, 3), snap(250, 3))).toBeNull();
  });

  it("reports a plain XP gain", () => {
    expect(diffProfiles(snap(210, 3), snap(240, 3))).toEqual({ xpDelta: 30, levelUp: null, rankUp: null });
  });

  it("reports a level-up within the same rank", () => {
    const diff = diffProfiles(snap(190, 2), snap(200, 3));
    expect(diff?.levelUp).toEqual({ from: 2, to: 3 });
    expect(diff?.rankUp).toBeNull();
  });

  it("reports a rank-up when a title threshold is crossed", () => {
    const diff = diffProfiles(snap(390, 4), snap(420, 5));
    expect(diff?.levelUp).toEqual({ from: 4, to: 5 });
    expect(diff?.rankUp).toEqual({ from: "Novice", to: "Squire" });
  });

  it("never celebrates losing XP", () => {
    const diff = diffProfiles(snap(410, 5), snap(390, 4));
    expect(diff).toEqual({ xpDelta: -20, levelUp: null, rankUp: null });
  });
});

describe("currentStreak", () => {
  // Wednesday 2026-09-30
  const today = new Date(2026, 8, 30);
  const log = (...dates: string[]) => dates.map(date => ({ date, completed: true }));

  it("counts back through consecutive completed days", () => {
    expect(currentStreak({ logs: log("2026-09-30", "2026-09-29", "2026-09-28") }, today)).toBe(3);
  });

  it("doesn't break the streak while today is still open", () => {
    expect(currentStreak({ logs: log("2026-09-29", "2026-09-28") }, today)).toBe(2);
  });

  it("stops at the first missed scheduled day", () => {
    expect(currentStreak({ logs: log("2026-09-30", "2026-09-28") }, today)).toBe(1);
  });

  it("skips days the habit isn't scheduled", () => {
    // Mon/Wed/Fri habit: Wed 30, Mon 28, Fri 25 done; Tue/Thu don't count against it
    const mwf = { frequency: [1, 3, 5], logs: log("2026-09-30", "2026-09-28", "2026-09-25") };
    expect(currentStreak(mwf, today)).toBe(3);
  });
});
