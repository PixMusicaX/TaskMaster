// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import {
  SPECIAL_DAYS, SPECIAL_IDS, SPECIAL_OFF_KEY, nextSpecialDay, pickSpecialDay, scheduledSpecial, specialForToday,
} from "@/lib/special-days";
import { PERSONA_ON_KEY, personaDaysInMonth, personaForToday, pickPersonaDays } from "@/lib/persona";
import { themeInitScript } from "@/lib/theme-init";
import { SPECIAL_LOOKS } from "@/components/special/special-themes";
import SpecialMenu from "@/components/special/special-menu";
import { SpecialDayBadge } from "@/components/special/special-day-badge";
import { ThemeProvider } from "@/components/theme-provider";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/home" }));
vi.mock("@/components/progress/progress-provider", () => ({ useProgress: () => ({ profile: { level: 7 }, pulse: 0 }) }));

// Every month from 2024 to 2033
const MONTHS = Array.from({ length: 120 }, (_, i) => ({ year: 2024 + Math.floor(i / 12), month: i % 12 }));
const specialDayOf = (year: number, month: number) => pickSpecialDay(year, month, pickPersonaDays(year, month));

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("special days", () => {
  it("has one theme for every month, with a look for each", () => {
    expect(SPECIAL_IDS.map(id => SPECIAL_DAYS[id].month)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    for (const id of SPECIAL_IDS) {
      expect(SPECIAL_DAYS[id].labels).toHaveLength(6);
      expect(SPECIAL_LOOKS[id].drifts.length).toBeGreaterThan(0);
    }
  });

  it("keeps January, February, October and December on their dates", () => {
    for (const year of [2025, 2026, 2030]) {
      expect(specialDayOf(year, 0)).toBe(1);
      expect(specialDayOf(year, 1)).toBe(14);
      expect(specialDayOf(year, 9)).toBe(31);
      expect(specialDayOf(year, 11)).toBe(25);
    }
  });

  it("picks one real day in every other month, the same each time, away from that month's Persona days", () => {
    const seen = new Set<number>();
    for (const { year, month } of MONTHS) {
      const day = specialDayOf(year, month);
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(new Date(year, month + 1, 0).getDate());
      expect(specialDayOf(year, month)).toBe(day);
      if (![0, 1, 9, 11].includes(month)) {
        expect(personaDaysInMonth(year, month).has(day)).toBe(false);
        seen.add(day);
      }
    }
    // Spread through the month rather than stuck on a few dates
    expect(seen.size).toBeGreaterThan(15);
  });

  it("looks a date up, and finds the next one", () => {
    expect(scheduledSpecial(new Date(2026, 9, 31, 15))).toBe("halloween");
    expect(scheduledSpecial(new Date(2026, 9, 30))).toBeNull();
    expect(scheduledSpecial(new Date(2026, 11, 25))).toBe("cabin");
    const next = nextSpecialDay(new Date(2026, 9, 9))!;
    expect(next.id).toBe("halloween");
    expect(next.date.getDate()).toBe(31);
  });

  it("is on unless the player turns it off", () => {
    vi.setSystemTime(new Date(2026, 9, 31, 12));
    expect(specialForToday()).toBe("halloween");
    localStorage.setItem(SPECIAL_OFF_KEY, "1");
    expect(specialForToday()).toBeNull();
  });

  it("takes the day from a Persona day that lands on it", () => {
    // Find a fixed-date special day that is also a Persona day somewhere in ten years
    const clash = MONTHS.flatMap(({ year, month }) => {
      const day = { 0: 1, 1: 14, 9: 31, 11: 25 }[month];
      return day && personaDaysInMonth(year, month).has(day) ? [new Date(year, month, day, 12)] : [];
    })[0];
    expect(clash).toBeDefined();

    localStorage.setItem(PERSONA_ON_KEY, "1");
    vi.setSystemTime(clash);
    expect(specialForToday()).not.toBeNull();
    expect(personaForToday()).toBeNull();
    // With special days off, the Persona day is back
    localStorage.setItem(SPECIAL_OFF_KEY, "1");
    expect(personaForToday()).not.toBeNull();
  });
});

describe("special days in the init script", () => {
  const root = () => document.documentElement;
  const run = () => new Function(themeInitScript)();

  beforeEach(() => {
    root().removeAttribute("data-special");
    root().removeAttribute("data-persona");
    root().classList.remove("dark");
    document.head.querySelectorAll("link").forEach(l => l.remove());
  });

  it("sets the day's theme before first paint, pins its light or dark, and loads its fonts", () => {
    vi.setSystemTime(new Date(2026, 9, 31, 10)); // 10am would normally be light
    run();
    expect(root().getAttribute("data-special")).toBe("halloween");
    expect(root().classList.contains("dark")).toBe(true);
    expect(document.head.querySelector("link[rel=stylesheet]")).not.toBeNull();
  });

  it("leaves ordinary days, and switched-off devices, alone", () => {
    vi.setSystemTime(new Date(2026, 9, 30, 10));
    run();
    expect(root().hasAttribute("data-special")).toBe(false);

    vi.setSystemTime(new Date(2026, 9, 31, 10));
    localStorage.setItem(SPECIAL_OFF_KEY, "1");
    run();
    expect(root().hasAttribute("data-special")).toBe(false);
    expect(root().classList.contains("dark")).toBe(false);
  });

  it("gets light and dark backwards on Glitch day, as a prank", () => {
    const day = specialDayOf(2027, 3);
    vi.setSystemTime(new Date(2027, 3, day, 10)); // mid-morning: normally light
    run();
    expect(root().getAttribute("data-special")).toBe("glitch");
    expect(root().classList.contains("dark")).toBe(true);

    vi.setSystemTime(new Date(2027, 3, day, 21)); // evening: normally dark
    run();
    expect(root().classList.contains("dark")).toBe(false);

    // The day after, things are the right way round again
    vi.setSystemTime(new Date(2027, 3, day + 1 > 30 ? day - 1 : day + 1, 10));
    run();
    expect(root().classList.contains("dark")).toBe(false);
  });

  it("agrees with the app about which day it is, all year", () => {
    for (let month = 0; month < 12; month++) {
      const day = specialDayOf(2027, month);
      vi.setSystemTime(new Date(2027, month, day, 12));
      run();
      expect(root().getAttribute("data-special")).toBe(SPECIAL_IDS[month]);
      expect(specialForToday()).toBe(SPECIAL_IDS[month]);
    }
  });
});

describe("the day's menu and sticker", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each(SPECIAL_IDS.map(id => [id]))("%s: shows the six pages under the theme's own names", (id) => {
    const { container } = render(<ThemeProvider><SpecialMenu id={id} open onClose={() => {}} /></ThemeProvider>);
    expect(container.textContent).toContain(SPECIAL_DAYS[id].name);
    const links = Array.from(container.querySelectorAll("nav a"));
    expect(links.map(a => a.getAttribute("href"))).toEqual(["/home", "/calendar", "/notes", "/habits", "/history", "/account"]);
    // The page you are on is marked
    expect(links[0].getAttribute("aria-current")).toBe("page");
    for (const label of SPECIAL_DAYS[id].labels) {
      const shown = container.textContent?.includes(label) || links.some(a => a.getAttribute("aria-label") === label);
      expect(shown, label).toBe(true);
    }
  });

  it("has a calendar sticker for every theme", () => {
    for (const id of SPECIAL_IDS) {
      const { container } = render(<SpecialDayBadge id={id} />);
      expect(container.querySelector(`[title="${SPECIAL_DAYS[id].name} day"] svg`)).not.toBeNull();
    }
  });
});
