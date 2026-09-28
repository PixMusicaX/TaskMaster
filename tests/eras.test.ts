// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { ERAS, RANK_TO_ERA, eraForRank } from "@/lib/eras";
import { themeInitScript } from "@/lib/theme-init";
import { RPG_TITLES } from "@/lib/constants";

describe("eras", () => {
  it("assigns every rank to exactly one era, in rank order", () => {
    const eraOrder = ERAS.map(e => e.id);
    const assigned = RPG_TITLES.map(t => RANK_TO_ERA[t.title]);
    expect(assigned.every(Boolean)).toBe(true);
    // Eras never go backwards as rank increases
    const indices = assigned.map(id => eraOrder.indexOf(id));
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
    expect(ERAS.flatMap(e => e.ranks)).toHaveLength(RPG_TITLES.length);
  });

  it("falls back to the first era for unknown ranks", () => {
    expect(eraForRank("Nobody").id).toBe("forge");
    expect(eraForRank("Hero").id).toBe("legend");
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

  it("applies a rank earned this month with its era", () => {
    localStorage.setItem("rank", "Paladin");
    localStorage.setItem("rank_period", period());
    run();
    expect(root().getAttribute("data-rank")).toBe("Paladin");
    expect(root().getAttribute("data-era")).toBe("arcane");
  });

  it("resets to Novice when the stored rank is from another month", () => {
    localStorage.setItem("rank", "Hero");
    localStorage.setItem("rank_period", "1999-01");
    run();
    expect(root().getAttribute("data-rank")).toBe("Novice");
    expect(root().getAttribute("data-era")).toBe("forge");
  });
});
