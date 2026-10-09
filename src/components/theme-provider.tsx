"use client";

import * as React from "react";
import { MotionConfig } from "framer-motion";
import { ERAS, eraById, type Era, type EraId } from "@/lib/eras";
import { DEV_PERSONA_EVENT, PERSONA_SETTING_EVENT, PERSONA_FONTS_URL, PERSONA_FORCED_THEME, personaForToday, type PersonaStyle } from "@/lib/persona";
import { DEV_SPECIAL_EVENT, SPECIAL_FONTS_URL, SPECIAL_FORCED_THEME, SPECIAL_SETTING_EVENT, SPECIAL_SWAPS_THEME, specialForToday, type SpecialId } from "@/lib/special-days";

export type Rank = "Novice" | "Squire" | "Vanguard" | "Veteran" | "Knight" | "Champion" | "Sentinel" | "Paladin" | "Grandmaster" | "Hero";
type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  rank: Rank;
  setRank: (rank: Rank) => void;
  era: Era;
  setEra: (era: EraId) => void;
  // Today's Persona style, or null on a normal day
  persona: PersonaStyle | null;
  // This month's special-day theme, on the day itself (null otherwise)
  special: SpecialId | null;
}

const ThemeContext = React.createContext<ThemeContextType | null>(null);

export function currentPeriod() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

// <html> is the source of truth: the init script sets theme/rank before first paint,
// and the setters below write to it and notify subscribers synchronously.
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const notify = () => listeners.forEach(l => l());
const readTheme = (): Theme => (document.documentElement.classList.contains("dark") ? "dark" : "light");
const readPersona = (): PersonaStyle | null => (document.documentElement.getAttribute("data-persona") as PersonaStyle | null);
const readSpecial = (): SpecialId | null => (document.documentElement.getAttribute("data-special") as SpecialId | null);
// The signed-out pages (landing, login) follow the browser's light/dark setting instead of the
// clock: they count themselves in and out with useBrowserTheme()
let browserThemed = 0;
const THEME_SOURCE_EVENT = "tm-theme-source";
const browserDark = () => window.matchMedia("(prefers-color-scheme: dark)");

// Dark from 6pm to 6am, light otherwise (same rule as lib/theme-init.ts), unless today's Persona
// style pins a theme or the page follows the browser
const clockTheme = (): Theme => {
  const persona = readPersona();
  const special = readSpecial();
  const forced = persona ? PERSONA_FORCED_THEME[persona] : special ? SPECIAL_FORCED_THEME[special] : null;
  if (forced) return forced;
  const h = new Date().getHours();
  const dark = browserThemed > 0 ? browserDark().matches : h < 6 || h >= 18;
  // Glitch day gets it backwards on purpose
  return dark !== (special === SPECIAL_SWAPS_THEME) ? "dark" : "light";
};

