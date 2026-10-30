// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTO_DARK_EVENT, AUTO_DARK_OFF_KEY, THEME_PICK_KEY, isAutoDarkOff, pickedTheme, rememberTheme, setAutoDarkOff } from "@/lib/auto-dark";
import { themeInitScript } from "@/lib/theme-init";

const root = () => document.documentElement;
const run = () => new Function(themeInitScript)();
// A plain Tuesday, clear of any Persona or special day's pinned theme
const at = (hour: number) => vi.setSystemTime(new Date(2026, 2, 3, hour));

beforeEach(() => {
  localStorage.clear();
  root().classList.remove("dark");
  vi.useFakeTimers({ toFake: ["Date"] });
});
afterEach(() => { vi.useRealTimers(); });

describe("auto dark mode", () => {
  it("is on by default and follows the clock", () => {
    expect(isAutoDarkOff()).toBe(false);
    at(22); run();
    expect(root().classList.contains("dark")).toBe(true);
    at(12); run();
    expect(root().classList.contains("dark")).toBe(false);
  });

  it("stays on the picked theme once turned off", () => {
    setAutoDarkOff(true, "light");
    at(22); run();
    expect(root().classList.contains("dark")).toBe(false);

    rememberTheme("dark");
    at(12); run();
    expect(root().classList.contains("dark")).toBe(true);
  });

  it("forgets the pick and tells the app when turned back on", () => {
    const heard = vi.fn();
    window.addEventListener(AUTO_DARK_EVENT, heard);
    setAutoDarkOff(true, "dark");
    expect(pickedTheme()).toBe("dark");
    setAutoDarkOff(false, "dark");
    window.removeEventListener(AUTO_DARK_EVENT, heard);

    expect(heard).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem(AUTO_DARK_OFF_KEY)).toBeNull();
    expect(localStorage.getItem(THEME_PICK_KEY)).toBeNull();
  });
});
