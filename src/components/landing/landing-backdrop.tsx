"use client";

import { useEffect, useRef } from "react";

// The landing page's moving backdrop: one canvas behind the stage, with a different show for each
// some scenes (a few embers, faint ink lines, the odd ripple, drifting stars, a dot lattice, slow
// sparks). It is meant to be felt more than looked at: few marks, thin lines, low contrast, and
// only a gentle lift in speed while the page scrolls. Shows cross-fade when the scene changes;
// scenes without one (calendar, AI guide, themes) keep the canvas clear.
//
// Kept affordable the same way as the in-app era particles: a single 2D canvas, device pixel ratio
// capped at 1.5, fewer particles and 30fps on phones, paused when the tab is hidden. Glows are
// pre-drawn sprites, never shadowBlur.

export type BackdropMode = "embers" | "ribbons" | "ripples" | "warp" | "lattice" | "sparks";

const PALETTE_VARS = ["--tm-yellow", "--tm-orange-light", "--tm-orange-dark", "--tm-red", "--tm-blue-gray"];

interface Env {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  // Seconds since the canvas started, and since the last frame
  t: number;
  dt: number;
  // 0 at rest, up to 1 while scrolling fast
  boost: number;
  colors: string[];
  glows: HTMLCanvasElement[];
  // This show's strength while cross-fading (0..1), already scaled for the theme
  k: number;
  // Fewer particles on phones
  density: number;
  dark: boolean;
}

interface Show<S = unknown> {
  init: (env: Env) => S;
  draw: (state: S, env: Env) => void;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = (n: number) => Math.floor(Math.random() * n);

// A soft round glow in one colour, drawn once and stamped wherever light is needed
function glowSprite(color: string) {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d");
  if (!g) return canvas;
  const gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  // Fading to "transparent" passes through grey; fade to the same colour at zero strength
  const clear = /^#[0-9a-f]{6}$/i.test(color)
    ? `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, 0)`
    : "transparent";
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, clear);
  g.globalAlpha = 0.9;
  g.fillStyle = gradient;
  g.fillRect(0, 0, size, size);
  return canvas;
}

function glow({ ctx, glows, dark }: Env, color: number, x: number, y: number, radius: number, alpha: number) {
  if (!dark || alpha <= 0.003) return;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(glows[color % glows.length], x - radius, y - radius, radius * 2, radius * 2);
}

// ── Opening: a few embers rising off a hearth
const embers: Show<{ x: number; y: number; vy: number; r: number; phase: number; c: number }[]> = {
  init: ({ w, h, density }) => Array.from({ length: Math.round(12 * density) }, () => ({
    x: rand(0, w), y: rand(0, h), vy: rand(10, 28), r: rand(0.8, 1.8), phase: rand(0, 6.28), c: pick(3),
  })),
  draw(list, env) {
    const { ctx, w, h, t, dt, boost, colors, k } = env;
    // Two slow lights behind everything
    glow(env, 2, w * (0.3 + 0.12 * Math.sin(t * 0.21)), h * (0.92 + 0.05 * Math.cos(t * 0.17)), Math.max(w, h) * 0.42, 0.1 * k);
    glow(env, 0, w * (0.72 + 0.1 * Math.cos(t * 0.16)), h * (0.98 + 0.04 * Math.sin(t * 0.23)), Math.max(w, h) * 0.36, 0.08 * k);
    for (const p of list) {
      p.y -= p.vy * dt * (1 + boost);
      if (p.y < -30) { p.y = h + 20; p.x = rand(0, w); }
      const x = p.x + Math.sin(t * 0.9 + p.phase) * 22;
      const life = Math.min(1, p.y / (h * 0.75) + 0.1);
      const flicker = 0.75 + 0.25 * Math.sin(t * 3 + p.phase);
      glow(env, p.c, x, p.y, p.r * 5, 0.18 * life * flicker * k);
      ctx.globalAlpha = Math.min(1, 0.4 * life * flicker * k);
      ctx.fillStyle = colors[p.c % colors.length];
      ctx.fillRect(x - p.r / 2, p.y, p.r, p.r);
    }
  },
};

