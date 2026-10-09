// How each special day looks beyond its palette (app/special.css): its icon, menu layout,
// page transition and backdrop. One entry per theme in lib/special-days.ts.
import { BookOpen, Coffee, Compass, Flower, Ghost, Leaf, Rocket, ScanLine, Snowflake, Sprout, TreePine, Waves, type LucideIcon } from "lucide-react";
import type { SpecialId } from "@/lib/special-days";

// Shapes the backdrop can scatter
export type DriftShape = "dot" | "flake" | "heart" | "petal" | "leaf" | "bubble" | "star" | "bat" | "pixel" | "page";

export interface Drift {
  shape: DriftShape;
  count: number;
  size: [number, number];
  // Pixels a second: down when positive, up when negative
  fall: [number, number];
  // Sideways wander (px) and turning speed (0 = none)
  sway: number;
  spin: number;
  alpha: [number, number];
  // Indexes into the palette: 0 accent, 1 second accent, 2 strong accent, 3 red, 4 muted
  colors: number[];
}

// One extra, theme-specific stroke on top of the scattered shapes
export type BackdropExtra = "waves" | "shooting" | "route" | "hearth" | "scan" | null;

// Menu: a tall list of words, the same with dotted leaders and numbers (a menu board, a contents
// page), a sheet of cards, or the pages set round a ring
export type MenuLayout = "stack" | "leaders" | "cards" | "orbit";
// Page transition: a sheet crossing, a circle closing in, a tide rising, slashes, or static
export type WipeKind = "sweep" | "iris" | "rise" | "slash" | "static";

export interface SpecialLook {
  icon: LucideIcon;
  menu: MenuLayout;
  wipe: WipeKind;
  // Soft colour behind everything, as CSS background layers built from the day's palette
  wash: string;
  drifts: Drift[];
  extra: BackdropExtra;
}

const glow = (at: string, color: string, strength: number, reach = 70) =>
  `radial-gradient(${at}, color-mix(in srgb, var(${color}) ${strength}%, transparent), transparent ${reach}%)`;

