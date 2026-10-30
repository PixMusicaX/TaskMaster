// Auto dark mode (Account → Settings): on by default, the app goes dark from 6pm to 6am. Turned off
// on this device, it stays on the theme the player last picked, which is then remembered. A
// Persona or special day that pins a theme still wins, and the signed-out pages still follow the
// browser.
export type ThemePick = "light" | "dark";

export const AUTO_DARK_OFF_KEY = "auto_dark_off";
export const THEME_PICK_KEY = "theme_pick";
export const AUTO_DARK_EVENT = "auto-dark-changed";

export function isAutoDarkOff(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(AUTO_DARK_OFF_KEY) === "1";
  } catch {
    return false;
  }
}

export function pickedTheme(): ThemePick {
  try {
    return localStorage.getItem(THEME_PICK_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function rememberTheme(theme: ThemePick) {
  try {
    localStorage.setItem(THEME_PICK_KEY, theme);
  } catch {
    // Storage blocked: the pick just won't persist
  }
}

// `current` is the theme on screen, which is the one to stay on when the switch goes off
export function setAutoDarkOff(off: boolean, current: ThemePick) {
  try {
    if (off) {
      localStorage.setItem(AUTO_DARK_OFF_KEY, "1");
      localStorage.setItem(THEME_PICK_KEY, current);
    } else {
      localStorage.removeItem(AUTO_DARK_OFF_KEY);
      localStorage.removeItem(THEME_PICK_KEY);
    }
  } catch {
    // Storage blocked: the choice just won't persist
  }
  window.dispatchEvent(new Event(AUTO_DARK_EVENT));
}

export function subscribeAutoDark(cb: () => void) {
  window.addEventListener(AUTO_DARK_EVENT, cb);
  return () => window.removeEventListener(AUTO_DARK_EVENT, cb);
}