// ── Notes: a few thin lines of ink, barely there, drifting across the page
const ribbons: Show<{ lines: { y: number; amp: number; freq: number; speed: number; phase: number; c: number; width: number }[]; phase: number }> = {
  init: ({ h, density }) => ({
    phase: 0,
    lines: Array.from({ length: Math.round(2 * density) + 2 }, (_, i) => ({
      y: h * (0.25 + 0.17 * i + rand(-0.03, 0.03)), amp: rand(30, 70), freq: rand(0.002, 0.004), speed: rand(0.15, 0.4), phase: rand(0, 6.28), c: i % 4, width: rand(1, 2),
    })),
  }),
  draw(state, env) {
    const { ctx, w, dt, boost, colors, k } = env;
    state.phase += dt * (1 + boost * 1.5);
    const step = Math.max(24, w / 40);
    for (const line of state.lines) {
      const at = (x: number) => line.y
        + Math.sin(x * line.freq + state.phase * line.speed + line.phase) * line.amp
        + Math.sin(x * line.freq * 0.37 - state.phase * line.speed * 0.6) * line.amp * 0.5;
      ctx.strokeStyle = colors[line.c % colors.length];
      ctx.lineCap = "round";
      for (const [width, alpha] of [[line.width, 0.1]] as const) {
        ctx.lineWidth = width;
        ctx.globalAlpha = Math.min(1, alpha * k);
        ctx.beginPath();
        ctx.moveTo(-step, at(-step));
        for (let x = 0; x <= w + step; x += step) ctx.lineTo(x, at(x));
        ctx.stroke();
      }
    }
  },
};

// ── Habits: now and then a single slow, faint ring spreads, like a tick landing
const ripples: Show<{ rings: { x: number; y: number; r: number; max: number; c: number }[]; next: number }> = {
  init: () => ({ rings: [], next: 0 }),
  draw(state, env) {
    const { ctx, w, h, dt, colors, k } = env;
    state.next -= dt;
    if (state.next <= 0 && state.rings.length < 2) {
      state.next = 3.5;
      state.rings.push({ x: rand(0, w), y: rand(0, h), r: 0, max: rand(90, 260), c: pick(4) });
    }
    for (let i = state.rings.length - 1; i >= 0; i--) {
      const ring = state.rings[i];
      ring.r += dt * 22;
      const life = 1 - ring.r / ring.max;
      if (life <= 0) { state.rings.splice(i, 1); continue; }
      ctx.strokeStyle = colors[ring.c % colors.length];
      ctx.lineWidth = 1;
      ctx.globalAlpha = Math.min(1, life * 0.16 * k);
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  },
};

// ── Seasons: drifting slowly through stars
const warp: Show<{ x: number; y: number; z: number; c: number }[]> = {
  init: ({ density }) => Array.from({ length: Math.round(70 * density) }, () => ({ x: rand(-1, 1), y: rand(-1, 1), z: rand(0.05, 1), c: pick(5) })),
  draw(stars, env) {
    const { ctx, w, h, t, dt, boost, colors, k } = env;
    const cx = w / 2;
    const cy = h / 2;
    const speed = 0.035 + boost * 0.3;
    glow(env, 0, cx, cy, Math.min(w, h) * (0.3 + 0.03 * Math.sin(t)), 0.12 * k);
    ctx.lineCap = "round";
    for (const star of stars) {
      const before = star.z;
      star.z -= speed * dt;
      if (star.z <= 0.04) { star.x = rand(-1, 1); star.y = rand(-1, 1); star.z = 1; continue; }
      const x = cx + (star.x / star.z) * cx * 0.7;
      const y = cy + (star.y / star.z) * cy * 0.7;
      if (x < -40 || x > w + 40 || y < -40 || y > h + 40) { star.z = 0; continue; }
      const near = 1 - star.z;
      // The trail runs back to where the star was a moment ago (longer when moving fast)
      const tail = Math.min(1, before + speed * 0.06);
      ctx.strokeStyle = colors[star.c % colors.length];
      ctx.lineWidth = 0.6 + near * 1.2;
      ctx.globalAlpha = Math.min(1, (0.15 + near * 0.45) * k);
      ctx.beginPath();
      ctx.moveTo(cx + (star.x / tail) * cx * 0.7, cy + (star.y / tail) * cy * 0.7);
      ctx.lineTo(x, y);
      ctx.stroke();
      if (near > 0.8) glow(env, star.c, x, y, 7 * near, 0.3 * near * k);
    }
  },
};

// ── Privacy: a still lattice of small dots, like frosted glass, with a slow sheen passing over it
const lattice: Show<null> = {
  init: () => null,
  draw(_state, env) {
    const { ctx, w, h, t, colors, k, density } = env;
    const gap = density < 1 ? 56 : 44;
    ctx.fillStyle = colors[4 % colors.length];
    for (let y = gap / 2; y < h; y += gap) {
      for (let x = gap / 2; x < w; x += gap) {
        const sheen = Math.max(0, Math.sin((x + y) * 0.0035 - t * 0.35)) ** 6;
        ctx.globalAlpha = Math.min(1, (0.07 + 0.2 * sheen) * k);
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }
  },
};

// ── Version: a few sparks that drift up and twinkle
const sparks: Show<{ x: number; y: number; vy: number; r: number; phase: number; c: number }[]> = {
  init: ({ w, h, density }) => Array.from({ length: Math.round(28 * density) }, () => ({
    x: rand(0, w), y: rand(0, h), vy: rand(4, 14), r: rand(1.5, 3.5), phase: rand(0, 6.28), c: pick(5),
  })),
  draw(list, env) {
    const { ctx, w, h, t, dt, boost, colors, k } = env;
    for (const p of list) {
      p.y -= p.vy * dt * (1 + boost * 2);
      if (p.y < -10) { p.y = h + 10; p.x = rand(0, w); }
      const twinkle = 0.5 + 0.5 * Math.sin(t * 1.6 + p.phase);
      const size = p.r * (0.6 + 0.6 * twinkle);
      glow(env, p.c, p.x, p.y, size * 4, 0.3 * twinkle * k);
      // A four-pointed star, as the Legend era draws them
      ctx.globalAlpha = Math.min(1, (0.2 + 0.5 * twinkle) * k);
      ctx.fillStyle = colors[p.c % colors.length];
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - size);
      ctx.quadraticCurveTo(p.x, p.y, p.x + size, p.y);
      ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + size);
      ctx.quadraticCurveTo(p.x, p.y, p.x - size, p.y);
      ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - size);
      ctx.fill();
    }
  },
};

