// Development-only XP spoofing, for trying out level-up, rank-up and overflow animations
// without touching the database. The offset lives in localStorage and is added on the client
// to whatever XP the server reports. In production builds every function is a no-op.
import { LEVEL_UP_XP } from "./constants";
import { rankForLevel } from "./progress";

export const DEV_TOOLS_ENABLED = process.env.NODE_ENV === "development";
export const DEV_XP_EVENT = "dev-xp-changed";
const KEY = "tm_dev_xp_offset";

export function getDevXpOffset(): number {
  if (!DEV_TOOLS_ENABLED || typeof window === "undefined") return 0;
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

export function setDevXpOffset(offset: number) {
  if (!DEV_TOOLS_ENABLED) return;
  try {
    if (offset === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, String(offset));
  } catch {
    // Storage blocked: spoofing just won't persist
  }
  window.dispatchEvent(new Event(DEV_XP_EVENT));
}

// Forced era index (0 = I … 4 = V), or null to follow the real pace rules
export const DEV_ERA_EVENT = "dev-era-changed";
const ERA_KEY = "tm_dev_era";

export function getDevEraOverride(): number | null {
  if (!DEV_TOOLS_ENABLED || typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(ERA_KEY);
    return value === null ? null : Number(value);
  } catch {
    return null;
  }
}

export function setDevEraOverride(index: number | null) {
  if (!DEV_TOOLS_ENABLED) return;
  try {
    if (index === null) localStorage.removeItem(ERA_KEY);
    else localStorage.setItem(ERA_KEY, String(index));
  } catch {
    // Storage blocked: the override just won't persist
  }
  window.dispatchEvent(new Event(DEV_ERA_EVENT));
}

// The profile as it would look with the offset applied (level, progress and title follow the XP)
export function withDevXp<T extends { xp: number; level: number; levelProgress: number; title: string }>(profile: T): T {
  const offset = getDevXpOffset();
  if (offset === 0) return profile;
  const xp = Math.max(0, profile.xp + offset);
  const level = Math.floor(xp / LEVEL_UP_XP) + 1;
  return { ...profile, xp, level, levelProgress: xp % LEVEL_UP_XP, title: rankForLevel(level) };
}
