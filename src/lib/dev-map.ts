// Development-only overrides for the home page map: force its performance status and reroll
// the terrain. Stored in localStorage; every function is a no-op in production builds.
import { DEV_TOOLS_ENABLED } from "./dev-xp";

export type MapStatus = "low" | "balanced" | "peak";
export const DEV_MAP_EVENT = "dev-map-changed";
const STATUS_KEY = "tm_dev_map_status";
const REROLL_KEY = "tm_dev_map_reroll";

function read(key: string) {
  if (!DEV_TOOLS_ENABLED || typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  if (!DEV_TOOLS_ENABLED) return;
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the override just won't persist
  }
  window.dispatchEvent(new Event(DEV_MAP_EVENT));
}

// null = use the real status
export function getDevMapStatus(): MapStatus | null {
  const value = read(STATUS_KEY);
  return value === "low" || value === "balanced" || value === "peak" ? value : null;
}

export function setDevMapStatus(status: MapStatus | null) {
  write(STATUS_KEY, status);
}

// Bumped to generate a different map for the same inputs
export function getDevMapReroll(): number {
  return Number(read(REROLL_KEY)) || 0;
}

export function rerollDevMap() {
  write(REROLL_KEY, String(getDevMapReroll() + 1));
}

export function subscribeDevMap(cb: () => void) {
  window.addEventListener(DEV_MAP_EVENT, cb);
  return () => window.removeEventListener(DEV_MAP_EVENT, cb);
}