// Exported for the tests, which run every show for a few frames against a stand-in canvas
export const SHOWS: Record<BackdropMode, Show> = { embers, ribbons, ripples, warp, lattice, sparks } as Record<BackdropMode, Show>;
const FADE_SECONDS = 1.2;

export default function LandingBackdrop({ mode }: { mode: BackdropMode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wanted = useRef<BackdropMode | null>(mode);
  useEffect(() => { wanted.current = mode; }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const root = document.documentElement;
    const phone = window.innerWidth < 640;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const frameGap = phone ? 1 / 30 : 0;

    let colors: string[] = [];
    let glows: HTMLCanvasElement[] = [];
    let dark = false;
    const readTheme = () => {
      const styles = getComputedStyle(root);
      colors = PALETTE_VARS.map(v => styles.getPropertyValue(v).trim()).filter(Boolean);
      if (colors.length === 0) colors = ["#B68C0B"];
      glows = colors.map(glowSprite);
      dark = root.classList.contains("dark");
    };
    readTheme();

    let w = 0, h = 0;
    // On stage right now: the show being faded in, and any still fading out
    let running: { mode: BackdropMode; state: unknown; alpha: number }[] = [];
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Layouts are sized to the canvas, so start the shows again at the new size
      running = [];
    };
    resize();

    const started = performance.now();
    let last = started;
    let lastScroll = window.scrollY;
    let boost = 0;
    let raf = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = (now - last) / 1000;
      if (dt < frameGap) return;
      last = now;
      const step = Math.min(dt, 0.05);

      // How fast the page is moving, eased so the shows surge and settle rather than twitch
      const scroll = window.scrollY;
      const speed = Math.min(1, Math.abs(scroll - lastScroll) / Math.max(dt, 0.001) / 2600);
      lastScroll = scroll;
      boost += (speed - boost) * Math.min(1, step * (speed > boost ? 3 : 1.5));

      const target = wanted.current;
      if (target && !running.some(show => show.mode === target)) {
        const env: Env = { ctx, w, h, t: 0, dt: 0, boost: 0, colors, glows, k: 0, density: phone ? 0.5 : 1, dark };
        running.push({ mode: target, state: SHOWS[target].init(env), alpha: 0 });
      }

      ctx.clearRect(0, 0, w, h);
      // Light adds up on a dark page; on a light page the marks are simply drawn, without glows
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      running = running.filter(show => {
        show.alpha = Math.max(0, Math.min(1, show.alpha + (show.mode === target ? 1 : -1) * step / FADE_SECONDS));
        if (show.alpha <= 0 && show.mode !== target) return false;
        const env: Env = { ctx, w, h, t: (now - started) / 1000, dt: step, boost, colors, glows, k: show.alpha * (dark ? 0.8 : 0.7), density: phone ? 0.5 : 1, dark };
        ctx.setLineDash([]);
        SHOWS[show.mode].draw(show.state, env);
        return true;
      });
      ctx.globalAlpha = 1;
    };

    const start = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const onVisibility = () => (document.hidden ? stop() : start());

    // Palette changes with rank and theme
    const observer = new MutationObserver(readTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["class", "data-rank"] });

    start();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      observer.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}
