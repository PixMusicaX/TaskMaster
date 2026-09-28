import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { RPG_TITLES } from "@/lib/constants";

// Every rank's text colours must stay readable against the page in both themes.
const css = readFileSync(path.resolve(import.meta.dirname, "../src/app/globals.css"), "utf-8");
const LIGHT_BG = "#FFFFFF";
const DARK_BG = "#0F0912";
const TARGETS: Record<string, number> = {
  "tm-yellow": 3,
  "tm-orange-light": 3,
  "tm-orange-dark": 3,
  "tm-blue-gray": 4.5,
};

function vars(selector: RegExp): Record<string, string> {
  const body = css.match(selector)?.[1] ?? "";
  return Object.fromEntries([...body.matchAll(/--(tm-[\w-]+):\s*(#[0-9A-Fa-f]{6})/g)].map(m => [m[1], m[2]]));
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("rank palettes", () => {
  for (const { title } of RPG_TITLES) {
    const light = title === "Novice"
      ? vars(/:root,\s*:root\[data-rank="Novice"\]\s*\{([^}]*)\}/)
      : vars(new RegExp(`:root\\[data-rank="${title}"\\]\\s*\\{([^}]*)\\}`));
    const dark = { ...light, ...vars(new RegExp(`\\.dark\\[data-rank="${title}"\\]\\s*\\{([^}]*)\\}`)) };

    it(`${title} ink stays readable on accent surfaces`, () => {
      const override = (sel: string) => css.match(new RegExp(`${sel}\\s*\\{\\s*--tm-on-accent:\\s*(#[0-9A-Fa-f]{6})`))?.[1];
      const lightInk = override(`:root\\[data-rank="${title}"\\]:not\\(\\.dark\\)`) ?? light["tm-purple-dark"];
      const darkInk = override(`\\.dark\\[data-rank="${title}"\\]`) ?? dark["tm-purple-dark"];
      expect(contrast(lightInk, light["tm-yellow"]), `${title} light ink`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(darkInk, dark["tm-yellow"]), `${title} dark ink`).toBeGreaterThanOrEqual(4.5);
    });

    it(`${title} text colours are readable in light and dark mode`, () => {
      for (const [name, min] of Object.entries(TARGETS)) {
        expect(light[name], `${title} light --${name}`).toBeDefined();
        expect(contrast(light[name], LIGHT_BG), `${title} light --${name}`).toBeGreaterThanOrEqual(min);
        expect(contrast(dark[name], DARK_BG), `${title} dark --${name}`).toBeGreaterThanOrEqual(min);
      }
    });
  }
});
