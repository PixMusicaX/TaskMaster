"use client";

import { useEffect } from "react";
import { useTheme } from "@/components/theme-provider";

const USER_KEY = "tm_user";
// What this browser remembers about one player's season (device settings such as sounds,
// Persona days and the last known location are left alone)
const PER_USER_KEYS = ["rank", "rank_period", "rank_manually_set", "era", "era_period", "season_seen"];
const PER_USER_PREFIXES = ["recap_", "calendarific_sync_"];

export function clearAccountStorage() {
  try {
    PER_USER_KEYS.forEach(key => localStorage.removeItem(key));
    Object.keys(localStorage)
      .filter(key => PER_USER_PREFIXES.some(prefix => key.startsWith(prefix)))
      .forEach(key => localStorage.removeItem(key));
  } catch {
    // Storage blocked: nothing was remembered in the first place
  }
}

// When a different account signs in on this browser, drop the previous player's remembered rank,
// era and season flags so the new one starts from their own
export default function AccountScope({ userId }: { userId: string }) {
  const { setRank, setEra } = useTheme();

  useEffect(() => {
    let previous: string | null = null;
    try {
      previous = localStorage.getItem(USER_KEY);
      localStorage.setItem(USER_KEY, userId);
    } catch {
      return;
    }
    if (!previous || previous === userId) return;
    clearAccountStorage();
    // Back to the starting look until this player's own profile loads
    setRank("Novice");
    setEra("forge");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the setters are recreated every render
  }, [userId]);

  return null;
}
