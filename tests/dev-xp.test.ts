// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";

const profile = { xp: 3260, level: 33, levelProgress: 60, title: "Sentinel", nextLevelXP: 100 };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  localStorage.clear();
});

describe("dev XP spoofing", () => {
  it("does nothing outside development", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { withDevXp, setDevXpOffset, getDevXpOffset } = await import("@/lib/dev-xp");
    setDevXpOffset(500);
    expect(getDevXpOffset()).toBe(0);
    expect(withDevXp(profile)).toBe(profile);
  });

  it("shifts XP and recomputes level, progress and rank in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { withDevXp, setDevXpOffset } = await import("@/lib/dev-xp");
    const onChange = vi.fn();
    window.addEventListener("dev-xp-changed", onChange);

    setDevXpOffset(1250);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(withDevXp(profile)).toMatchObject({ xp: 4510, level: 46, levelProgress: 10, title: "Hero" });

    setDevXpOffset(-5000);
    expect(withDevXp(profile)).toMatchObject({ xp: 0, level: 1, levelProgress: 0, title: "Novice" });

    setDevXpOffset(0);
    expect(withDevXp(profile)).toBe(profile);
    window.removeEventListener("dev-xp-changed", onChange);
  });

  it("forces and clears an era in development only", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { getDevEraOverride, setDevEraOverride } = await import("@/lib/dev-xp");
    const onChange = vi.fn();
    window.addEventListener("dev-era-changed", onChange);

    expect(getDevEraOverride()).toBeNull();
    setDevEraOverride(3);
    expect(getDevEraOverride()).toBe(3);
    setDevEraOverride(0);
    expect(getDevEraOverride()).toBe(0);
    setDevEraOverride(null);
    expect(getDevEraOverride()).toBeNull();
    expect(onChange).toHaveBeenCalledTimes(3);
    window.removeEventListener("dev-era-changed", onChange);
  });

  it("ignores era overrides outside development", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { getDevEraOverride, setDevEraOverride } = await import("@/lib/dev-xp");
    setDevEraOverride(4);
    expect(getDevEraOverride()).toBeNull();
  });
});
