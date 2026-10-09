// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  DEV_PERSONA_KEY,
  PERSONA_ON_KEY,
  nextPersonaDay,
  daysToFullMoon,
  moonPhaseIndex,
  personaDaysInMonth,
  personaForToday,
  personaTimeOfDay,
  pickPersonaDays,
  scheduledPersona,
} from "@/lib/persona";
import { themeInitScript } from "@/lib/theme-init";

// Every month from 2024 to 2033
const MONTHS = Array.from({ length: 120 }, (_, i) => ({ year: 2024 + Math.floor(i / 12), month: i % 12 }));

describe("persona days", () => {
  it("picks two days of each style every month", () => {
    for (const { year, month } of MONTHS) {
      const styles = [...personaDaysInMonth(year, month).values()].sort();
      expect(styles).toEqual(["p3", "p3", "p4", "p4", "p5", "p5"]);
    }
  });

  it("keeps a normal day between Persona days and a week between the same game", () => {
    for (const { year, month } of MONTHS) {
      const days = [...personaDaysInMonth(year, month).entries()].sort((a, b) => a[0] - b[0]);
      const length = new Date(year, month + 1, 0).getDate();
      for (let i = 0; i < days.length; i++) {
        expect(days[i][0]).toBeGreaterThanOrEqual(1);
        expect(days[i][0]).toBeLessThanOrEqual(length);
        if (i > 0) expect(days[i][0] - days[i - 1][0]).toBeGreaterThanOrEqual(2);
        for (let j = i + 1; j < days.length; j++) {
          if (days[i][1] === days[j][1]) expect(days[j][0] - days[i][0]).toBeGreaterThanOrEqual(7);
        }
      }
    }
  });

  it("is the same every time for a month, and differs between months", () => {
    expect(pickPersonaDays(2026, 9)).toEqual(pickPersonaDays(2026, 9));
    const layouts = new Set(MONTHS.map(({ year, month }) => JSON.stringify(pickPersonaDays(year, month))));
    expect(layouts.size).toBeGreaterThan(100);
  });

  it("looks up a date's style", () => {
    const [[day, style]] = [...personaDaysInMonth(2026, 9).entries()];
    expect(scheduledPersona(new Date(2026, 9, day, 15))).toBe(style);
    const normal = Array.from({ length: 31 }, (_, i) => i + 1).find(d => !personaDaysInMonth(2026, 9).has(d))!;
    expect(scheduledPersona(new Date(2026, 9, normal))).toBeNull();
  });

  it("finds the next Persona day after today", () => {
    const next = nextPersonaDay(new Date(2026, 9, 4, 12))!;
    expect(next.date.getDate()).toBe(10);
    expect(next.style).toBe(scheduledPersona(next.date));
  });

  it("names the time of day like the games", () => {
    const at = (h: number) => new Date(2026, 9, 4, h);
    expect(personaTimeOfDay("p5", at(16), false)).toBe("After School");
    expect(personaTimeOfDay("p4", at(2), false)).toBe("Midnight");
    expect(personaTimeOfDay("p3", at(0), true)).toBe("Dark Hour");
    expect(personaTimeOfDay("p3", at(20), true)).toBe("Evening");
  });

  it("tracks the moon", () => {
    // Full moon on 7 Oct 2025 (UTC evening), new moon on 21 Oct 2025
    expect(moonPhaseIndex(new Date(Date.UTC(2025, 9, 7, 3)))).toBe(4);
    expect(daysToFullMoon(new Date(Date.UTC(2025, 9, 7, 3)))).toBe(0);
    expect(moonPhaseIndex(new Date(Date.UTC(2025, 9, 21, 12)))).toBe(0);
    expect(daysToFullMoon(new Date(Date.UTC(2025, 9, 1, 12)))).toBe(6);
  });
});

describe("persona in the init script", () => {
  const root = () => document.documentElement;
  const run = () => new Function(themeInitScript)();
  // A Persona day and a normal day this October
  const october = personaDaysInMonth(2026, 9);
  const personaDay = [...october.entries()].find(([, s]) => s === "p4")!;
  const normalDay = Array.from({ length: 31 }, (_, i) => i + 1).find(d => !october.has(d))!;

  beforeEach(() => {
    localStorage.clear();
    root().removeAttribute("data-persona");
    root().classList.remove("dark");
    document.head.querySelectorAll("link").forEach(l => l.remove());
    vi.useFakeTimers({ toFake: ["Date"] });
  });
  afterEach(() => vi.useRealTimers());

  it("sets the day's style, pins its theme and loads its fonts", () => {
    vi.setSystemTime(new Date(2026, 9, personaDay[0], 21)); // 9pm would normally be dark
    localStorage.setItem(PERSONA_ON_KEY, "1");
    run();
    expect(root().getAttribute("data-persona")).toBe("p4");
    expect(root().classList.contains("dark")).toBe(false);
    expect(document.head.querySelector("link[rel=stylesheet]")).not.toBeNull();
  });

  it("stays off until the player turns Persona days on", () => {
    vi.setSystemTime(new Date(2026, 9, personaDay[0], 21));
    run();
    expect(root().hasAttribute("data-persona")).toBe(false);
    expect(root().classList.contains("dark")).toBe(true);
    expect(personaForToday()).toBeNull();
    expect(document.head.querySelector("link")).toBeNull();
  });

  it("leaves a normal day alone", () => {
    vi.setSystemTime(new Date(2026, 9, normalDay, 21));
    localStorage.setItem(PERSONA_ON_KEY, "1");
    root().setAttribute("data-persona", "p5");
    run();
    expect(root().hasAttribute("data-persona")).toBe(false);
    expect(root().classList.contains("dark")).toBe(true);
    expect(document.head.querySelector("link")).toBeNull();
  });

  it("ignores the dev override outside development", () => {
    vi.setSystemTime(new Date(2026, 9, normalDay, 12));
    localStorage.setItem(DEV_PERSONA_KEY, "p5");
    run();
    expect(root().hasAttribute("data-persona")).toBe(false);
    expect(personaForToday()).toBeNull();
  });

  it("follows the dev override in development, like personaForToday", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.resetModules();
    const persona = await import("@/lib/persona");
    const { themeInitScript: devScript } = await import("@/lib/theme-init");
    const runDev = () => new Function(devScript)();

    vi.setSystemTime(new Date(2026, 9, normalDay, 12));
    localStorage.setItem(DEV_PERSONA_KEY, "p5");
    runDev();
    expect(root().getAttribute("data-persona")).toBe("p5");
    expect(persona.personaForToday()).toBe("p5");
    expect(root().classList.contains("dark")).toBe(true);

    localStorage.setItem(DEV_PERSONA_KEY, "off");
    vi.setSystemTime(new Date(2026, 9, personaDay[0], 12));
    runDev();
    expect(root().hasAttribute("data-persona")).toBe(false);
    expect(persona.personaForToday()).toBeNull();
    vi.unstubAllEnvs();
  });
});
