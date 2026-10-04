import { describe, it, expect } from "vitest";
import { RELIEF_TYPES, isRepeat, normalizeTitle, rollReliefBrief } from "@/lib/relief-dice";
import { getReliefRecommendationPrompt, getSmartMissionPrompt, personaDirective } from "@/lib/prompts";
import { resolvePersonaStyle, scheduledPersona } from "@/lib/persona";

// A repeatable stand-in for Math.random
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

describe("the Tavern's dice", () => {
  it("rolls three different types, each with an angle", () => {
    for (let s = 1; s <= 200; s++) {
      const brief = rollReliefBrief([], seeded(s));
      const types = [brief.main.type, ...brief.alternatives.map(a => a.type)];
      expect(new Set(types).size).toBe(3);
      types.forEach(t => expect(RELIEF_TYPES).toContain(t));
      [brief.main, ...brief.alternatives].forEach(p => expect(p.angle.length).toBeGreaterThan(3));
    }
  });

  it("keeps the main type away from the last three days' main types", () => {
    for (let s = 1; s <= 200; s++) {
      const brief = rollReliefBrief(["movie", "song", "food", "game"], seeded(s));
      expect(["movie", "song", "food"]).not.toContain(brief.main.type);
    }
  });

  it("varies: many different briefs come out of different rolls", () => {
    const seen = new Set(Array.from({ length: 200 }, (_, s) => JSON.stringify(rollReliefBrief([], seeded(s + 1)))));
    expect(seen.size).toBeGreaterThan(150);
  });

  it("spots a repeat despite case, punctuation and a year in brackets", () => {
    expect(normalizeTitle("The Grand Budapest Hotel (2014)")).toBe("the grand budapest hotel");
    expect(isRepeat("the grand budapest hotel", ["The Grand Budapest Hotel (2014)"])).toBe(true);
    expect(isRepeat("Rounds", ["Four Tet - Rounds"])).toBe(false);
    expect(isRepeat("", ["Anything"])).toBe(false);
  });
});

describe("the relief prompt", () => {
  const base = {
    recentNotes: [], recentTasks: [], today: "2026-10-04",
    history: [{ title: "In the Mood for Love (2000)", type: "movie" }],
    brief: rollReliefBrief([], seeded(7)),
  };

  it("states the rolled types, the do-not-repeat list and any rejected titles", () => {
    const prompt = getReliefRecommendationPrompt({ ...base, rejected: ["Spirited Away (2001)"] });
    expect(prompt).toContain(`a ${base.brief.main.type}. Angle: ${base.brief.main.angle}`);
    expect(prompt).toContain("In the Mood for Love (2000)");
    expect(prompt).toContain("Spirited Away (2001)");
    expect(prompt).toContain(`"type": "${base.brief.alternatives[1].type}"`);
  });
});

describe("the Persona voice", () => {
  it("is absent on normal days and present, per game, on Persona days", () => {
    expect(personaDirective(null, "mission")).toBe("");
    expect(personaDirective("p5", "mission")).toContain("PERSONA 5 DAY");
    expect(personaDirective("p3", "relief")).toContain("Iwatodai");
    expect(personaDirective("p4", "answer")).toContain("teammate");
  });

  it("reaches the prompts only when a style is passed", () => {
    const context = { level: 5, xp: 400, stats: {}, title: "Squire", habits: [], recentTasks: [], recentNotes: [], missionHistory: [], today: "2026-10-04" };
    expect(getSmartMissionPrompt(context)).not.toContain("DAY\n═");
    expect(getSmartMissionPrompt({ ...context, persona: "p5" })).toContain("TODAY IS A PERSONA 5 DAY");
  });

  it("takes the client's style, or falls back to the calendar", () => {
    expect(resolvePersonaStyle("p4", "2026-10-04")).toBe("p4");
    expect(resolvePersonaStyle(null, "2026-10-10")).toBeNull();
    expect(resolvePersonaStyle("nonsense", "2026-10-10")).toBe(scheduledPersona(new Date(2026, 9, 10)));
    expect(resolvePersonaStyle(undefined, "2026-10-10")).toBe("p5");
    expect(resolvePersonaStyle(undefined, "2026-10-04")).toBeNull();
  });
});
