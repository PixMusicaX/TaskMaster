import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { RPG_TITLES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useTheme } from "./theme-provider";

// ─── Types ────────────────────────────────────────────────────────────────────
type BiomeKey =
  | "temperate" | "tropical" | "arctic" | "desert" | "swamp"
  | "volcanic" | "alpine" | "savanna" | "tundra" | "mushroom"
  | "deadlands" | "coastal" | "hero";

interface MapParams {
  seed: number;
  waterLevel: number;
  volcanos: number;
  cities: number;
  rivers: number;
  forestDensity: number;
  mapSize: "small" | "medium" | "large";
  biome: BiomeKey;
}

interface Point { x: number; y: number }
interface City { x: number; y: number; name: string; size: "village" | "town" | "city" }
interface Volcano { x: number; y: number; radius: number; active: boolean }

// ─── Seeded RNG ───────────────────────────────────────────────────────────────
function makePRNG(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 0xffffffff; };
}

// ─── Noise ────────────────────────────────────────────────────────────────────
function smoothstep(t: number) { return t * t * (3 - 2 * t); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function valueNoise(rng: () => number, w: number, h: number, scale: number): Float32Array {
  const gw = Math.ceil(w / scale) + 2, gh = Math.ceil(h / scale) + 2;
  const grid = new Float32Array(gw * gh);
  for (let i = 0; i < grid.length; i++) grid[i] = rng();
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const gx = x / scale, gy = y / scale;
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    const tx = smoothstep(gx - x0), ty = smoothstep(gy - y0);
    const v00 = grid[y0 * gw + x0], v10 = grid[y0 * gw + x0 + 1];
    const v01 = grid[(y0 + 1) * gw + x0], v11 = grid[(y0 + 1) * gw + x0 + 1];
    out[y * w + x] = lerp(lerp(v00, v10, tx), lerp(v01, v11, tx), ty);
  }
  return out;
}

