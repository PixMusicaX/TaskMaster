// Ranks are grouped into eras. The rank sets the palette (globals.css); the era sets the
// material, ambient background and motion intensity. Eras reset with the monthly level.

export type EraId = "forge" | "steel" | "order" | "arcane" | "legend";

// Background layers, styled in app/eras.css
export type AmbientLayer = "hearth" | "mesh" | "grid" | "rays" | "aurora" | "runes" | "prism";
export type ParticleKind = "embers" | "motes" | "glyphs" | "stars";

export interface Era {
  id: EraId;
  name: string;
  numeral: string;
  ranks: string[];
  // Card entrance and pointer response; spring eras overshoot slightly on entry
  motion: { entryY: number; entryScale: number; hoverLift: number; spring: boolean };
  ambient: {
    layers: AmbientLayer[];
    particles?: { kind: ParticleKind; count: number; multicolor: boolean };
  };
}

export const ERAS: Era[] = [
  {
    id: "forge", name: "Forge", numeral: "I", ranks: ["Novice", "Squire"],
    motion: { entryY: 12, entryScale: 1, hoverLift: 0, spring: false },
    ambient: { layers: ["hearth"], particles: { kind: "embers", count: 18, multicolor: false } },
  },
  {
    id: "steel", name: "Steel", numeral: "II", ranks: ["Vanguard", "Veteran"],
    motion: { entryY: 20, entryScale: 1, hoverLift: 2, spring: false },
    ambient: { layers: ["mesh", "grid"] },
  },
  {
    id: "order", name: "Order", numeral: "III", ranks: ["Knight", "Champion"],
    motion: { entryY: 24, entryScale: 0.98, hoverLift: 3, spring: true },
    ambient: { layers: ["rays"], particles: { kind: "motes", count: 24, multicolor: false } },
  },
  {
    id: "arcane", name: "Arcane", numeral: "IV", ranks: ["Sentinel", "Paladin"],
    motion: { entryY: 24, entryScale: 0.97, hoverLift: 4, spring: true },
    ambient: { layers: ["aurora", "runes"], particles: { kind: "glyphs", count: 26, multicolor: false } },
  },
  {
    id: "legend", name: "Legend", numeral: "V", ranks: ["Grandmaster", "Hero"],
    motion: { entryY: 28, entryScale: 0.96, hoverLift: 5, spring: true },
    ambient: { layers: ["aurora", "prism"], particles: { kind: "stars", count: 36, multicolor: true } },
  },
];

export const RANK_TO_ERA: Record<string, EraId> = Object.fromEntries(
  ERAS.flatMap(era => era.ranks.map(rank => [rank, era.id]))
);

export function eraForRank(rank: string): Era {
  return ERAS.find(e => e.id === RANK_TO_ERA[rank]) ?? ERAS[0];
}
