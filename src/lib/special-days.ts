// Special days: one day every month on which the app takes on that month's theme. Lighter than a
// Persona day: the widgets keep their shape and only change colour, but the day gets its own
// menu, page transitions and backdrop.
//
// January, February, October and December fall on a fixed date; every other month the day is
// picked by a shuffle seeded by the month, so every device agrees and it never moves once the
// month starts. It steers clear of that month's Persona days where it can, and on the day itself
// the special theme wins over a Persona day.
//
// <html data-special="..."> carries today's theme (set before first paint by lib/theme-init.ts,
// kept current by the theme provider). On by default; the account page can switch them off.
import { DEV_TOOLS_ENABLED } from "./dev-xp";
import { getDevPersonaOverride, pickPersonaDays } from "./persona";

export const SPECIAL_IDS = ["snow", "cafe", "garden", "glitch", "sakura", "beach", "space", "maps", "library", "halloween", "leaves", "cabin"] as const;
export type SpecialId = (typeof SPECIAL_IDS)[number];

// One theme per month, January first. `labels` rename the six pages on the day's menu, in the
// order of lib/routes.ts (home, calendar, notes, habits, history, account).
export const SPECIAL_DAYS: Record<SpecialId, { month: number; name: string; tagline: string; labels: [string, string, string, string, string, string] }> = {
  snow: { month: 0, name: "First Snow", tagline: "New beginnings", labels: ["First Page", "The Year Ahead", "Resolutions", "Fresh Tracks", "Footprints", "The Lodge"] },
  cafe: { month: 1, name: "Cozy Café", tagline: "Something warm, someone dear", labels: ["The Counter", "Reservations", "Napkin Notes", "The Regulars", "Old Receipts", "Back Office"] },
  garden: { month: 2, name: "Spring Garden", tagline: "Everything is coming up", labels: ["Greenhouse", "Planting Calendar", "Field Notes", "Daily Watering", "Pressed Flowers", "Tool Shed"] },
  glitch: { month: 3, name: "Gl1tch D4y", tagline: "Nothing is wrong. Everything is fine.", labels: ["H0ME", "CAL3NDAR", "N0TES", "HAB1TS", "H1STORY", "ACC0UNT"] },
  sakura: { month: 4, name: "Sakura", tagline: "Brief, and all the better for it", labels: ["Garden Gate", "Bloom Calendar", "Haiku", "Rituals", "Fallen Petals", "Tea House"] },
  beach: { month: 5, name: "Beach Journal", tagline: "Salt, sun and nowhere to be", labels: ["The Shore", "Tide Table", "Journal", "Morning Swim", "Shells", "Beach Hut"] },
  space: { month: 6, name: "Space Exploration", tagline: "Onward and upward", labels: ["The Bridge", "Star Chart", "Captain's Log", "Routines", "Flight Record", "Crew Quarters"] },
  maps: { month: 7, name: "Adventure Maps", tagline: "Here be quests", labels: ["Base Camp", "Itinerary", "Field Journal", "Daily Trek", "Trail Log", "The Outpost"] },
  library: { month: 8, name: "The Library", tagline: "Back to the books", labels: ["Reading Room", "Timetable", "Notebook", "Homework", "The Archive", "Front Desk"] },
  halloween: { month: 9, name: "Witch's Almanac", tagline: "Something wicked this way plans", labels: ["The Coven", "Almanac", "Grimoire", "Rituals", "The Crypt", "Cauldron"] },
  leaves: { month: 10, name: "Fall Leaves", tagline: "Let it all come down gently", labels: ["The Porch", "Harvest Calendar", "Leaf Notes", "Daily Rake", "Pressed Leaves", "Woodshed"] },
  cabin: { month: 11, name: "Winter Cabin", tagline: "Fire's lit. Come in.", labels: ["Fireside", "Advent", "Letters", "Chores", "Scrapbook", "The Attic"] },
};

// The theme a special day pins, or null to follow the clock
export const SPECIAL_FORCED_THEME: Record<SpecialId, "light" | "dark" | null> = {
  snow: null, cafe: null, garden: null, glitch: null, sakura: null, beach: null,
  space: "dark", maps: null, library: null, halloween: "dark", leaves: null, cabin: null,
};

// Glitch day's prank: the app comes up dark by day and light by night (the toggle still works)
export const SPECIAL_SWAPS_THEME: SpecialId = "glitch";

