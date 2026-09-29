// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { ERAS, MAX_ERA, eraAt, eraById, liveEraIndex, seasonEras } from "@/lib/eras";
import { themeInitScript } from "@/lib/theme-init";

describe("eras", () => {
  it("runs from I to V", () => {
    expect(ERAS.map(e => e.numeral)).toEqual(["I", "II", "III", "IV", "V"]);
    expect(MAX_ERA).toBe(4);
  });

  it("clamps lookups and falls back to the first era", () => {
    expect(eraAt(-3).id).toBe("forge");
    expect(eraAt(9).id).toBe("legend");
    expect(eraById("arcane").numeral).toBe("IV");
    expect(eraById("nope").id).toBe("forge");
    expect(eraById(null).id).toBe("forge");
  });
});

describe("liveEraIndex", () => {
  it("stands one era up only while strictly ahead of last month's pace", () => {
    expect(liveEraIndex(0, 3276, 3275)).toBe(1);
    expect(liveEraIndex(0, 3275, 3275)).toBe(0);
    expect(liveEraIndex(0, 100, 3275)).toBe(0);
  });

  it("never goes past the final era", () => {
    expect(liveEraIndex(MAX_ERA, 9999, 0)).toBe(MAX_ERA);
  });

  it("counts any XP as ahead when last month had none", () => {
    expect(liveEraIndex(0, 10, 0)).toBe(1);
    expect(liveEraIndex(0, 0, 0)).toBe(0);
  });
});

describe("seasonEras", () => {
  it("starts the first season at I and climbs one era per month that beats the one before", () => {
    const { seasons, nextStart } = seasonEras([100, 200, 300]);
    expect(seasons).toEqual([
      { start: 0, end: 1 }, // first season beats an empty month
      { start: 1, end: 2 },
      { start: 2, end: 3 },
    ]);
    expect(nextStart).toBe(3);
  });

  it("drops one era after a month that falls short, never below I", () => {
    const { seasons, nextStart } = seasonEras([300, 200, 100, 50]);
    expect(seasons.map(s => s.start)).toEqual([0, 1, 0, 0]);
    expect(seasons.map(s => s.end)).toEqual([1, 1, 0, 0]);
    expect(nextStart).toBe(0);
  });

  it("treats a tie as not beating the month before", () => {
    const { seasons, nextStart } = seasonEras([100, 100]);
    expect(seasons[1]).toEqual({ start: 1, end: 1 });
    expect(nextStart).toBe(0);
  });

  it("caps at V", () => {
    const { seasons, nextStart } = seasonEras([1, 2, 3, 4, 5, 6, 7]);
    expect(seasons.map(s => s.end)).toEqual([1, 2, 3, 4, 4, 4, 4]);
    expect(nextStart).toBe(4);
  });

  it("ignores empty months before the first activity", () => {
    const { seasons, nextStart } = seasonEras([0, 0, 50, 80]);
    expect(seasons).toEqual([{ start: 0, end: 0 }, { start: 0, end: 0 }, { start: 0, end: 1 }, { start: 1, end: 2 }]);
    expect(nextStart).toBe(2);
  });

  it("counts an empty month after activity as falling short", () => {
    expect(seasonEras([50, 80, 0]).nextStart).toBe(1);
  });

  it("starts at I with no history", () => {
    expect(seasonEras([])).toEqual({ seasons: [], nextStart: 0 });
  });
});

describe("themeInitScript", () => {
  const period = () => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  };
  const run = () => new Function(themeInitScript)();
  const root = () => document.documentElement;

  beforeEach(() => {
    localStorage.clear();
    root().removeAttribute("data-rank");
    root().removeAttribute("data-era");
  });

  it("applies the rank and era set this month, independently", () => {
    localStorage.setItem("rank", "Paladin");
    localStorage.setItem("rank_period", period());
    localStorage.setItem("era", "steel");
    localStorage.setItem("era_period", period());
    run();
    expect(root().getAttribute("data-rank")).toBe("Paladin");
    expect(root().getAttribute("data-era")).toBe("steel");
  });

  it("keeps a rank saved before v6 (no period) until the profile re-saves it", () => {
    localStorage.setItem("rank", "Sentinel");
    run();
    expect(root().getAttribute("data-rank")).toBe("Sentinel");
  });

  it("publishes the rank and era labels as CSS variables for first paint", () => {
    localStorage.setItem("rank", "Sentinel");
    localStorage.setItem("rank_period", period());
    localStorage.setItem("era", "order");
    localStorage.setItem("era_period", period());
    run();
    const style = root().style;
    expect(style.getPropertyValue("--tm-rank-label")).toBe('"Sentinel"');
    expect(style.getPropertyValue("--tm-era-label")).toBe('"III"');
    expect(style.getPropertyValue("--tm-era-name")).toBe('"Order"');
  });

  it("resets both when they're from another month", () => {
    localStorage.setItem("rank", "Hero");
    localStorage.setItem("rank_period", "1999-01");
    localStorage.setItem("era", "legend");
    localStorage.setItem("era_period", "1999-01");
    run();
    expect(root().getAttribute("data-rank")).toBe("Novice");
    expect(root().getAttribute("data-era")).toBe("forge");
  });
});