function fbm(rng: () => number, w: number, h: number, octaves: number): Float32Array {
  const out = new Float32Array(w * h);
  let amp = 1, scale = w / 3, total = 0;
  for (let o = 0; o < octaves; o++) {
    const layer = valueNoise(rng, w, h, scale);
    for (let i = 0; i < out.length; i++) out[i] += layer[i] * amp;
    total += amp; amp *= 0.5; scale *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

// ─── Biome definitions ────────────────────────────────────────────────────────
interface BiomePalette {
  label: string; icon: string; desc: string;
  deepWater: number[]; shallowWater: number[]; shore: number[];
  lowland: number[]; midland: number[]; highland: number[]; peak: number[];
  volcano: number[]; volcanoGlow: number[];
  road: number[]; cityColor: number[]; forestColor: number[]; riverColor: number[];
  snowTint?: number[];
  lavaTint?: number[];
  sandDune?: number[];
  ashTint?: number[];
  glowTint?: number[];
  sporeTint?: number[];
  rainbowEffect?: boolean;
}

const BIOMES: Record<BiomeKey, BiomePalette> = {
  temperate: {
    label: "Temperate", icon: "🌿", desc: "Rolling green hills & forests",
    deepWater: [45, 90, 130], shallowWater: [70, 140, 175], shore: [200, 195, 155],
    lowland: [130, 160, 80], midland: [100, 135, 60], highland: [140, 125, 90], peak: [220, 215, 210],
    volcano: [90, 30, 10], volcanoGlow: [220, 80, 20],
    road: [195, 175, 130], cityColor: [220, 200, 160], forestColor: [60, 100, 40], riverColor: [80, 150, 190],
  },
  tropical: {
    label: "Tropical", icon: "🌴", desc: "Lush jungle, turquoise seas",
    deepWater: [20, 90, 140], shallowWater: [40, 170, 190], shore: [235, 225, 175],
    lowland: [60, 155, 60], midland: [40, 130, 45], highland: [90, 140, 70], peak: [210, 200, 190],
    volcano: [100, 30, 10], volcanoGlow: [230, 90, 20],
    road: [200, 180, 120], cityColor: [230, 210, 155], forestColor: [20, 100, 30], riverColor: [40, 140, 180],
  },
  arctic: {
    label: "Arctic", icon: "🧊", desc: "Frozen wastes & glacial seas",
    deepWater: [30, 60, 110], shallowWater: [80, 140, 185], shore: [220, 225, 235],
    lowland: [195, 210, 220], midland: [180, 200, 215], highland: [210, 218, 230], peak: [245, 248, 255],
    volcano: [110, 35, 10], volcanoGlow: [220, 85, 15],
    road: [180, 185, 195], cityColor: [210, 215, 225], forestColor: [90, 110, 90], riverColor: [120, 175, 215],
    snowTint: [235, 245, 255],
  },
  desert: {
    label: "Desert", icon: "🏜️", desc: "Scorched dunes & sandstone mesas",
    deepWater: [50, 100, 160], shallowWater: [80, 155, 185], shore: [220, 210, 165],
    lowland: [200, 185, 130], midland: [185, 165, 105], highland: [175, 148, 90], peak: [215, 200, 175],
    volcano: [120, 45, 10], volcanoGlow: [235, 100, 25],
    road: [195, 178, 130], cityColor: [215, 200, 155], forestColor: [120, 140, 60], riverColor: [90, 155, 190],
    sandDune: [210, 190, 140],
  },
  swamp: {
    label: "Swamp", icon: "🐊", desc: "Murky bogs & rotting mangroves",
    deepWater: [35, 75, 90], shallowWater: [55, 115, 110], shore: [130, 145, 110],
    lowland: [80, 110, 65], midland: [65, 95, 55], highland: [100, 120, 75], peak: [175, 180, 165],
    volcano: [85, 30, 10], volcanoGlow: [200, 75, 20],
    road: [165, 155, 115], cityColor: [190, 180, 140], forestColor: [40, 75, 35], riverColor: [60, 110, 105],
  },
  volcanic: {
    label: "Volcanic", icon: "🌋", desc: "Obsidian fields & active lava flows",
    deepWater: [25, 35, 60], shallowWater: [50, 70, 100], shore: [80, 70, 65],
    lowland: [70, 60, 55], midland: [90, 75, 65], highland: [60, 50, 50], peak: [110, 90, 80],
    volcano: [110, 25, 5], volcanoGlow: [240, 100, 15],
    road: [120, 100, 80], cityColor: [160, 140, 110], forestColor: [60, 80, 40], riverColor: [90, 110, 140],
    lavaTint: [200, 60, 10],
  },
  alpine: {
    label: "Alpine", icon: "⛰️", desc: "Jagged peaks & mountain passes",
    deepWater: [40, 75, 120], shallowWater: [65, 125, 165], shore: [185, 180, 165],
    lowland: [110, 130, 90], midland: [120, 130, 100], highland: [160, 155, 140], peak: [240, 242, 248],
    volcano: [95, 30, 10], volcanoGlow: [210, 75, 20],
    road: [180, 168, 145], cityColor: [205, 195, 170], forestColor: [55, 90, 45], riverColor: [80, 145, 185],
    snowTint: [232, 238, 248],
  },
  savanna: {
    label: "Savanna", icon: "🦁", desc: "Golden plains & scattered acacia",
    deepWater: [45, 90, 145], shallowWater: [70, 145, 175], shore: [215, 205, 160],
    lowland: [185, 175, 110], midland: [165, 155, 85], highland: [155, 138, 80], peak: [200, 190, 165],
    volcano: [115, 40, 10], volcanoGlow: [230, 95, 20],
    road: [190, 172, 120], cityColor: [210, 195, 145], forestColor: [130, 140, 50], riverColor: [85, 148, 180],
    sandDune: [200, 180, 110],
  },
  tundra: {
    label: "Tundra", icon: "🌨️", desc: "Permafrost plains & cold bogs",
    deepWater: [35, 65, 105], shallowWater: [70, 130, 168], shore: [190, 195, 185],
    lowland: [155, 165, 145], midland: [135, 148, 130], highland: [175, 180, 168], peak: [225, 228, 230],
    volcano: [100, 32, 10], volcanoGlow: [215, 82, 18],
    road: [170, 165, 148], cityColor: [195, 190, 175], forestColor: [80, 100, 70], riverColor: [90, 148, 188],
    snowTint: [220, 225, 225],
  },
  mushroom: {
    label: "Mushroom", icon: "🍄", desc: "Bioluminescent spore forests",
    deepWater: [40, 30, 80], shallowWater: [70, 55, 130], shore: [160, 140, 180],
    lowland: [100, 70, 130], midland: [120, 55, 145], highland: [85, 55, 110], peak: [185, 160, 200],
    volcano: [90, 25, 60], volcanoGlow: [200, 50, 150],
    road: [140, 120, 160], cityColor: [180, 150, 210], forestColor: [120, 40, 180], riverColor: [100, 150, 220],
    sporeTint: [180, 100, 255],
  },
  hero: {
    label: "Heroic", icon: "🌈", desc: "The Radiant Rainbow Realm",
    deepWater: [40, 60, 150], shallowWater: [80, 120, 220], shore: [255, 230, 150],
    lowland: [100, 255, 180], midland: [150, 150, 255], highland: [255, 150, 200], peak: [255, 255, 255],
    volcano: [255, 100, 100], volcanoGlow: [255, 255, 100],
    road: [255, 255, 255], cityColor: [255, 255, 200], forestColor: [150, 255, 100], riverColor: [100, 255, 255],
    rainbowEffect: true,
  },
  deadlands: {
    label: "Deadlands", icon: "💀", desc: "Ashen wastes & bone-dry crags",
    deepWater: [50, 50, 60], shallowWater: [75, 80, 90], shore: [145, 138, 125],
    lowland: [135, 128, 115], midland: [120, 115, 102], highland: [145, 135, 120], peak: [190, 185, 178],
    volcano: [100, 28, 8], volcanoGlow: [215, 78, 12],
    road: [160, 148, 128], cityColor: [175, 162, 140], forestColor: [90, 88, 65], riverColor: [90, 100, 115],
    ashTint: [160, 155, 148],
  },
  coastal: {
    label: "Coastal", icon: "⚓", desc: "Archipelago, sea-cliffs & harbours",
    deepWater: [30, 80, 140], shallowWater: [55, 155, 195], shore: [225, 218, 185],
    lowland: [135, 162, 90], midland: [110, 142, 72], highland: [148, 132, 100], peak: [215, 210, 205],
    volcano: [88, 28, 10], volcanoGlow: [215, 80, 20],
    road: [192, 172, 130], cityColor: [218, 200, 162], forestColor: [62, 105, 42], riverColor: [70, 148, 192],
  },
};

// ─── City name tables ─────────────────────────────────────────────────────────
const PREFIXES = ["Ald", "Ash", "Black", "Bone", "Bright", "Crag", "Dark", "Dun", "Ember", "Far",
  "Frost", "Gold", "Grey", "High", "Iron", "Keep", "Lake", "Loch", "Moon", "Moor", "North", "Old",
  "Pine", "Red", "Salt", "Silver", "Skull", "Stone", "Storm", "Sword", "Thunder", "Twin", "White", "Wind", "Wood"];
const SUFFIXES = ["burg", "crest", "dale", "deep", "fen", "ford", "gate", "haven", "holm", "keep",
  "moor", "mouth", "reach", "ridge", "shire", "spire", "stead", "ton", "vale", "ward", "watch", "well", "wick"];
function cityName(rng: () => number) {
  return PREFIXES[Math.floor(rng() * PREFIXES.length)] + SUFFIXES[Math.floor(rng() * SUFFIXES.length)];
}

function rainbow(t: number): number[] {
  const r = Math.sin(t * 6.28 + 0) * 127 + 128;
  const g = Math.sin(t * 6.28 + 2.09) * 127 + 128;
  const b = Math.sin(t * 6.28 + 4.18) * 127 + 128;
  return [r, g, b];
}

// ─── Terrain colour ───────────────────────────────────────────────────────────
function terrainColor(v: number, wl: number, pal: BiomePalette): number[] {
  if (v < wl - 0.1) return pal.deepWater;
  if (v < wl) return pal.shallowWater;
  if (v < wl + 0.02) return pal.shore;
  if (v < wl + 0.15) return pal.lowland;
  if (v < wl + 0.30) return pal.midland;
  if (v < wl + 0.45) return pal.highland;
  return pal.peak;
}

// ─── Pixel pass ───────────────────────────────────────────────────────────────
function generateMap(params: MapParams, W: number, H: number, h: Float32Array): ImageData {
  const pal = BIOMES[params.biome];
  const wl = params.waterLevel;
  const img = new ImageData(W, H);

  const setPixel = (x: number, y: number, r: number, g: number, b: number) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4; img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
  };
  const blendPixel = (x: number, y: number, r: number, g: number, b: number, a: number) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    img.data[i] = img.data[i] * (1 - a) + r * a;
    img.data[i + 1] = img.data[i + 1] * (1 - a) + g * a;
    img.data[i + 2] = img.data[i + 2] * (1 - a) + b * a;
    img.data[i + 3] = 255;
  };

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const [r, g, b] = terrainColor(h[y * W + x], wl, pal); setPixel(x, y, r, g, b);
  }

  // Hillshade
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (h[y * W + x] > wl) {
      const dx = h[y * W + x + 1] - h[y * W + x - 1], dy = h[(y + 1) * W + x] - h[(y - 1) * W + x];
      const shade = Math.max(0, Math.min(1, 0.5 + dx * 4 - dy * 2));
      const i = (y * W + x) * 4;
      img.data[i] = Math.min(255, img.data[i] * (0.45 + shade * 0.75));
      img.data[i + 1] = Math.min(255, img.data[i + 1] * (0.45 + shade * 0.75));
      img.data[i + 2] = Math.min(255, img.data[i + 2] * (0.45 + shade * 0.75));
    }
  }

  // Shoreline haze
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (h[y * W + x] > wl) {
      let near = false;
      for (let dy = -3; dy <= 3 && !near; dy++) for (let dx = -3; dx <= 3 && !near; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < W && ny < H && h[ny * W + nx] < wl) near = true;
      }
      if (near) { const [r, g, b] = pal.shallowWater; blendPixel(x, y, r, g, b, 0.15); }
    }
  }

  // Snow cap
  if (pal.snowTint) {
    const [sr, sg, sb] = pal.snowTint;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = h[y * W + x];
      if (v > wl + 0.38) blendPixel(x, y, sr, sg, sb, Math.min(1, (v - wl - 0.38) * 5) * 0.85);
    }
  }

  // Rainbow haze (Hero rank exclusive)
  if (pal.rainbowEffect) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const hv = h[y * W + x];
      if (hv > wl) {
        const [rr, rg, rb] = rainbow(x / W * 0.5 + y / H * 0.5 + hv * 0.2);
        blendPixel(x, y, rr, rg, rb, 0.12);
      }
    }
  }

  // Lava cracks
  if (pal.lavaTint) {
    const lf = valueNoise(makePRNG(params.seed + 111), W, H, 20);
    const [lr, lg, lb] = pal.lavaTint;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = h[y * W + x];
      if (v > wl + 0.02 && v < wl + 0.4 && lf[y * W + x] > 0.85) blendPixel(x, y, lr, lg, lb, 0.6);
    }
  }

  // Ash
  if (pal.ashTint) {
    const af = valueNoise(makePRNG(params.seed + 222), W, H, 50);
    const [ar, ag, ab] = pal.ashTint;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (h[y * W + x] > wl + 0.02 && af[y * W + x] > 0.6) blendPixel(x, y, ar, ag, ab, 0.25);
    }
  }

  // Bioluminescence
  if (pal.glowTint) {
    const gf = valueNoise(makePRNG(params.seed + 333), W, H, 30);
    const [gr, gg, gb] = pal.glowTint;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (h[y * W + x] > wl + 0.03 && gf[y * W + x] > 0.72) blendPixel(x, y, gr, gg, gb, 0.3);
    }
  }

  // Dune ripples
  if (pal.sandDune) {
    const df = valueNoise(makePRNG(params.seed + 444), W, H, 25);
    const [dr, dg, db] = pal.sandDune;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = h[y * W + x];
      if (v > wl + 0.02 && v < wl + 0.35 && Math.sin(df[y * W + x] * 30) * 0.5 + 0.5 > 0.6) blendPixel(x, y, dr, dg, db, 0.2);
    }
  }

  // Forest wash
  const ff = valueNoise(makePRNG(params.seed + 555), W, H, 40);
  const thresh = 1 - params.forestDensity * 0.5;
  const [frr, frg, frb] = pal.forestColor;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = h[y * W + x];
    if (v > wl + 0.04 && v < wl + 0.42 && ff[y * W + x] > thresh) blendPixel(x, y, frr, frg, frb, 0.3);
  }

  return img;
}

