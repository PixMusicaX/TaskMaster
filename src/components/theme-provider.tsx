"use client";

import * as React from "react";
import { MotionConfig } from "framer-motion";

type Rank = "Novice" | "Squire" | "Vanguard" | "Veteran" | "Knight" | "Champion" | "Sentinel" | "Paladin" | "Grandmaster" | "Hero";

interface ThemeContextType {
  theme: "light" | "dark";
  toggleTheme: () => void;
  rank: Rank;
  setRank: (rank: Rank) => void;
}

const ThemeContext = React.createContext<ThemeContextType | null>(null);

function currentPeriod() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  const [rank, setRankState] = React.useState<Rank>("Novice");

  React.useEffect(() => {
    // The init script has already applied both to <html>; mirror them into state
    const root = document.documentElement;
    setTheme(root.classList.contains("dark") ? "dark" : "light");
    setRankState((root.getAttribute("data-rank") as Rank | null) ?? "Novice");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    // No localStorage.setItem for theme - we don't want to remember it!
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const setRank = (newRank: Rank) => {
    setRankState(newRank);
    localStorage.setItem("rank", newRank);
    localStorage.setItem("rank_period", currentPeriod());
    document.documentElement.setAttribute("data-rank", newRank);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, rank, setRank }}>
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
