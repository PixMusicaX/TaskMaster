"use client";

import * as React from "react";
import { MotionConfig } from "framer-motion";
import { ERAS, eraById, type Era, type EraId } from "@/lib/eras";

export type Rank = "Novice" | "Squire" | "Vanguard" | "Veteran" | "Knight" | "Champion" | "Sentinel" | "Paladin" | "Grandmaster" | "Hero";
type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  rank: Rank;
  setRank: (rank: Rank) => void;
  era: Era;
  setEra: (era: EraId) => void;
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
const readRank = (): Rank => (document.documentElement.getAttribute("data-rank") as Rank | null) ?? "Novice";
const readEra = (): string => document.documentElement.getAttribute("data-era") ?? "forge";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = React.useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);
  const rank = React.useSyncExternalStore(subscribe, readRank, () => "Novice" as Rank);
  const eraId = React.useSyncExternalStore(subscribe, readEra, () => "forge");

  const toggleTheme = () => {
    // No localStorage.setItem for theme - we don't want to remember it!
    document.documentElement.classList.toggle("dark", theme === "light");
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
    <ThemeContext.Provider value={{ theme, toggleTheme, rank, setRank, era, setEra }}>
      <MotionConfig reducedMotion="user">
        {children}
      </MotionConfig>
    </ThemeContext.Provider>
  );
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