export const SPECIAL_LOOKS: Record<SpecialId, SpecialLook> = {
  snow: {
    icon: Snowflake, menu: "stack", wipe: "sweep",
    wash: [glow("70% 50% at 50% -5%", "--tm-yellow", 22), glow("60% 40% at 50% 108%", "--tm-orange-light", 16)].join(", "),
    drifts: [
      { shape: "flake", count: 22, size: [4, 9], fall: [14, 38], sway: 22, spin: 0.3, alpha: [0.25, 0.6], colors: [0, 1] },
      { shape: "dot", count: 26, size: [1, 2.4], fall: [10, 30], sway: 14, spin: 0, alpha: [0.25, 0.6], colors: [1, 4] },
    ],
    extra: null,
  },
  cafe: {
    icon: Coffee, menu: "leaders", wipe: "iris",
    wash: [glow("65% 45% at 20% 105%", "--tm-orange-light", 26), glow("50% 40% at 85% 0%", "--tm-yellow", 16)].join(", "),
    drifts: [
      { shape: "heart", count: 10, size: [5, 10], fall: [-18, -8], sway: 18, spin: 0, alpha: [0.14, 0.34], colors: [0, 3] },
      { shape: "dot", count: 14, size: [1, 2], fall: [-14, -5], sway: 10, spin: 0, alpha: [0.15, 0.4], colors: [1] },
    ],
    extra: null,
  },
  garden: {
    icon: Sprout, menu: "cards", wipe: "rise",
    wash: [glow("70% 45% at 50% 108%", "--tm-yellow", 24), glow("45% 35% at 12% 0%", "--tm-orange-light", 16)].join(", "),
    drifts: [
      { shape: "petal", count: 14, size: [4, 8], fall: [12, 26], sway: 30, spin: 0.8, alpha: [0.25, 0.55], colors: [1, 3] },
      { shape: "dot", count: 14, size: [1, 2.2], fall: [-12, -4], sway: 16, spin: 0, alpha: [0.2, 0.45], colors: [0] },
    ],
    extra: null,
  },
  glitch: {
    icon: ScanLine, menu: "stack", wipe: "static",
    wash: [glow("55% 40% at 0% 0%", "--tm-yellow", 14), glow("55% 40% at 100% 100%", "--tm-orange-light", 14)].join(", "),
    drifts: [
      { shape: "pixel", count: 12, size: [8, 46], fall: [0, 0], sway: 0, spin: 0, alpha: [0.08, 0.26], colors: [0, 1, 2] },
    ],
    extra: "scan",
  },
  sakura: {
    icon: Flower, menu: "stack", wipe: "sweep",
    wash: [glow("70% 50% at 85% -5%", "--tm-yellow", 22), glow("60% 40% at 10% 105%", "--tm-orange-light", 18)].join(", "),
    drifts: [
      { shape: "petal", count: 30, size: [4, 9], fall: [16, 40], sway: 46, spin: 1.2, alpha: [0.3, 0.65], colors: [0, 1, 3] },
    ],
    extra: null,
  },
  beach: {
    icon: Waves, menu: "cards", wipe: "rise",
    wash: [glow("90% 40% at 50% 110%", "--tm-yellow", 26), glow("45% 35% at 88% -4%", "--tm-orange-light", 26)].join(", "),
    drifts: [
      { shape: "bubble", count: 16, size: [3, 9], fall: [-26, -8], sway: 14, spin: 0, alpha: [0.2, 0.45], colors: [0] },
    ],
    extra: "waves",
  },
  space: {
    icon: Rocket, menu: "orbit", wipe: "iris",
    wash: [glow("60% 45% at 80% 10%", "--tm-orange-dark", 16), glow("70% 50% at 10% 95%", "--tm-yellow", 18)].join(", "),
    drifts: [
      { shape: "star", count: 46, size: [1.2, 3.4], fall: [0.5, 3], sway: 0, spin: 0, alpha: [0.3, 0.85], colors: [0, 1, 4] },
      { shape: "dot", count: 40, size: [0.6, 1.4], fall: [0.5, 2], sway: 0, spin: 0, alpha: [0.3, 0.7], colors: [4] },
    ],
    extra: "shooting",
  },
  maps: {
    icon: Compass, menu: "orbit", wipe: "sweep",
    wash: [glow("70% 50% at 50% 50%", "--tm-orange-light", 12, 80), glow("50% 40% at 0% 100%", "--tm-yellow", 16)].join(", "),
    drifts: [
      { shape: "dot", count: 18, size: [1, 2.2], fall: [-6, 6], sway: 26, spin: 0, alpha: [0.18, 0.4], colors: [0, 4] },
    ],
    extra: "route",
  },
  library: {
    icon: BookOpen, menu: "leaders", wipe: "sweep",
    wash: [glow("45% 60% at 50% -10%", "--tm-orange-light", 26), glow("60% 40% at 50% 110%", "--tm-yellow", 12)].join(", "),
    drifts: [
      { shape: "dot", count: 30, size: [0.8, 2], fall: [-9, -2], sway: 18, spin: 0, alpha: [0.2, 0.5], colors: [1] },
      { shape: "page", count: 5, size: [10, 16], fall: [8, 16], sway: 30, spin: 0.5, alpha: [0.12, 0.26], colors: [4] },
    ],
    extra: null,
  },
  halloween: {
    icon: Ghost, menu: "stack", wipe: "slash",
    wash: [glow("70% 45% at 50% 108%", "--tm-orange-light", 30), glow("40% 35% at 85% 8%", "--tm-yellow", 16)].join(", "),
    drifts: [
      { shape: "bat", count: 7, size: [7, 13], fall: [-6, 6], sway: 0, spin: 0, alpha: [0.3, 0.6], colors: [1, 4] },
      { shape: "dot", count: 18, size: [1, 2.4], fall: [-22, -6], sway: 14, spin: 0, alpha: [0.25, 0.6], colors: [0, 3] },
    ],
    extra: null,
  },
  leaves: {
    icon: Leaf, menu: "cards", wipe: "slash",
    wash: [glow("70% 50% at 15% -5%", "--tm-orange-light", 24), glow("65% 45% at 85% 105%", "--tm-yellow", 20)].join(", "),
    drifts: [
      { shape: "leaf", count: 22, size: [6, 12], fall: [18, 44], sway: 50, spin: 1, alpha: [0.3, 0.65], colors: [0, 1, 2, 3] },
    ],
    extra: null,
  },
  cabin: {
    icon: TreePine, menu: "leaders", wipe: "iris",
    wash: [glow("75% 50% at 50% 110%", "--tm-yellow", 30), glow("60% 40% at 50% -8%", "--tm-orange-light", 14)].join(", "),
    drifts: [
      { shape: "flake", count: 16, size: [3, 7], fall: [12, 30], sway: 18, spin: 0.3, alpha: [0.2, 0.5], colors: [4] },
      { shape: "dot", count: 12, size: [1, 2.2], fall: [-34, -12], sway: 12, spin: 0, alpha: [0.3, 0.7], colors: [0, 3] },
    ],
    extra: "hearth",
  },
};