// Faces for the day's menu, loaded on special days only
export const SPECIAL_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Cinzel:wght@700;900&family=Orbitron:wght@700;900&family=Fredoka:wght@500;700&display=swap";

// Day of the month that is special in the given month (0-based). `avoid` holds days to steer clear
// of (that month's Persona days). Self-contained, with no outside references: lib/theme-init.ts
// embeds its source in the <head> script.
export function pickSpecialDay(year: number, month: number, avoid: Record<number, unknown>): number {
  const fixed: Record<number, number> = { 0: 1, 1: 14, 9: 31, 11: 25 };
  if (fixed[month]) return fixed[month];
  let seed = 2166136261;
  const key = "special:" + year + "-" + (month + 1);
  for (let k = 0; k < key.length; k++) {
    seed ^= key.charCodeAt(k);
    seed = Math.imul(seed, 16777619) >>> 0;
  }
  const length = new Date(year, month + 1, 0).getDate();
  for (let attempt = 0; attempt < 60; attempt++) {
    // mulberry32
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const day = 1 + Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * length);
    if (!avoid[day]) return day;
  }
  return 15;
}

const dayCache = new Map<string, number>();

// The scheduled theme for a date (no dev override, no player switch)
export function scheduledSpecial(date: Date): SpecialId | null {
  const year = date.getFullYear();
  const month = date.getMonth();
  const key = `${year}-${month}`;
  let day = dayCache.get(key);
  if (!day) {
    day = pickSpecialDay(year, month, pickPersonaDays(year, month));
    dayCache.set(key, day);
  }
  return day === date.getDate() ? SPECIAL_IDS[month] : null;
}

// ---- Dev override: force a theme (or force it off) on any day ----

export const DEV_SPECIAL_EVENT = "dev-special-changed";
export const DEV_SPECIAL_KEY = "tm_dev_special";
export type DevSpecialOverride = SpecialId | "off" | null;

const isSpecialId = (value: unknown): value is SpecialId => (SPECIAL_IDS as readonly unknown[]).includes(value);

export function getDevSpecialOverride(): DevSpecialOverride {
  if (!DEV_TOOLS_ENABLED || typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(DEV_SPECIAL_KEY);
    return value === "off" || isSpecialId(value) ? value : null;
  } catch {
    return null;
  }
}

export function setDevSpecialOverride(value: DevSpecialOverride) {
  if (!DEV_TOOLS_ENABLED) return;
  try {
    if (value === null) localStorage.removeItem(DEV_SPECIAL_KEY);
    else localStorage.setItem(DEV_SPECIAL_KEY, value);
  } catch {
    // Storage blocked: the override just won't persist
  }
  window.dispatchEvent(new Event(DEV_SPECIAL_EVENT));
}

// ---- The player's switch (Account → Settings): special days are on until turned off on this device ----

export const SPECIAL_OFF_KEY = "special_off";
export const SPECIAL_SETTING_EVENT = "special-setting-changed";

export function isSpecialOff(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SPECIAL_OFF_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSpecialOff(off: boolean) {
  try {
    if (off) localStorage.setItem(SPECIAL_OFF_KEY, "1");
    else localStorage.removeItem(SPECIAL_OFF_KEY);
  } catch {
    // Storage blocked: the choice just won't persist
  }
  window.dispatchEvent(new Event(SPECIAL_SETTING_EVENT));
}

export function subscribeSpecialSetting(cb: () => void) {
  window.addEventListener(SPECIAL_SETTING_EVENT, cb);
  return () => window.removeEventListener(SPECIAL_SETTING_EVENT, cb);
}

// Today's theme: the dev overrides win (a forced Persona style clears the special day), then the
// player's switch, then the calendar
export function specialForToday(now = new Date()): SpecialId | null {
  const forced = getDevSpecialOverride();
  if (forced === "off") return null;
  if (forced) return forced;
  const persona = getDevPersonaOverride();
  if (persona && persona !== "off") return null;
  return isSpecialOff() ? null : scheduledSpecial(now);
}

// The next scheduled special day after today (within the coming year)
export function nextSpecialDay(now = new Date()): { date: Date; id: SpecialId } | null {
  for (let i = 1; i <= 366; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const id = scheduledSpecial(date);
    if (id) return { date, id };
  }
  return null;
}
