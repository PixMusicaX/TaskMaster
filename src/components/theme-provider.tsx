"use client";

import * as React from "react";

type Rank = "Novice" | "Squire" | "Vanguard" | "Veteran" | "Knight" | "Champion" | "Sentinel" | "Paladin" | "Grandmaster" | "Hero";

interface ThemeContextType {
  theme: "light" | "dark";
  toggleTheme: () => void;
  rank: Rank;
  setRank: (rank: Rank) => void;
}

const ThemeContext = React.createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  const [rank, setRankState] = React.useState<Rank>("Novice");

  React.useEffect(() => {
    const savedRank = localStorage.getItem("rank") as Rank | null;
    
    // THEME LOGIC: Always follow the clock on reload, no persistence.
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour >= 18;
    const initialTheme: "light" | "dark" = isNight ? "dark" : "light";

    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");

    // Rank still persists as it represents character progression
    if (savedRank) {
      setRankState(savedRank);
      document.documentElement.setAttribute("data-rank", savedRank);
    } else {
      document.documentElement.setAttribute("data-rank", "Novice");
    }
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
    document.documentElement.setAttribute("data-rank", newRank);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, rank, setRank }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
