// Persona days: six random days a month (two each for P3, P4 and P5) on which the whole app takes
// on that game's look, whatever the rank, era or theme. Every other day the normal design runs.
// They're opt-in: nothing changes until the player turns them on in About → Settings.
//
// The days come from a shuffle seeded by the month, so every device agrees and they never move
// once the month starts. There's always a normal day between two Persona days, and the two days
// of the same game sit at least a week apart.
//
// <html data-persona="p3|p4|p5"> carries today's style (set before first paint by lib/theme-init.ts,
// kept current by the theme provider). P3 follows the clock (blue by day, Dark Hour green by night);
// P4 is always light and P5 always dark for now.
import { DEV_TOOLS_ENABLED } from "./dev-xp";

export type PersonaStyle = "p3" | "p4" | "p5";
export const PERSONA_STYLES: PersonaStyle[] = ["p3", "p4", "p5"];

export const PERSONA_NAMES: Record<PersonaStyle, string> = {
  p3: "Persona 3",
  p4: "Persona 4",
  p5: "Persona 5",
};

// The theme a style pins, or null to follow the clock
export const PERSONA_FORCED_THEME: Record<PersonaStyle, "light" | "dark" | null> = {
  p3: null,
  p4: "light",
  p5: "dark",
};

// Google lookalikes, loaded only on Persona days; the real faces go in public/fonts/persona
// (see app/persona.css), and win when present
export const PERSONA_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Anton&family=Oswald:wght@400;500;700&family=Jost:ital,wght@0,300;0,400;0,500;0,700;1,500&family=M+PLUS+Rounded+1c:wght@500;800;900&family=Archivo+Black&family=Permanent+Marker&family=M+PLUS+1p:wght@800;900&family=Playfair+Display:wght@800;900&display=swap";

// Day of month → style for the given month (0-based). Self-contained, with no outside references:
// lib/theme-init.ts embeds its source in the <head> script.
export function pickPersonaDays(year: number, month: number): Record<number, string> {
  let seed = 2166136261;
  const key = "persona:" + year + "-" + (month + 1);
  for (let k = 0; k < key.length; k++) {
    seed ^= key.charCodeAt(k);
    seed = Math.imul(seed, 16777619) >>> 0;
  }
  // mulberry32
  const rand = function () {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const length = new Date(year, month + 1, 0).getDate();
  for (let attempt = 0; attempt < 500; attempt++) {
    const days: number[] = [];
    while (days.length < 6) {
      const d = 1 + Math.floor(rand() * length);
      if (days.indexOf(d) === -1) days.push(d);
    }
    days.sort(function (a, b) { return a - b; });
    let spaced = true;
    for (let i = 1; i < days.length; i++) if (days[i] - days[i - 1] < 2) spaced = false;
    if (!spaced) continue;
    const styles = ["p3", "p3", "p4", "p4", "p5", "p5"];
    for (let j = styles.length - 1; j > 0; j--) {
      const r = Math.floor(rand() * (j + 1));
      const tmp = styles[j]; styles[j] = styles[r]; styles[r] = tmp;
    }
    let apart = true;
    for (let a = 0; a < 6; a++) {
      for (let b = a + 1; b < 6; b++) {
        if (styles[a] === styles[b] && days[b] - days[a] < 7) apart = false;
      }
    }
    if (!apart) continue;
    const out: Record<number, string> = {};
    for (let n = 0; n < 6; n++) out[days[n]] = styles[n];
    return out;
  }
  // Unreachable in practice; an even spread keeps the rules
  return { 3: "p3", 8: "p4", 13: "p5", 18: "p3", 23: "p4", 28: "p5" };
}

export function personaDaysInMonth(year: number, month: number): Map<number, PersonaStyle> {
  const picked = pickPersonaDays(year, month);
  return new Map(Object.entries(picked).map(([day, style]) => [Number(day), style as PersonaStyle]));
}

const monthCache = new Map<string, Record<number, string>>();

// The scheduled style for a date (no dev override)
export function scheduledPersona(date: Date): PersonaStyle | null {
  const key = `${date.getFullYear()}-${date.getMonth()}`;
  let days = monthCache.get(key);
  if (!days) {
    days = pickPersonaDays(date.getFullYear(), date.getMonth());
    monthCache.set(key, days);
  }
  return (days[date.getDate()] as PersonaStyle | undefined) ?? null;
}

// ---- Dev override: force a style (or force it off) on any day ----

export const DEV_PERSONA_EVENT = "dev-persona-changed";
export const DEV_PERSONA_KEY = "tm_dev_persona";
export type DevPersonaOverride = PersonaStyle | "off" | null;

export function getDevPersonaOverride(): DevPersonaOverride {
  if (!DEV_TOOLS_ENABLED || typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(DEV_PERSONA_KEY);
    return value === "p3" || value === "p4" || value === "p5" || value === "off" ? value : null;
  } catch {
    return null;
  }
}

export function setDevPersonaOverride(value: DevPersonaOverride) {
  if (!DEV_TOOLS_ENABLED) return;
  try {
    if (value === null) localStorage.removeItem(DEV_PERSONA_KEY);
    else localStorage.setItem(DEV_PERSONA_KEY, value);
  } catch {
    // Storage blocked: the override just won't persist
  }
  window.dispatchEvent(new Event(DEV_PERSONA_EVENT));
}

// ---- The player's switch (About → Settings): Persona days are off until turned on on this device ----

export const PERSONA_ON_KEY = "persona_on";
export const PERSONA_SETTING_EVENT = "persona-setting-changed";

export function isPersonaOff(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(PERSONA_ON_KEY) !== "1";
  } catch {
    return true;
  }
}