// Put today's Persona style on <html> (it changes at midnight, or with the dev override);
// returns true when it changed
function syncPersona(): boolean {
  const root = document.documentElement;
  const next = personaForToday();
  if (readPersona() === next) return false;
  if (next) {
    root.setAttribute("data-persona", next);
    if (!document.querySelector(`link[href="${PERSONA_FONTS_URL}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = PERSONA_FONTS_URL;
      document.head.appendChild(link);
    }
  } else {
    root.removeAttribute("data-persona");
  }
  return true;
}
// Same for the month's special day; returns true when it changed
function syncSpecial(): boolean {
  const root = document.documentElement;
  const next = specialForToday();
  if (readSpecial() === next) return false;
  if (next) {
    root.setAttribute("data-special", next);
    if (!document.querySelector(`link[href="${SPECIAL_FONTS_URL}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = SPECIAL_FONTS_URL;
      document.head.appendChild(link);
    }
  } else {
    root.removeAttribute("data-special");
  }
  return true;
}
// The theme the app should be showing (null until the provider mounts)
let wanted: Theme | null = null;
const readRank =(): Rank => (document.documentElement.getAttribute("data-rank") as Rank | null) ?? "Novice";
const readEra = (): string => document.documentElement.getAttribute("data-era") ?? "forge";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = React.useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);
  const rank = React.useSyncExternalStore(subscribe, readRank, () => "Novice" as Rank);
  const eraId = React.useSyncExternalStore(subscribe, readEra, () => "forge");
  const persona = React.useSyncExternalStore(subscribe, readPersona, () => null);
  const special = React.useSyncExternalStore(subscribe, readSpecial, () => null);

  // The init script picks the theme on load. From then on `wanted` is the theme the app should be
  // showing: the clock's, until a manual toggle, which holds until the clock next crosses 6am/6pm.
  React.useEffect(() => {
    const root = document.documentElement;
    let last = clockTheme();
    wanted = wanted ?? last;
    const apply = () => {
      if (root.classList.contains("dark") === (wanted === "dark")) return;
      root.classList.toggle("dark", wanted === "dark");
      notify();
    };
    const sync = () => {
      // A new Persona or special day (or leaving one) drops any manual theme pick. Both are
      // checked every time: one going can let the other in.
      const specialChanged = syncSpecial();
      if (syncPersona() || specialChanged) {
        last = clockTheme();
        wanted = last;
        notify();
      }
      const now = clockTheme();
      if (now !== last) {
        last = now;
        wanted = now;
      }
      apply();
    };
    sync();
    const id = window.setInterval(sync, 60_000);
    // A phone can resume a frozen page without a visibility change, so listen for every way back
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pageshow", sync);
    window.addEventListener("focus", sync);
    window.addEventListener(DEV_PERSONA_EVENT, sync);
    window.addEventListener(PERSONA_SETTING_EVENT, sync);
    window.addEventListener(THEME_SOURCE_EVENT, sync);
    window.addEventListener(DEV_SPECIAL_EVENT, sync);
    window.addEventListener(SPECIAL_SETTING_EVENT, sync);
    // React owns <html>'s className and writes it back without "dark" whenever it re-renders the
    // root (after a hydration mismatch, for one), so put the class back if it goes missing
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => {
      window.clearInterval(id);
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pageshow", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener(DEV_PERSONA_EVENT, sync);
      window.removeEventListener(PERSONA_SETTING_EVENT, sync);
      window.removeEventListener(THEME_SOURCE_EVENT, sync);
      window.removeEventListener(DEV_SPECIAL_EVENT, sync);
      window.removeEventListener(SPECIAL_SETTING_EVENT, sync);
    };
  }, []);

  const toggleTheme = () => {
    // P4 and P5 days, and a few special days, have a single look
    if (persona && PERSONA_FORCED_THEME[persona]) return;
    if (special && SPECIAL_FORCED_THEME[special]) return;
    // No localStorage.setItem for theme - we don't want to remember it!
    wanted = theme === "light" ? "dark" : "light";
    document.documentElement.classList.toggle("dark", wanted === "dark");
    notify();
  };

  const setRank = (newRank: Rank) => {
    localStorage.setItem("rank", newRank);
    localStorage.setItem("rank_period", currentPeriod());
    document.documentElement.setAttribute("data-rank", newRank);
    document.documentElement.style.setProperty("--tm-rank-label", JSON.stringify(newRank));
    notify();
  };

  // The era comes from pace against last month (see lib/eras.ts), not from rank
  const setEra = (newEra: EraId) => {
    localStorage.setItem("era", newEra);
    localStorage.setItem("era_period", currentPeriod());
    document.documentElement.setAttribute("data-era", newEra);
    document.documentElement.style.setProperty("--tm-era-label", JSON.stringify(eraById(newEra).numeral));
    document.documentElement.style.setProperty("--tm-era-name", JSON.stringify(eraById(newEra).name));
    notify();
  };

  const era = eraById(eraId);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, rank, setRank, era, setEra, persona, special }}>
      <MotionConfig reducedMotion="user">
        {children}
      </MotionConfig>
    </ThemeContext.Provider>
  );
}

// While a component using this is mounted, the theme starts from the browser's light/dark
// setting (and follows it if it changes) rather than the time of day. The toggle still works.
export function useBrowserTheme() {
  React.useEffect(() => {
    const changed = () => window.dispatchEvent(new Event(THEME_SOURCE_EVENT));
    const query = browserDark();
    browserThemed++;
    changed();
    query.addEventListener("change", changed);
    return () => {
      browserThemed--;
      query.removeEventListener("change", changed);
      changed();
    };
  }, []);
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}

// Safe outside the provider (tests, isolated renders): defaults to the first era
export function useEra(): Era {
  return React.useContext(ThemeContext)?.era ?? ERAS[0];
}

// Safe outside the provider: null (a normal day)
export function usePersona(): PersonaStyle | null {
  return React.useContext(ThemeContext)?.persona ?? null;
}

// Safe outside the provider: null (not a special day)
export function useSpecial(): SpecialId | null {
  return React.useContext(ThemeContext)?.special ?? null;
}
