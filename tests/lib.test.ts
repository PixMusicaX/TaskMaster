import { describe, it, expect } from "vitest";
import { formatReliefTemp } from "@/lib/weather";
import { cn } from "@/lib/utils";
import { RPG_TITLES, LEVEL_UP_XP, XP_VALUES } from "@/lib/constants";

describe("formatReliefTemp", () => {
  it("keeps only the leading number of a stored temperature", () => {
    expect(formatReliefTemp("32° (24–32, feels 35)")).toBe("32");
    expect(formatReliefTemp("28 C")).toBe("28");
    expect(formatReliefTemp("22")).toBe("22");
  });

  it("returns an empty string for missing values", () => {
    expect(formatReliefTemp(null)).toBe("");
    expect(formatReliefTemp(undefined)).toBe("");
    expect(formatReliefTemp("")).toBe("");
  });
});

describe("cn", () => {
  it("merges conditional classes and resolves Tailwind conflicts", () => {
    expect(cn("p-2", false && "hidden", "p-4")).toBe("p-4");
    expect(cn("text-sm", { "font-bold": true, italic: false })).toBe("text-sm font-bold");
  });
});

describe("constants", () => {
  it("lists RPG titles in ascending level order starting at 1", () => {
    expect(RPG_TITLES[0].minLevel).toBe(1);
    const levels = RPG_TITLES.map(t => t.minLevel);
    expect([...levels].sort((a, b) => a - b)).toEqual(levels);
  });

  it("uses positive XP values", () => {
    expect(LEVEL_UP_XP).toBeGreaterThan(0);
    for (const value of Object.values(XP_VALUES)) expect(value).toBeGreaterThan(0);
  });
});