export function setPersonaOff(off: boolean) {
  try {
    if (off) localStorage.removeItem(PERSONA_ON_KEY);
    else localStorage.setItem(PERSONA_ON_KEY, "1");
  } catch {
    // Storage blocked: the choice just won't persist
  }
  window.dispatchEvent(new Event(PERSONA_SETTING_EVENT));
}

export function subscribePersonaSetting(cb: () => void) {
  window.addEventListener(PERSONA_SETTING_EVENT, cb);
  return () => window.removeEventListener(PERSONA_SETTING_EVENT, cb);
}

// Today's style: the dev override wins, then the player's switch, then the calendar
export function personaForToday(now = new Date()): PersonaStyle | null {
  const forced = getDevPersonaOverride();
  if (forced === "off") return null;
  if (forced) return forced;
  return isPersonaOff() ? null : scheduledPersona(now);
}

// The next scheduled Persona day after today (within the coming year)
export function nextPersonaDay(now = new Date()): { date: Date; style: PersonaStyle } | null {
  for (let i = 1; i <= 366; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const style = scheduledPersona(date);
    if (style) return { date, style };
  }
  return null;
}

// The style the AI should speak in (server side). The client sends what it is showing, which
// respects the player's switch: a style, or null for a normal day. When nothing
// is sent, the calendar decides from the client's date ("yyyy-MM-dd").
export function resolvePersonaStyle(sent: unknown, today: string): PersonaStyle | null {
  if (sent === "p3" || sent === "p4" || sent === "p5") return sent;
  if (sent === null) return null;
  const [y, m, d] = today.split("-").map(Number);
  if (!y || !m || !d) return null;
  return scheduledPersona(new Date(y, m - 1, d));
}

// ---- In-game calendar flavour ----

// The time-of-day phases the games show under the date
export function personaTimeOfDay(style: PersonaStyle, now: Date, dark: boolean): string {
  const h = now.getHours();
  if (style === "p3" && dark) return h === 0 ? "Dark Hour" : h < 5 ? "Late Night" : "Evening";
  if (h < 5) return style === "p4" ? "Midnight" : "Late Night";
  if (h < 8) return "Early Morning";
  if (h < 11) return "Morning";
  if (h < 13) return "Lunchtime";
  if (h < 15) return "Afternoon";
  if (h < 18) return "After School";
  return "Evening";
}

const SYNODIC_DAYS = 29.530588853;
// A known new moon: 6 Jan 2000, 18:14 UTC
const NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14);

// Moon age in days (0 = new, ~14.77 = full), as P3's calendar tracks it
export function moonAge(now: Date): number {
  const days = (now.getTime() - NEW_MOON_MS) / 86_400_000;
  return ((days % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS;
}

// Whole days until the next full moon (0 on the night itself)
export function daysToFullMoon(now: Date): number {
  const full = SYNODIC_DAYS / 2;
  const age = moonAge(now);
  const ahead = age <= full + 0.5 ? full - age : SYNODIC_DAYS - age + full;
  return Math.max(0, Math.round(ahead));
}

// 0 = new … 4 = full … 7 = waning crescent
export function moonPhaseIndex(now: Date): number {
  return Math.round((moonAge(now) / SYNODIC_DAYS) * 8) % 8;
}

export type WeatherKind = "clear" | "cloudy" | "rain" | "snow" | "storm" | "fog";

// The relief card caches the last weather string (e.g. "Light rain") in localStorage
export function readCachedWeather(): WeatherKind {
  let text = "";
  try { text = (localStorage.getItem("tm_lastWeather") || "").toLowerCase(); } catch { /* storage blocked */ }
  if (/thunder|storm/.test(text)) return "storm";
  if (/snow|sleet|hail/.test(text)) return "snow";
  if (/rain|drizzle|shower/.test(text)) return "rain";
  if (/fog|mist|haze/.test(text)) return "fog";
  if (/cloud|overcast/.test(text)) return "cloudy";
  return "clear";
}