// ─── Overlay ──────────────────────────────────────────────────────────────────
function drawOverlay(ctx: CanvasRenderingContext2D, params: MapParams, W: number, H: number, h: Float32Array, playerProgress?: number) {
  const wl = params.waterLevel;
  const pal = BIOMES[params.biome];
  const rng = makePRNG(params.seed + 99999);

  const land: Point[] = [];
  for (let y = 10; y < H - 10; y += 4) for (let x = 10; x < W - 10; x += 4)
    if (h[y * W + x] > wl + 0.04) land.push({ x, y });
  const pool = [...land];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1));[pool[i], pool[j]] = [pool[j], pool[i]]; }

  // ── Volcanos ──────────────────────────────────────────────────────────────
  const volcanos: Volcano[] = [];
  const vCount = params.biome === "volcanic" ? params.volcanos + 2 : params.volcanos;
  for (let v = 0, pi = 0; v < vCount && pi < pool.length * 2; pi++) {
    const p = pool[pi % pool.length]; if (!p || h[p.y * W + p.x] < wl + 0.18) continue;
    const rad = 18 + rng() * 28, active = params.biome === "volcanic" ? rng() > 0.2 : rng() > 0.45;
    volcanos.push({ x: p.x, y: p.y, radius: rad, active }); v++;
  }
  volcanos.forEach(vol => {
    const [vr, vg, vb] = pal.volcano;
    const g = ctx.createRadialGradient(vol.x, vol.y, 2, vol.x, vol.y, vol.radius);
    g.addColorStop(0, `rgb(${vr},${vg},${vb})`);
    g.addColorStop(0.6, `rgba(${vr + 30},${vg + 20},${vb + 10},0.5)`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(vol.x, vol.y, vol.radius, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(vol.x, vol.y, vol.radius * 0.22, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${vr},${vg},${vb},0.9)`; ctx.lineWidth = 2.5; ctx.stroke();
    if (vol.active) {
      const [gr, gg, gb] = pal.volcanoGlow;
      const lg = ctx.createRadialGradient(vol.x, vol.y, 0, vol.x, vol.y, vol.radius * 0.55);
      lg.addColorStop(0, `rgba(${gr},${gg},${gb},0.85)`); lg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(vol.x, vol.y, vol.radius * 0.55, 0, Math.PI * 2); ctx.fill();
      const frng = makePRNG(vol.x * 100 + vol.y);
      for (let f = 0; f < 5; f++) {
        const angle = frng() * Math.PI * 2, len = vol.radius * (0.6 + frng() * 0.9);
        ctx.beginPath();
        ctx.moveTo(vol.x + Math.cos(angle) * vol.radius * 0.2, vol.y + Math.sin(angle) * vol.radius * 0.2);
        ctx.lineTo(vol.x + Math.cos(angle) * len, vol.y + Math.sin(angle) * len);
        ctx.strokeStyle = `rgba(${gr},${gg - 20},0,0.4)`; ctx.lineWidth = 1 + frng() * 3; ctx.lineCap = "round"; ctx.stroke();
      }
      for (let s = 0; s < 4; s++) {
        const sx = vol.x + (rng() - 0.5) * vol.radius * 0.25;
        ctx.beginPath(); ctx.moveTo(sx, vol.y);
        ctx.bezierCurveTo(sx + (rng() - 0.5) * 20, vol.y - 18, sx + (rng() - 0.5) * 30, vol.y - 42, sx + (rng() - 0.5) * 14, vol.y - 62);
        ctx.strokeStyle = "rgba(80,70,70,0.22)"; ctx.lineWidth = 4 + rng() * 6; ctx.lineCap = "round"; ctx.stroke();
      }
    }
  });

  // ── Glaciers (arctic, alpine, tundra) ────────────────────────────────────
  if (["arctic", "alpine", "tundra"].includes(params.biome)) {
    const gr = makePRNG(params.seed + 7777);
    for (let g = 0; g < 6; g++) {
      const gx = Math.floor(gr() * W), gy = Math.floor(gr() * H);
      if (gx < 0 || gy < 0 || gx >= W || gy >= H || h[gy * W + gx] < wl + 0.3) continue;
      const gw2 = 30 + gr() * 50, gh2 = 12 + gr() * 22, angle = gr() * Math.PI;
      ctx.save(); ctx.translate(gx, gy); ctx.rotate(angle);
      const gl = ctx.createLinearGradient(-gw2 / 2, 0, gw2 / 2, 0);
      gl.addColorStop(0, "rgba(200,220,255,0)"); gl.addColorStop(0.3, "rgba(200,220,255,0.55)");
      gl.addColorStop(0.7, "rgba(210,232,255,0.55)"); gl.addColorStop(1, "rgba(200,220,255,0)");
      ctx.fillStyle = gl; ctx.beginPath(); ctx.ellipse(0, 0, gw2 / 2, gh2 / 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  // ── Desert mesas ─────────────────────────────────────────────────────────
  if (["desert", "savanna"].includes(params.biome)) {
    const mr = makePRNG(params.seed + 8888);
    for (let m = 0; m < 8; m++) {
      const mx = Math.floor(mr() * (W - 20)) + 10, my = Math.floor(mr() * (H - 20)) + 10;
      if (mx >= W || my >= H || h[my * W + mx] < wl + 0.1 || h[my * W + mx] > wl + 0.4) continue;
      const ms = 8 + mr() * 18;
      ctx.beginPath();
      for (let a = 0; a < 6; a++) {
        const ang = (a / 6) * Math.PI * 2, r2 = ms * (0.7 + mr() * 0.6);
        if (a === 0) ctx.moveTo(mx + Math.cos(ang) * r2, my + Math.sin(ang) * r2);
        else ctx.lineTo(mx + Math.cos(ang) * r2, my + Math.sin(ang) * r2);
      }
      ctx.closePath(); ctx.fillStyle = "rgba(180,140,80,0.35)"; ctx.fill();
      ctx.strokeStyle = "rgba(140,105,55,0.5)"; ctx.lineWidth = 1; ctx.stroke();
    }
  }

  // ── Mushroom caps ─────────────────────────────────────────────────────────
  if (params.biome === "mushroom") {
    const mr = makePRNG(params.seed + 9999);
    const capColors = ["rgba(200,80,180,0.7)", "rgba(120,50,200,0.7)", "rgba(80,160,220,0.7)", "rgba(220,120,60,0.7)"];
    for (let m = 0; m < 35; m++) {
      const mx = Math.floor(mr() * (W - 20)) + 10, my = Math.floor(mr() * (H - 20)) + 10;
      if (h[my * W + mx] < wl + 0.04 || h[my * W + mx] > wl + 0.4) continue;
      const ms = 6 + mr() * 14;
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx, my + ms);
      ctx.strokeStyle = "rgba(200,185,215,0.6)"; ctx.lineWidth = ms * 0.2 + 1; ctx.lineCap = "round"; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(mx, my, ms, ms * 0.55, 0, Math.PI, Math.PI * 2);
      ctx.fillStyle = capColors[Math.floor(mr() * capColors.length)]; ctx.fill();
      for (let s = 0; s < 3; s++) {
        const sx = mx + (mr() - 0.5) * ms, sy = my - mr() * ms * 0.4 - 2;
        ctx.beginPath(); ctx.arc(sx, sy, 1.5 + mr() * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fill();
      }
    }
  }

  // ── Deadlands skulls ──────────────────────────────────────────────────────
  if (params.biome === "deadlands") {
    const dr = makePRNG(params.seed + 5555);
    for (let d = 0; d < 20; d++) {
      const dx = Math.floor(dr() * (W - 20)) + 10, dy = Math.floor(dr() * (H - 20)) + 10;
      if (h[dy * W + dx] < wl + 0.04) continue;
      const ds = 3 + dr() * 5;
      ctx.beginPath(); ctx.arc(dx, dy, ds, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(200,195,185,0.4)"; ctx.fill();
      ctx.strokeStyle = "rgba(160,155,145,0.5)"; ctx.lineWidth = 0.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(dx - ds * 0.3, dy - ds * 0.1, ds * 0.22, 0, Math.PI * 2);
      ctx.arc(dx + ds * 0.3, dy - ds * 0.1, ds * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(80,75,70,0.5)"; ctx.fill();
    }
  }

  // ── Coastal ships & reefs ─────────────────────────────────────────────────
  if (params.biome === "coastal") {
    const cr = makePRNG(params.seed + 6666);
    for (let s = 0; s < 5; s++) {
      const sx = Math.floor(cr() * W), sy = Math.floor(cr() * H);
      if (h[sy * W + sx] > wl - 0.02) continue;
      const ss = 7 + cr() * 8;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(cr() * 0.4 - 0.2);
      ctx.beginPath(); ctx.moveTo(0, -ss); ctx.lineTo(ss * 0.3, ss * 0.4); ctx.lineTo(-ss * 0.3, ss * 0.4); ctx.closePath();
      ctx.fillStyle = "rgba(160,140,100,0.55)"; ctx.fill();
      ctx.strokeStyle = "rgba(110,90,60,0.5)"; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.restore();
    }
    for (let r = 0; r < 12; r++) {
      const rx = Math.floor(cr() * W), ry = Math.floor(cr() * H);
      if (h[ry * W + rx] > wl - 0.04 || h[ry * W + rx] < wl - 0.15) continue;
      ctx.beginPath(); ctx.ellipse(rx, ry, 8 + cr() * 14, 4 + cr() * 8, cr() * Math.PI, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(50,140,100,0.3)"; ctx.fill();
    }
  }

  // ── Rivers ────────────────────────────────────────────────────────────────
  const rCount = params.biome === "swamp" ? Math.max(params.rivers, 3) : params.rivers;
  for (let r = 0; r < rCount; r++) {
    const start = pool[Math.floor(rng() * Math.min(pool.length, 300))];
    if (!start || h[start.y * W + start.x] < wl + 0.18) continue;
    const pts: Point[] = [{ x: start.x, y: start.y }]; let cx = start.x, cy = start.y;
    for (let step = 0; step < 130; step++) {
      let bx = cx, by = cy, bestH = h[cy * W + cx];
      for (const [ddx, ddy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const nx = cx + ddx * 3, ny = cy + ddy * 3;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const nh = h[ny * W + nx];
        if (nh < bestH - 0.001) { bestH = nh; bx = nx; by = ny; }
      }
      if (bx === cx && by === cy) break;
      cx = bx + Math.round((rng() - 0.5) * 2); cy = by + Math.round((rng() - 0.5) * 2);
      pts.push({ x: cx, y: cy }); if (bestH < wl) break;
    }
    if (pts.length < 5) continue;
    const [rv, gv, bv] = pal.riverColor;
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    ctx.strokeStyle = `rgba(${rv},${gv},${bv},0.75)`;
    ctx.lineWidth = 1 + Math.min(1, pts.length / 80) * 2.8; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
  }

  // ── Cities ────────────────────────────────────────────────────────────────
  const cities: City[] = [];
  for (let c = 0, pi = 0; c < params.cities && pi < pool.length; pi++) {
    const p = pool[pi]; if (!p || h[p.y * W + p.x] < wl + 0.03) continue;
    if (cities.some(cc => Math.hypot(cc.x - p.x, cc.y - p.y) < 60)) continue;
    const sizes: Array<"village" | "town" | "city"> = ["village", "village", "town", "town", "city"];
    cities.push({ x: p.x, y: p.y, name: cityName(rng), size: sizes[Math.floor(rng() * sizes.length)] }); c++;
  }

  const [rr2, rg2, rb2] = pal.road;
  ctx.setLineDash([6, 5]);

  // ── Main Central Trade Route ──────────────────────────────────────────────
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = `rgba(${rr2},${rg2},${rb2},0.85)`;

  const isHoriz = rng() > 0.5;
  const startP = isHoriz ? { x: -20, y: H * 0.2 + rng() * H * 0.6 } : { x: W * 0.2 + rng() * W * 0.6, y: -20 };
  const midP = { x: W / 2 + (rng() - 0.5) * 60, y: H / 2 + (rng() - 0.5) * 60 };
  const endP = isHoriz ? { x: W + 20, y: H * 0.2 + rng() * H * 0.6 } : { x: W * 0.2 + rng() * W * 0.6, y: H + 20 };

  ctx.beginPath();
  ctx.moveTo(startP.x, startP.y);
  const cp1 = { x: startP.x * 0.4 + midP.x * 0.6 + (rng() - 0.5) * 120, y: startP.y * 0.4 + midP.y * 0.6 + (rng() - 0.5) * 120 };
  const cp2 = { x: midP.x * 0.6 + endP.x * 0.4 + (rng() - 0.5) * 120, y: midP.y * 0.6 + endP.y * 0.4 + (rng() - 0.5) * 120 };

  ctx.beginPath();
  ctx.moveTo(startP.x, startP.y);
  ctx.quadraticCurveTo(cp1.x, cp1.y, midP.x, midP.y);
  ctx.quadraticCurveTo(cp2.x, cp2.y, endP.x, endP.y);
  ctx.stroke();

  // Always draw the golden pointer randomly near the center of the road
  const pointerP = 0.4 + rng() * 0.2;
  let px, py;
  if (pointerP <= 0.5) {
    const t = pointerP * 2;
    px = Math.pow(1 - t, 2) * startP.x + 2 * (1 - t) * t * cp1.x + Math.pow(t, 2) * midP.x;
    py = Math.pow(1 - t, 2) * startP.y + 2 * (1 - t) * t * cp1.y + Math.pow(t, 2) * midP.y;
  } else {
    const t = (pointerP - 0.5) * 2;
    px = Math.pow(1 - t, 2) * midP.x + 2 * (1 - t) * t * cp2.x + Math.pow(t, 2) * endP.x;
    py = Math.pow(1 - t, 2) * midP.y + 2 * (1 - t) * t * cp2.y + Math.pow(t, 2) * endP.y;
  }
  px = Math.max(10, Math.min(W - 10, px));
  py = Math.max(10, Math.min(H - 10, py));
  
  // Pulse glow
  ctx.beginPath();
  ctx.arc(px, py, 14, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(242, 194, 48, 0.15)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px, py, 8, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(242, 194, 48, 0.3)";
  ctx.fill();

  // Triangle marker
  ctx.beginPath();
  ctx.moveTo(px, py - 6);
  ctx.lineTo(px + 4, py + 4);
  ctx.lineTo(px - 4, py + 4);
  ctx.closePath();
  ctx.fillStyle = "rgba(242, 194, 48, 1)";
  ctx.fill();
  ctx.strokeStyle = "rgba(40, 30, 20, 0.9)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ── Local City Roads ──────────────────────────────────────────────────────
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = `rgba(${rr2},${rg2},${rb2},0.7)`;
  for (let i = 0; i < cities.length; i++) for (let j = i + 1; j < cities.length; j++) {
    if (Math.hypot(cities[i].x - cities[j].x, cities[i].y - cities[j].y) < 165) {
      const mx = (cities[i].x + cities[j].x) / 2 + (rng() - 0.5) * 22, my = (cities[i].y + cities[j].y) / 2 + (rng() - 0.5) * 22;
      ctx.beginPath(); ctx.moveTo(cities[i].x, cities[i].y);
      ctx.quadraticCurveTo(mx, my, cities[j].x, cities[j].y); ctx.stroke();
    }
  }
  ctx.setLineDash([]);

  // Draw city icons & labels
  const [cv1, cv2, cv3] = pal.cityColor;
  cities.forEach(city => {
    const sz = city.size === "city" ? 7 : city.size === "town" ? 5 : 3.5;
    ctx.beginPath(); ctx.arc(city.x + 1, city.y + 1, sz + 1.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.fill();
    ctx.beginPath(); ctx.arc(city.x, city.y, sz, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${cv1},${cv2},${cv3})`; ctx.fill();
    ctx.strokeStyle = "rgba(60,50,35,0.8)"; ctx.lineWidth = 1.2; ctx.stroke();
    if (city.size !== "village") {
      ctx.beginPath();
      ctx.moveTo(city.x - sz * 0.5, city.y); ctx.lineTo(city.x + sz * 0.5, city.y);
      ctx.moveTo(city.x, city.y - sz * 0.5); ctx.lineTo(city.x, city.y + sz * 0.5);
      ctx.strokeStyle = "rgba(60,50,35,0.55)"; ctx.lineWidth = 0.8; ctx.stroke();
    }
    const fs = city.size === "city" ? 11 : city.size === "town" ? 9 : 8;
    ctx.font = `${city.size === "city" ? "bold " : ""}${fs}px Georgia,serif`;
    const tw = ctx.measureText(city.name).width, lx = city.x + sz + 3, ly = city.y + 4;
    ctx.fillStyle = "rgba(240,230,210,0.82)"; ctx.fillRect(lx - 2, ly - fs + 1, tw + 4, fs + 2);
    ctx.fillStyle = "rgba(40,30,20,0.9)"; ctx.fillText(city.name, lx, ly);
  });

  // ── Tree icons ────────────────────────────────────────────────────────────
  if (params.biome !== "mushroom") {
    const tf = valueNoise(makePRNG(params.seed + 77), W, H, 35);
    const tt = 1 - params.forestDensity * 0.45;
    const [tr1, tr2, tr3] = pal.forestColor;
    const isPine = ["arctic", "alpine", "tundra", "temperate"].includes(params.biome);
    for (let ty2 = 15; ty2 < H - 15; ty2 += 18) for (let tx2 = 15; tx2 < W - 15; tx2 += 18) {
      const jx = tx2 + Math.floor(makePRNG(params.seed + tx2 + ty2 * W)() * 10 - 5);
      const jy = ty2 + Math.floor(makePRNG(params.seed + ty2 + tx2 * H)() * 10 - 5);
      if (jx < 0 || jy < 0 || jx >= W || jy >= H) continue;
      const hv = h[jy * W + jx];
      if (hv > wl + 0.04 && hv < wl + 0.42 && tf[jy * W + jx] > tt) {
        const ts = 5 + Math.random() * 3;
        if (isPine) {
          ctx.beginPath();
          ctx.moveTo(jx, jy - ts); ctx.lineTo(jx - ts * 0.65, jy + ts * 0.5); ctx.lineTo(jx + ts * 0.65, jy + ts * 0.5);
          ctx.closePath(); ctx.fillStyle = `rgba(${tr1},${tr2},${tr3},0.6)`; ctx.fill();
          ctx.strokeStyle = `rgba(${Math.max(0, tr1 - 20)},${Math.max(0, tr2 - 25)},${Math.max(0, tr3 - 10)},0.45)`;
          ctx.lineWidth = 0.5; ctx.stroke();
        } else {
          ctx.beginPath(); ctx.arc(jx, jy, ts * 0.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${tr1},${tr2},${tr3},0.55)`; ctx.fill();
          ctx.strokeStyle = `rgba(${Math.max(0, tr1 - 20)},${Math.max(0, tr2 - 25)},${Math.max(0, tr3 - 10)},0.4)`;
          ctx.lineWidth = 0.5; ctx.stroke();
        }
      }
    }
  }

  // ── Compass ───────────────────────────────────────────────────────────────
  ctx.save(); ctx.translate(W - 50, 65);
  [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((ang, i) => {
    ctx.save(); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(4, -5); ctx.lineTo(0, -8); ctx.lineTo(-4, -5); ctx.closePath();
    ctx.fillStyle = i === 0 ? "rgba(180,50,30,0.9)" : "rgba(240,230,210,0.9)"; ctx.fill();
    ctx.strokeStyle = "rgba(60,50,35,0.7)"; ctx.lineWidth = 0.8; ctx.stroke(); ctx.restore();
  });
  ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(240,230,210,0.95)"; ctx.fill();
  ctx.strokeStyle = "rgba(60,50,35,0.8)"; ctx.lineWidth = 1; ctx.stroke();
  ctx.font = "bold 9px Georgia,serif"; ctx.fillStyle = "rgba(40,30,20,0.9)"; ctx.textAlign = "center";
  [["N", 0], ["E", Math.PI / 2], ["S", Math.PI], ["W", Math.PI * 1.5]].forEach(([l, a]) => {
    ctx.fillText(String(l), Math.sin(Number(a)) * 28, -Math.cos(Number(a)) * 28 + 3);
  });
  ctx.restore();

  // ── Scale Removed ─────────────────────────────────────────────────────────

  // ── Border (Removed to fix extra lines on edges) ──────────────────────────
}

// ─── Map Popup Modal ───────────────────────────────────────────────────────────
function MapPopupModal({ 
  mapConfig, 
  profile, 
  moodData, 
  onClose 
}: { 
  mapConfig: {
    name: string;
    biome: BiomeKey;
    params: MapParams;
    performanceScore: number;
    performanceState: string;
    nextStops: { name: string; biome: BiomeKey }[];
  }; 
  profile: any; 
  moodData: any[]; 
  onClose: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Audio Logic
  useEffect(() => {
    if (!mounted) return;
    
    const audio = audioRef.current;
    if (audio) {
      audio.volume = 0;
      audio.play().catch(err => console.error("Audio play failed:", err));
      
      const fadeInterval = setInterval(() => {
        if (audio.volume < 0.5) {
          audio.volume = Math.min(0.5, audio.volume + 0.05);
        } else {
          clearInterval(fadeInterval);
        }
      }, 100);
      
      return () => clearInterval(fadeInterval);
    }
  }, [mounted]);

  const handleClose = () => {
    if (isClosing) return;
    const audio = audioRef.current;
    setIsClosing(true);

    // Safety fallback: Force close if audio fade logic hangs (e.g., Safari backgrounding)
    const safetyTimeout = setTimeout(() => {
      onClose();
    }, 1200);

    if (audio) {
      const fadeInterval = setInterval(() => {
        try {
          if (audio.volume > 0.05) {
            audio.volume = Math.max(0, audio.volume - 0.05);
          } else {
            audio.volume = 0;
            audio.pause();
            clearInterval(fadeInterval);
            clearTimeout(safetyTimeout);
            onClose();
          }
        } catch (e) {
          console.error("Audio fade-out failed:", e);
          clearInterval(fadeInterval);
          clearTimeout(safetyTimeout);
          onClose();
        }
      }, 50);
    } else {
      clearTimeout(safetyTimeout);
      onClose();
    }
  };

  // Canvas Logic
  useEffect(() => {
    if (!mounted || !mapConfig || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const p = mapConfig.params;
    const [W, H] = SIZES[p.mapSize];

    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    const rng = makePRNG(p.seed);
    const h = fbm(rng, W, H, 7);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const nx = (x / W) * 2 - 1, ny = (y / H) * 2 - 1;
      const d = Math.sqrt(nx * nx + ny * ny);
      h[y * W + x] = h[y * W + x] * 0.7 + Math.max(0, 1 - d * 1.3) * 0.3;
    }
    if (["alpine", "volcanic"].includes(p.biome)) {
      const bump = valueNoise(makePRNG(p.seed + 1234), W, H, W / 6);
      for (let i = 0; i < h.length; i++) h[i] = Math.min(1, h[i] * 0.85 + bump[i] * 0.25);
    }

    const playerProgress = (profile?.levelProgress || 0) / (profile?.nextLevelXP || 100);
    
    ctx.putImageData(generateMap(p, W, H, h), 0, 0);
    drawOverlay(ctx, p, W, H, h, playerProgress);
  }, [mounted, mapConfig, profile]);

  if (!mounted) return null;

  const musicFile = mapConfig.name.toLowerCase().replace(/\s+/g, "-") + ".mp3";
  const musicUrl = `/music/${encodeURIComponent(musicFile)}`;
  const tornEdge = "polygon(0% 1.5%, 1% 0.5%, 2% 1.2%, 3% 0.2%, 4% 1.8%, 5% 0.4%, 6% 1.1%, 7% 0.1%, 8% 1.6%, 9% 0.3%, 10% 1.3%, 11% 0.5%, 12% 1.7%, 13% 0.2%, 14% 1.4%, 15% 0.6%, 16% 1.9%, 17% 0.3%, 18% 1.2%, 19% 0.4%, 20% 1.5%, 21% 0.1%, 22% 1.8%, 23% 0.4%, 24% 1.3%, 25% 0.6%, 26% 1.6%, 27% 0.2%, 28% 1.4%, 29% 0.5%, 30% 1.7%, 31% 0.3%, 32% 1.1%, 33% 0.6%, 34% 1.8%, 35% 0.4%, 36% 1.3%, 37% 0.1%, 38% 1.6%, 39% 0.5%, 40% 1.4%, 41% 0.2%, 42% 1.9%, 43% 0.4%, 44% 1.1%, 45% 0.6%, 46% 1.7%, 47% 0.3%, 48% 1.5%, 49% 0.1%, 50% 1.8%, 51% 0.4%, 52% 1.3%, 53% 0.6%, 54% 1.6%, 55% 0.2%, 56% 1.4%, 57% 0.5%, 58% 1.7%, 59% 0.3%, 60% 1.1%, 61% 0.6%, 62% 1.8%, 63% 0.4%, 64% 1.3%, 65% 0.1%, 66% 1.6%, 67% 0.5%, 68% 1.4%, 69% 0.2%, 70% 1.9%, 71% 0.4%, 72% 1.1%, 73% 0.6%, 74% 1.7%, 75% 0.3%, 76% 1.5%, 77% 0.1%, 78% 1.8%, 79% 0.4%, 80% 1.3%, 81% 0.6%, 82% 1.6%, 83% 0.2%, 84% 1.4%, 85% 0.5%, 86% 1.7%, 87% 0.3%, 88% 1.1%, 89% 0.6%, 90% 1.8%, 91% 0.4%, 92% 1.3%, 93% 0.1%, 94% 1.6%, 95% 0.5%, 96% 1.4%, 97% 0.2%, 98% 1.9%, 99% 0.4%, 100% 1.5%, 100% 98.5%, 99% 99.6%, 98% 98.1%, 97% 99.8%, 96% 98.2%, 95% 99.6%, 94% 98.9%, 93% 99.9%, 92% 98.4%, 91% 99.7%, 90% 98.7%, 89% 99.5%, 88% 98.3%, 87% 99.8%, 86% 98.6%, 85% 99.4%, 84% 98.1%, 83% 99.7%, 82% 98.8%, 81% 99.6%, 80% 98.5%, 79% 99.9%, 78% 98.2%, 77% 99.6%, 76% 98.7%, 75% 99.4%, 74% 98.3%, 73% 99.8%, 72% 98.9%, 71% 99.6%, 70% 98.1%, 69% 99.8%, 68% 98.6%, 67% 99.5%, 66% 98.4%, 65% 99.9%, 64% 98.7%, 63% 99.6%, 62% 98.2%, 61% 99.4%, 60% 98.9%, 59% 99.7%, 58% 98.3%, 57% 99.8%, 56% 98.6%, 55% 99.8%, 54% 98.4%, 53% 99.4%, 52% 98.7%, 51% 99.6%, 50% 98.2%, 49% 99.9%, 48% 98.5%, 47% 99.7%, 46% 98.4%, 45% 99.4%, 44% 98.7%, 43% 99.9%, 42% 98.1%, 41% 99.8%, 40% 98.5%, 39% 99.5%, 38% 98.4%, 37% 99.9%, 36% 98.7%, 35% 99.6%, 34% 98.2%, 33% 99.4%, 32% 98.9%, 31% 99.7%, 30% 98.3%, 29% 99.8%, 28% 98.6%, 27% 99.8%, 26% 98.4%, 25% 99.4%, 24% 98.7%, 23% 99.6%, 22% 98.2%, 21% 99.9%, 20% 98.5%, 19% 99.7%, 18% 98.4%, 17% 99.4%, 16% 98.7%, 15% 99.9%, 14% 98.1%, 13% 99.8%, 12% 98.5%, 11% 99.5%, 10% 98.4%, 9% 99.9%, 8% 98.7%, 7% 99.6%, 6% 98.2%, 5% 99.4%, 4% 98.9%, 3% 99.7%, 2% 98.3%, 1% 99.8%, 0% 98.5%)";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-12 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isClosing ? 0 : 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="absolute inset-0 bg-black/95 backdrop-blur-3xl cursor-pointer"
      />

      <motion.div
        initial={{ scale: 0.8, opacity: 0, rotate: -2 }}
        animate={{ 
          scale: isClosing ? 0.8 : 1, 
          opacity: isClosing ? 0 : 1, 
          rotate: isClosing ? 2 : 0 
        }}
        exit={{ scale: 0.8, opacity: 0, rotate: 2 }}
        transition={{ type: "spring", damping: 20, stiffness: 100 }}
        className="relative w-full max-w-6xl h-full flex items-center justify-center"
      >
        <div 
          style={{ clipPath: tornEdge }}
          className="relative w-full aspect-[4/3] max-h-full bg-[#e6d5b8] shadow-[0_0_120px_rgba(0,0,0,1)] overflow-hidden [container-type:inline-size]"
        >
          {/* Parchment Overlays */}
          <div className="absolute inset-0 pointer-events-none z-10 opacity-60 mix-blend-multiply bg-[radial-gradient(circle_at_center,transparent_0%,rgba(139,69,19,0.3)_100%)]" />
          <div className="absolute inset-0 pointer-events-none z-10 opacity-30 mix-blend-overlay bg-gradient-to-br from-[#8b4513]/30 via-transparent to-[#4b3621]/50" />
          
          {/* Folds Logic */}
          <div className="absolute inset-0 pointer-events-none z-30 opacity-[0.15] mix-blend-multiply bg-[linear-gradient(90deg,transparent_33%,rgba(0,0,0,0.8)_33.5%,transparent_34%,transparent_66%,rgba(0,0,0,0.8)_66.5%,transparent_67%)]" />
          <div className="absolute inset-0 pointer-events-none z-30 opacity-[0.1] mix-blend-screen bg-[linear-gradient(90deg,transparent_32.5%,rgba(255,255,255,0.4)_33%,transparent_33.5%,transparent_65.5%,rgba(255,255,255,0.4)_66%,transparent_66.5%)]" />
          <div className="absolute inset-0 pointer-events-none z-30 opacity-[0.15] mix-blend-multiply bg-[linear-gradient(0deg,transparent_49%,rgba(0,0,0,0.8)_50%,transparent_51%)]" />

          {/* Stains & Grime */}
          <div className="absolute inset-0 pointer-events-none z-30 opacity-20 mix-blend-multiply bg-[radial-gradient(circle_at_15%_25%,#5d4037_0%,transparent_15%),radial-gradient(circle_at_85%_75%,#5d4037_0%,transparent_20%),radial-gradient(circle_at_50%_10%,#5d4037_0%,transparent_12%)] blur-2xl" />
          
          {/* Paper Texture Grain */}
          <div className="absolute inset-0 pointer-events-none z-20 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />

          {/* The Actual Map Content */}
          <div className="w-full h-full p-2 bg-[#e6d5b8]">
             <canvas
                ref={canvasRef}
                className="w-full h-full object-cover"
                style={{ 
                  imageRendering: "pixelated",
                  filter: "sepia(0.25) contrast(1.15) brightness(1.02) saturate(0.9)"
                }}
              />
          </div>

          {/* Edge Burn/Shadow */}
          <div 
            style={{ clipPath: tornEdge }}
            className="absolute inset-0 pointer-events-none border-[16px] border-black/40 blur-md z-40" 
          />

          {/* Archaic Location Title at Bottom */}
          <div className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none text-center w-full">
            <h2 
              style={{ fontFamily: "'Georgia', serif" }}
              className="text-xl md:text-5xl font-bold text-[#4b3621]/60 italic tracking-[0.2em] uppercase drop-shadow-[0_2px_2px_rgba(255,255,255,0.3)] px-4"
            >
              {mapConfig.name}
            </h2>
          </div>
        </div>
      </motion.div>

      <motion.button 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        onClick={handleClose}
        className="absolute top-6 right-6 sm:top-12 sm:right-12 z-[10001] p-4 bg-tm-purple-dark hover:bg-tm-orange-dark text-white rounded-full transition-all hover:rotate-90 shadow-[0_0_40px_rgba(0,0,0,0.6)] border border-white/20 cursor-pointer pointer-events-auto"
      >
        <X size={32} strokeWidth={3} />
      </motion.button>

      <audio ref={audioRef} loop preload="auto">
        <source src={musicUrl} type="audio/mpeg" />
      </audio>
    </div>,
    document.body
  );
}

// ─── World Map Configuration ──────────────────────────────────────────────────
const SIZES: Record<string, [number, number]> = { small: [960, 720], medium: [1280, 960], large: [1600, 1200] };

const BIOME_GROUPS: { label: string; keys: BiomeKey[] }[] = [
  { label: "Verdant", keys: ["temperate", "tropical", "swamp", "mushroom"] },
  { label: "Arid", keys: ["desert", "savanna", "deadlands", "volcanic"] },
  { label: "Cold/Sea", keys: ["arctic", "alpine", "tundra", "coastal"] },
];

const BIOME_MATRIX: Record<string, Record<"low" | "balanced" | "peak", { name: string; biome: BiomeKey; params: Partial<MapParams> }>> = {
  Novice: {
    low: { name: "The Grey Clearing", biome: "deadlands", params: { waterLevel: 0.2, volcanos: 0, forestDensity: 0.1, cities: 1 } },
    balanced: { name: "The Dusty Path", biome: "savanna", params: { waterLevel: 0.3, volcanos: 0, forestDensity: 0.2, cities: 2 } },
    peak: { name: "The Sunlit Meadow", biome: "temperate", params: { waterLevel: 0.4, volcanos: 0, forestDensity: 0.6, cities: 3 } },
  },
  Squire: {
    low: { name: "The Muddy Outpost", biome: "swamp", params: { waterLevel: 0.5, volcanos: 0, forestDensity: 0.4, cities: 2 } },
    balanced: { name: "The Training Grounds", biome: "temperate", params: { waterLevel: 0.35, volcanos: 0, forestDensity: 0.4, cities: 3 } },
    peak: { name: "The Bloom Garden", biome: "mushroom", params: { waterLevel: 0.45, volcanos: 0, forestDensity: 0.7, cities: 4 } },
  },
  Vanguard: {
    low: { name: "The Thistle Woods", biome: "swamp", params: { waterLevel: 0.4, volcanos: 0, forestDensity: 0.8, cities: 2 } },
    balanced: { name: "The Lookout Ridge", biome: "alpine", params: { waterLevel: 0.3, volcanos: 0, forestDensity: 0.4, cities: 3 } },
    peak: { name: "The Beacon Hill", biome: "temperate", params: { waterLevel: 0.3, volcanos: 0, forestDensity: 0.5, cities: 5 } },
  },
  Veteran: {
    low: { name: "The Foggy Battlefield", biome: "deadlands", params: { waterLevel: 0.3, volcanos: 0, forestDensity: 0.2, cities: 2 } },
    balanced: { name: "The Great Stone Wall", biome: "alpine", params: { waterLevel: 0.2, volcanos: 1, forestDensity: 0.3, cities: 3 } },
    peak: { name: "The Verdant Fortress", biome: "tropical", params: { waterLevel: 0.4, volcanos: 0, forestDensity: 0.8, cities: 4 } },
  },
  Knight: {
    low: { name: "The Stormy Moors", biome: "tundra", params: { waterLevel: 0.5, volcanos: 0, forestDensity: 0.2, rivers: 4, cities: 3 } },
    balanced: { name: "The Iron Highlands", biome: "alpine", params: { waterLevel: 0.25, volcanos: 1, forestDensity: 0.3, cities: 4 } },
    peak: { name: "The Crystal Citadel", biome: "arctic", params: { waterLevel: 0.35, volcanos: 0, forestDensity: 0.4, cities: 6 } },
  },
  Champion: {
    low: { name: "The Scorched Arena", biome: "desert", params: { waterLevel: 0.15, volcanos: 1, forestDensity: 0.1, cities: 2 } },
    balanced: { name: "The Victor's Valley", biome: "temperate", params: { waterLevel: 0.3, volcanos: 0, forestDensity: 0.5, cities: 5 } },
    peak: { name: "The Novus Islands", biome: "coastal", params: { waterLevel: 0.5, volcanos: 0, forestDensity: 0.4, cities: 7 } },
  },
  Sentinel: {
    low: { name: "The Shattered Watch", biome: "volcanic", params: { waterLevel: 0.2, volcanos: 3, forestDensity: 0.1, cities: 2 } },
    balanced: { name: "The Silent Pass", biome: "alpine", params: { waterLevel: 0.3, volcanos: 0, forestDensity: 0.5, cities: 4 } },
    peak: { name: "The Silver Keep", biome: "arctic", params: { waterLevel: 0.4, volcanos: 0, forestDensity: 0.3, cities: 6 } },
  },
  Paladin: {
    low: { name: "The Ashen Cathedral", biome: "volcanic", params: { waterLevel: 0.15, volcanos: 4, forestDensity: 0.0, cities: 2 } },
    balanced: { name: "The Marble Bastion", biome: "coastal", params: { waterLevel: 0.4, volcanos: 0, forestDensity: 0.3, cities: 5 } },
    peak: { name: "The Golden Sanctuary", biome: "desert", params: { waterLevel: 0.2, volcanos: 0, forestDensity: 0.2, cities: 6 } },
  },
  Grandmaster: {
    low: { name: "The Silent Void", biome: "deadlands", params: { waterLevel: 0.1, volcanos: 1, forestDensity: 0.0, cities: 1 } },
    balanced: { name: "The Floating Archives", biome: "coastal", params: { waterLevel: 0.6, volcanos: 0, forestDensity: 0.4, cities: 8 } },
    peak: { name: "The Celestial Peak", biome: "alpine", params: { waterLevel: 0.2, volcanos: 0, forestDensity: 0.2, cities: 5 } },
  },
  Hero: {
    low: { name: "The Prism Void", biome: "hero", params: { waterLevel: 0.1, volcanos: 3, forestDensity: 0.1, cities: 3 } },
    balanced: { name: "The Rainbow Realm", biome: "hero", params: { waterLevel: 0.4, volcanos: 0, forestDensity: 0.7, cities: 7 } },
    peak: { name: "The Citadel of Light", biome: "hero", params: { waterLevel: 0.3, volcanos: 0, forestDensity: 0.5, cities: 12 } },
  }
};

export function WorldMapWidget({ profile, moodData, completionScore = 0 }: { profile: any; moodData: any[]; completionScore?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { rank } = useTheme();
  const [randomOffset] = useState(() => Math.floor(Math.random() * 1000000));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapConfig, setMapConfig] = useState<{ 
    name: string; 
    biome: BiomeKey; 
    params: MapParams;
    performanceScore: number;
    performanceState: string;
    nextStops: { name: string; biome: BiomeKey }[];
  } | null>(null);

  useEffect(() => {
    // 30-day Overall Mood
    const overallJoy = moodData?.filter((m: any) => m.mood === "good").length || 0;
    const overallSteady = moodData?.filter((m: any) => m.mood === "neutral").length || 0;
    const totalOverall = (moodData?.length || 0) || 1;
    const overallScore = ((overallJoy * 100) + (overallSteady * 50)) / totalOverall;

    // 7-day Recent Mood (most recent 7 entries)
    const recentMoods = moodData?.slice(0, 7) || [];
    const recentJoy = recentMoods.filter((m: any) => m.mood === "good").length;
    const recentSteady = recentMoods.filter((m: any) => m.mood === "neutral").length;
    const totalRecent = recentMoods.length || 1;
    const recentScore = ((recentJoy * 100) + (recentSteady * 50)) / totalRecent;

    // Weighted Mood Score: 70% Recent, 30% Overall
    const moodScore = (recentScore * 0.7) + (overallScore * 0.3);

    const level = profile?.level || 1;


    // Custom weights: 37% Task/Habit, 45% Mood, 18% Random (Total: 90%)
    const performanceScore = (completionScore * 0.37) + (moodScore * 0.45) + (Math.random() * 100 * 0.18);

    let performance: "low" | "balanced" | "peak" = "balanced";
    if (performanceScore > 60) performance = "peak";
    else if (performanceScore < 40) performance = "low";

    // Prioritize the global rank (which supports manual overrides) over calculated level
    const currentTitle = rank || "Novice";

    const titles = RPG_TITLES.map(t => t.title);
    const currentTitleIndex = Math.max(0, titles.indexOf(currentTitle));

    const matrixEntry = BIOME_MATRIX[currentTitle] || BIOME_MATRIX["Novice"];
    const perfConfig = matrixEntry?.[performance] || BIOME_MATRIX["Novice"].balanced;

    const nextTitle = titles[(currentTitleIndex + 1) % titles.length];
    const nextEntry = BIOME_MATRIX[nextTitle] || BIOME_MATRIX["Hero"];
    
    const allStops = [
      { name: matrixEntry?.["low"]?.name || "The Wilds", biome: matrixEntry?.["low"]?.biome || "temperate" },
      { name: matrixEntry?.["balanced"]?.name || "The Plains", biome: matrixEntry?.["balanced"]?.biome || "temperate" },
      { name: matrixEntry?.["peak"]?.name || "The Citadel", biome: matrixEntry?.["peak"]?.biome || "temperate" },
      { name: nextEntry?.["low"]?.name || "The Beyond", biome: nextEntry?.["low"]?.biome || "hero" },
      { name: nextEntry?.["balanced"]?.name || "The Horizon", biome: nextEntry?.["balanced"]?.biome || "hero" },
      { name: nextEntry?.["peak"]?.name || "The Zenith", biome: nextEntry?.["peak"]?.biome || "hero" },
    ];

    // Filter out current biome and take top 5
    const nextStops = allStops
      .filter(s => s.name !== perfConfig.name)
      .slice(0, 5);

    // High sensitivity seed: changes completely with even 1 XP + random session offset
    const seed = (level * 7777) + (profile?.xp || 0) + (performance.length * 123) + randomOffset;

    const finalParams: MapParams = {
      seed,
      mapSize: "medium",
      waterLevel: 0.35 + ((profile?.xp || 0) % 50) / 500, // Subtle water level shifts with XP
      volcanos: 1,
      cities: 4,
      rivers: 3,
      forestDensity: 0.5 + ((profile?.xp || 0) % 30) / 300, // Subtle forest density shifts with XP
      biome: perfConfig.biome,
      ...perfConfig.params,
    };

    setMapConfig({
      name: perfConfig.name,
      biome: perfConfig.biome,
      params: finalParams,
      performanceScore,
      performanceState: performance,
      nextStops
    });
  }, [profile, moodData, rank, completionScore]);

  useEffect(() => {
    if (!mapConfig || !canvasRef.current) return;
    const canvas = canvasRef.current;
    
    // We render it dynamically with requestAnimationFrame
    const p = mapConfig.params;
    const [W, H] = SIZES[p.mapSize];
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    const rng = makePRNG(p.seed);
    const h = fbm(rng, W, H, 7);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const nx = (x / W) * 2 - 1, ny = (y / H) * 2 - 1;
      const d = Math.sqrt(nx * nx + ny * ny);
      h[y * W + x] = h[y * W + x] * 0.7 + Math.max(0, 1 - d * 1.3) * 0.3;
    }
    if (["alpine", "volcanic"].includes(p.biome)) {
      const bump = valueNoise(makePRNG(p.seed + 1234), W, H, W / 6);
      for (let i = 0; i < h.length; i++) h[i] = Math.min(1, h[i] * 0.85 + bump[i] * 0.25);
    }
    const playerProgress = (profile?.levelProgress || 0) / (profile?.nextLevelXP || 100);
    ctx.putImageData(generateMap(p, W, H, h), 0, 0);
    drawOverlay(ctx, p, W, H, h, playerProgress);
  }, [mapConfig]);

  if (!mapConfig) return null;

  const pal = BIOMES[mapConfig.biome];

  return (
    <>
      <div className="w-full h-full flex flex-col relative z-10">
        <div 
          onClick={() => setIsFullscreen(true)}
          className="relative w-full aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl group/map cursor-pointer"
        >
          <canvas ref={canvasRef} className="w-full h-full object-cover transition-transform duration-1000 group-hover/map:scale-105" style={{ imageRendering: "pixelated" }} />
          
          {/* Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/30 pointer-events-none" />
          
          {/* Name and Biome label */}
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <div className="space-y-1">
              <h4 className="text-xl md:text-2xl font-black text-white drop-shadow-md tracking-tighter italic">
                {mapConfig.name}
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-sm">{pal.icon}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{pal.label} Realm</span>
              </div>
            </div>
            
            <div className="hidden sm:block text-right">
              {/* Labels removed by request */}
            </div>
          </div>
        </div>
        
        {/* Possible Next Stops */}
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-tm-blue-gray">
            <span>Adjacent Areas</span>
            <span className={cn(
              mapConfig.performanceState === "peak" ? "text-tm-yellow" : 
              mapConfig.performanceState === "low" ? "text-tm-orange-dark" : "text-tm-blue-gray"
            )}>
              Status: {mapConfig.performanceState} / {Math.round(mapConfig.performanceScore)}
            </span>
        </div>
        
        <div className="flex flex-wrap gap-1.5 justify-center">
          {mapConfig.nextStops.map((stop, i) => (
            <div key={i} className="flex-[0_0_calc(33.33%-6px)] py-2.5 px-1 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors group/stop text-center min-w-0">
              <span className="text-[10px] opacity-70 group-hover/stop:opacity-100 transition-opacity mb-0.5">{BIOMES[stop.biome].icon}</span>
              <h5 className="text-[9px] font-black uppercase text-foreground/90 tracking-tighter leading-tight w-full px-1 whitespace-normal break-words">{stop.name}</h5>
            </div>
          ))}
        </div>
      </div>
      </div>

      {/* Map Popup Modal */}
      <AnimatePresence>
        {isFullscreen && mapConfig && (
          <MapPopupModal
            mapConfig={mapConfig}
            profile={profile}
            moodData={moodData}
            onClose={() => setIsFullscreen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default function FantasyMapGenerator() {
  const [params, setParams] = useState<MapParams>({
    seed: 42, waterLevel: 0.38, volcanos: 1, cities: 4,
    rivers: 3, forestDensity: 0.55, mapSize: "medium", biome: "temperate",
  });
  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const runGenerate = useCallback((p: MapParams) => {
    const canvas = canvasRef.current; if (!canvas) return;
    setGenerating(true);
    setTimeout(() => {
      const [W, H] = SIZES[p.mapSize];
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      const rng = makePRNG(p.seed);
      const h = fbm(rng, W, H, 7);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const nx = (x / W) * 2 - 1, ny = (y / H) * 2 - 1;
        const d = Math.sqrt(nx * nx + ny * ny);
        h[y * W + x] = h[y * W + x] * 0.7 + Math.max(0, 1 - d * 1.3) * 0.3;
      }
      if (["alpine", "volcanic"].includes(p.biome)) {
        const bump = valueNoise(makePRNG(p.seed + 1234), W, H, W / 6);
        for (let i = 0; i < h.length; i++) h[i] = Math.min(1, h[i] * 0.85 + bump[i] * 0.25);
      }
      ctx.putImageData(generateMap(p, W, H, h), 0, 0);
      drawOverlay(ctx, p, W, H, h);
      setGenerating(false);
    }, 50);
  }, []);

  useEffect(() => { runGenerate(params); }, []);

  const set = <K extends keyof MapParams>(k: K, v: MapParams[K]) => setParams(p => ({ ...p, [k]: v }));
  const randomize = () => setParams(p => ({ ...p, seed: Math.floor(Math.random() * 99999) }));
  const downloadMap = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png"); a.download = `map-${params.biome}-${params.seed}.png`; a.click();
  };

  const L: React.CSSProperties = {
    fontSize: 11, color: "var(--color-text-secondary)", fontFamily: "Georgia,serif",
    letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 4,
  };
  const Row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 };
  const Val: React.CSSProperties = { fontSize: 12, fontWeight: 500, minWidth: 22, textAlign: "right", color: "var(--color-text-primary)" };

  return (
    <div style={{ fontFamily: "Georgia,serif", padding: "0.25rem 0" }}>
      <h2 className="sr-only">Fantasy map generator</h2>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>

        {/* Controls */}
        <div style={{
          minWidth: 210, maxWidth: 240, flex: "0 0 222px",
          background: "var(--color-background-secondary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-lg)", padding: "1rem",
        }}>
          <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 11px", color: "var(--color-text-primary)" }}>
            Map parameters
          </p>

          <label style={L}>Seed</label>
          <input type="number" value={params.seed}
            onChange={e => set("seed", +e.target.value)}
            style={{ marginBottom: 11, fontFamily: "Georgia,serif", fontSize: 13 }} />

          <label style={L}>Biome</label>
          {BIOME_GROUPS.map(grp => (
            <div key={grp.label} style={{ marginBottom: 5 }}>
              <p style={{ fontSize: 9, color: "var(--color-text-secondary)", margin: "0 0 3px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {grp.label}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, marginBottom: 2 }}>
                {grp.keys.map(k => {
                  const b = BIOMES[k]; const active = params.biome === k;
                  return (
                    <button key={k} onClick={() => set("biome", k)} title={b.desc} style={{
                      padding: "4px 3px", fontSize: 10, textAlign: "left",
                      background: active ? "var(--color-background-info)" : undefined,
                      color: active ? "var(--color-text-info)" : "var(--color-text-secondary)",
                      borderColor: active ? "var(--color-border-info)" : undefined,
                      fontFamily: "Georgia,serif", lineHeight: 1.3,
                    }}>
                      <span style={{ fontSize: 11, marginRight: 3 }}>{b.icon}</span>{b.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <label style={{ ...L, marginTop: 7 }}>Map size</label>
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            {(["small", "medium", "large"] as const).map(s => (
              <button key={s} onClick={() => set("mapSize", s)} style={{
                flex: 1, fontSize: 10, padding: "4px 0",
                background: params.mapSize === s ? "var(--color-background-info)" : undefined,
                color: params.mapSize === s ? "var(--color-text-info)" : "var(--color-text-secondary)",
                borderColor: params.mapSize === s ? "var(--color-border-info)" : undefined,
                fontFamily: "Georgia,serif",
              }}>{s[0].toUpperCase() + s.slice(1)}</button>
            ))}
          </div>

          <label style={L}>Water level</label>
          <div style={Row}>
            <input type="range" min="0.15" max="0.65" step="0.01" value={params.waterLevel}
              onChange={e => set("waterLevel", +e.target.value)} style={{ flex: 1 }} />
            <span style={Val}>{(params.waterLevel * 100).toFixed(0)}%</span>
          </div>
          <label style={L}>Volcanos</label>
          <div style={Row}>
            <input type="range" min="0" max="5" step="1" value={params.volcanos}
              onChange={e => set("volcanos", +e.target.value)} style={{ flex: 1 }} />
            <span style={Val}>{params.volcanos}</span>
          </div>
          <label style={L}>Cities & towns</label>
          <div style={Row}>
            <input type="range" min="0" max="8" step="1" value={params.cities}
              onChange={e => set("cities", +e.target.value)} style={{ flex: 1 }} />
            <span style={Val}>{params.cities}</span>
          </div>
          <label style={L}>Rivers</label>
          <div style={Row}>
            <input type="range" min="0" max="6" step="1" value={params.rivers}
              onChange={e => set("rivers", +e.target.value)} style={{ flex: 1 }} />
            <span style={Val}>{params.rivers}</span>
          </div>
          <label style={L}>Forest density</label>
          <div style={Row}>
            <input type="range" min="0" max="1" step="0.05" value={params.forestDensity}
              onChange={e => set("forestDensity", +e.target.value)} style={{ flex: 1 }} />
            <span style={Val}>{(params.forestDensity * 100).toFixed(0)}%</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4 }}>
            <button onClick={randomize} style={{ fontFamily: "Georgia,serif", fontSize: 12 }}>🎲 Random seed</button>
            <button onClick={() => runGenerate(params)} disabled={generating}
              style={{ fontFamily: "Georgia,serif", fontSize: 12, background: generating ? "var(--color-background-secondary)" : undefined }}>
              {generating ? "Drawing…" : "⚔ Generate map ↗"}
            </button>
            <button onClick={downloadMap} style={{ fontFamily: "Georgia,serif", fontSize: 11 }}>⬇ Download PNG</button>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            background: "var(--color-background-secondary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-lg)",
            overflow: "auto", padding: 8,
          }}>
            <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "auto", borderRadius: 4, imageRendering: "pixelated" }} />
          </div>
          <p style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 5, fontFamily: "Georgia,serif" }}>
            {BIOMES[params.biome].icon} <strong>{BIOMES[params.biome].label}</strong> · seed {params.seed} · {SIZES[params.mapSize][0]}×{SIZES[params.mapSize][1]}px
            &ensp;<em style={{ fontStyle: "italic", opacity: 0.75 }}>{BIOMES[params.biome].desc}</em>
          </p>
        </div>
      </div>
    </div>
  );
}