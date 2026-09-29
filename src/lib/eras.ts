// Eras measure how each season compares with the one before. The rank (from level) sets the
// palette (globals.css); the era sets the material, ambient background and motion intensity.
//
// Rules: your first season starts at Era I. During a season you stand one era above that season's
// starting era while your XP is ahead of last month's pace (its XP by the same day), and drop back
// when you fall behind. Beat last month's final XP and the next season starts one era higher;
// fall short and it starts one era lower. Eras run from I to V.

export type EraId = "forge" | "steel" | "order" | "arcane" | "legend";

// Background layers, styled in app/eras.css
export type AmbientLayer = "hearth" | "mesh" | "grid" | "rays" | "aurora" | "runes" | "prism";
export type ParticleKind = "embers" | "motes" | "glyphs" | "stars";

export interface Era {
  id: EraId;
  name: string;
  numeral: string;
  // Card entrance and pointer response; spring eras overshoot slightly on entry
  motion: { entryY: number; entryScale: number; hoverLift: number; spring: boolean };
  ambient: {
    layers: AmbientLayer[];
    particles?: { kind: ParticleKind; count: number; multicolor: boolean };
  };
}

export const ERAS: Era[] = [
  {
    id: "forge", name: "Forge", numeral: "I",
    motion: { entryY: 12, entryScale: 1, hoverLift: 0, spring: false },
    ambient: { layers: ["hearth"], particles: { kind: "embers", count: 18, multicolor: false } },
  },
  {
    id: "steel", name: "Steel", numeral: "II",
    motion: { entryY: 20, entryScale: 1, hoverLift: 2, spring: false },
    ambient: { layers: ["mesh", "grid"] },
  },
  {
    id: "order", name: "Order", numeral: "III",
    motion: { entryY: 24, entryScale: 0.98, hoverLift: 3, spring: true },
    ambient: { layers: ["rays"], particles: { kind: "motes", count: 24, multicolor: false } },
  },
  {
    id: "arcane", name: "Arcane", numeral: "IV",
    motion: { entryY: 24, entryScale: 0.97, hoverLift: 4, spring: true },
    ambient: { layers: ["aurora", "runes"], particles: { kind: "glyphs", count: 26, multicolor: false } },
  },
  {
    id: "legend", name: "Legend", numeral: "V",
    motion: { entryY: 28, entryScale: 0.96, hoverLift: 5, spring: true },
    ambient: { layers: ["aurora", "prism"], particles: { kind: "stars", count: 36, multicolor: true } },
  },
];

export const MAX_ERA = ERAS.length - 1;

const clampEra = (index: number) => Math.min(MAX_ERA, Math.max(0, index));

export function eraAt(index: number): Era {
  return ERAS[clampEra(index)];
}

export function eraById(id: string | null | undefined): Era {
  return ERAS.find(e => e.id === id) ?? ERAS[0];
}

// The era you stand in right now: the season's starting era, plus one while ahead of last month's pace
export function liveEraIndex(startIndex: number, xp: number, lastMonthPaceXP: number): number {
  return clampEra(startIndex + (xp > lastMonthPaceXP ? 1 : 0));
}

export interface SeasonEras {
  start: number;
  end: number;
}

// Era at the start and end of each finished season (monthly XP, oldest first), plus where the next
// season starts. Months before the first one with any XP don't count.
export function seasonEras(monthlyXp: number[]): { seasons: SeasonEras[]; nextStart: number } {
  const seasons: SeasonEras[] = [];
  let start = 0;
  let started = false;
  monthlyXp.forEach((xp, i) => {
    if (!started && xp <= 0) {
      seasons.push({ start: 0, end: 0 });
      return;
    }
    started = true;
    const beat = xp > (i > 0 ? monthlyXp[i - 1] : 0);
    seasons.push({ start, end: clampEra(start + (beat ? 1 : 0)) });
    start = clampEra(start + (beat ? 1 : -1));
  });
  return { seasons, nextStart: start };
}
