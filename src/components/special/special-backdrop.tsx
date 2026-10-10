"use client";

import { useEffect, useRef } from "react";
import type { SpecialId } from "@/lib/special-days";
import { SPECIAL_LOOKS, type BackdropExtra, type Drift, type DriftShape } from "./special-themes";

// A special day's backdrop, in place of the era ambience: a soft wash of the day's colours and a
// canvas of things drifting through it (snow, petals, leaves, bats...). Quiet on purpose: few
// shapes, low contrast. Same budget as the era particles: one 2D canvas, pixel ratio capped at
// 1.5, 30fps, fewer shapes on phones, paused when the tab is hidden, still with reduced motion.

const PALETTE_VARS = ["--tm-yellow", "--tm-orange-light", "--tm-orange-dark", "--tm-red", "--tm-blue-gray"];

interface Particle {
  drift: Drift;
  x: number; y: number;
  size: number; fall: number; alpha: number;
  phase: number; color: number;
  // "pixel" shapes blink in a new place when this runs out
  life: number;
  w: number;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function spawn(drift: Drift, w: number, h: number, anywhere: boolean): Particle {
  const fall = rand(drift.fall[0], drift.fall[1]);
  const size = rand(drift.size[0], drift.size[1]);
  const margin = size * 3;
  // New arrivals come in from the edge they are moving away from
  const y = anywhere || Math.abs(fall) < 4 ? rand(0, h) : fall > 0 ? -margin : h + margin;
  return {
    drift, x: rand(0, w), y, size, fall,
    alpha: rand(drift.alpha[0], drift.alpha[1]),
    phase: rand(0, Math.PI * 2),
    color: drift.colors[Math.floor(Math.random() * drift.colors.length)],
    life: rand(0.2, 1.6),
    w: rand(0.3, 3),
  };
}

const SHAPES: Record<DriftShape, (ctx: CanvasRenderingContext2D, p: Particle, t: number) => void> = {
  dot(ctx, p) {
    ctx.beginPath();
    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
    ctx.fill();
  },
  flake(ctx, p) {
    ctx.lineWidth = Math.max(1, p.size / 6);
    ctx.beginPath();
    for (let arm = 0; arm < 3; arm++) {
      const a = (arm * Math.PI) / 3;
      ctx.moveTo(-Math.cos(a) * p.size, -Math.sin(a) * p.size);
      ctx.lineTo(Math.cos(a) * p.size, Math.sin(a) * p.size);
    }
    ctx.stroke();
  },
  heart(ctx, p) {
    const s = p.size;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.9);
    ctx.bezierCurveTo(-s * 1.5, -s * 0.2, -s * 0.6, -s * 1.2, 0, -s * 0.4);
    ctx.bezierCurveTo(s * 0.6, -s * 1.2, s * 1.5, -s * 0.2, 0, s * 0.9);
    ctx.fill();
  },
  petal(ctx, p) {
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  },
  leaf(ctx, p) {
    const s = p.size;
    ctx.beginPath();
    ctx.moveTo(-s, 0);
    ctx.quadraticCurveTo(0, -s * 0.75, s, 0);
    ctx.quadraticCurveTo(0, s * 0.75, -s, 0);
    ctx.fill();
  },
  bubble(ctx, p) {
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
    ctx.stroke();
  },
  star(ctx, p, t) {
    const s = p.size * (0.6 + 0.5 * Math.sin(t * 1.4 + p.phase));
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(0, 0, s, 0);
    ctx.quadraticCurveTo(0, 0, 0, s);
    ctx.quadraticCurveTo(0, 0, -s, 0);
    ctx.quadraticCurveTo(0, 0, 0, -s);
    ctx.fill();
  },
  bat(ctx, p, t) {
    // Two wings that beat
    const s = p.size;
    const flap = Math.sin(t * 9 + p.phase) * s * 0.5;
    ctx.beginPath();
    ctx.moveTo(-s * 1.6, -flap);
    ctx.quadraticCurveTo(-s * 0.8, -s * 0.6, 0, 0);
    ctx.quadraticCurveTo(s * 0.8, -s * 0.6, s * 1.6, -flap);
    ctx.quadraticCurveTo(s * 0.7, s * 0.2, 0, s * 0.45);
    ctx.quadraticCurveTo(-s * 0.7, s * 0.2, -s * 1.6, -flap);
    ctx.fill();
  },
  pixel(ctx, p) {
    ctx.fillRect(-p.size, -p.size * 0.12 * p.w, p.size * 2, p.size * 0.24 * p.w);
  },
  page(ctx, p) {
    ctx.lineWidth = 1;
    ctx.strokeRect(-p.size * 0.4, -p.size * 0.5, p.size * 0.8, p.size);
  },
};

// The one theme-specific stroke on top of the drifting shapes
function drawExtra(extra: BackdropExtra, ctx: CanvasRenderingContext2D, w: number, h: number, t: number, colors: string[]) {
  if (!extra) return;
  ctx.setLineDash([]);
  if (extra === "waves") {
    // Two lines of surf along the bottom
    ctx.strokeStyle = colors[0];
    ctx.lineWidth = 1.5;
    [0, 1].forEach(row => {
      ctx.globalAlpha = 0.22 - row * 0.08;
      ctx.beginPath();
      for (let x = 0; x <= w + 20; x += 20) {
        const y = h - 46 - row * 30 + Math.sin(x * 0.012 + t * (0.6 + row * 0.25) + row * 2) * 9;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
  } else if (extra === "shooting") {
    // One shooting star every eight seconds or so
    const cycle = (t % 8) / 1.1;
    if (cycle < 1) {
      const seed = Math.floor(t / 8);
      const x = w * (0.15 + ((seed * 0.37) % 0.6)) + cycle * w * 0.22;
      const y = h * (0.08 + ((seed * 0.53) % 0.3)) + cycle * h * 0.14;
      ctx.strokeStyle = colors[1] ?? colors[0];
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.7 * Math.sin(cycle * Math.PI);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 70, y - 44);
      ctx.stroke();
    }
  } else if (extra === "route") {
    // A dashed trail wandering across the map, with an X where it ends
    ctx.strokeStyle = colors[2] ?? colors[0];
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.2;
    ctx.setLineDash([7, 9]);
    ctx.lineDashOffset = -t * 6;
    ctx.beginPath();
    ctx.moveTo(w * 0.06, h * 0.82);
    ctx.bezierCurveTo(w * 0.3, h * 0.55, w * 0.42, h * 0.95, w * 0.62, h * 0.6);
    ctx.bezierCurveTo(w * 0.72, h * 0.42, w * 0.8, h * 0.4, w * 0.9, h * 0.22);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(w * 0.9 - 7, h * 0.22 - 7); ctx.lineTo(w * 0.9 + 7, h * 0.22 + 7);
    ctx.moveTo(w * 0.9 + 7, h * 0.22 - 7); ctx.lineTo(w * 0.9 - 7, h * 0.22 + 7);
    ctx.stroke();
  } else if (extra === "scan") {
    // A thin line running down the screen, as on a failing monitor
    ctx.fillStyle = colors[0];
    ctx.globalAlpha = 0.14;
    ctx.fillRect(0, ((t * 90) % (h + 40)) - 20, w, 2);
  }
  // "hearth" needs no stroke: the fire is the warm glow in the day's wash
}

// `contained` is for the landing page's preview: the canvas fills its parent instead of the
// screen, and the wash is left to the caller
export default function SpecialBackdrop({ id, contained }: { id: SpecialId; contained?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const look = SPECIAL_LOOKS[id];

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const phone = window.innerWidth < 640;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const { drifts, extra } = SPECIAL_LOOKS[id];

    let colors: string[] = [];
    const readColors = () => {
      // Read off the canvas, not the root: a preview wears the palette on an element of its own
      const styles = getComputedStyle(canvas);
      colors = PALETTE_VARS.map(v => styles.getPropertyValue(v).trim() || "#888");
    };
    readColors();

    let w = 0, h = 0;
    let particles: Particle[] = [];
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = drifts.flatMap(drift =>
        Array.from({ length: Math.max(1, Math.round(drift.count * (phone ? 0.55 : 1))) }, () => spawn(drift, w, h, true)));
    };
    resize();

    const draw = (t: number, dt: number) => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const { drift } = p;
        if (drift.shape === "pixel") {
          // Glitch blocks don't move: they blink somewhere else
          p.life -= dt;
          if (p.life <= 0) particles[i] = spawn(drift, w, h, true);
        } else if (drift.shape === "bat") {
          p.x += (24 + p.size * 2) * dt * (p.phase > Math.PI ? 1 : -1);
          p.y += p.fall * dt + Math.sin(t * 1.3 + p.phase) * 0.4;
          if (p.x < -40) p.x = w + 40; else if (p.x > w + 40) p.x = -40;
        } else {
          p.y += p.fall * dt;
          const margin = p.size * 4;
          if (p.y > h + margin || p.y < -margin) particles[i] = spawn(drift, w, h, false);
        }
        const x = p.x + (drift.sway ? Math.sin(t * 0.7 + p.phase) * drift.sway : 0);
        const twinkle = drift.shape === "star" ? 0.45 + 0.55 * Math.sin(t * 1.4 + p.phase) : 1;
        ctx.globalAlpha = p.alpha * twinkle;
        ctx.fillStyle = ctx.strokeStyle = colors[p.color % colors.length];
        ctx.save();
        ctx.translate(x, p.y);
        if (drift.spin) ctx.rotate(p.phase + t * drift.spin * (p.phase > Math.PI ? 1 : -1));
        SHAPES[drift.shape](ctx, p, t);
        ctx.restore();
      }
      drawExtra(extra, ctx, w, h, t, colors);
      ctx.globalAlpha = 1;
    };

    let raf = 0;
    const started = performance.now();
    let last = started;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = (now - last) / 1000;
      if (dt < 1 / 30) return;
      last = now;
      draw((now - started) / 1000, Math.min(dt, 0.1));
    };

    const start = () => { if (!raf && !reduced) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const onVisibility = () => (document.hidden ? stop() : start());

    // The palette changes with light and dark
    const observer = new MutationObserver(readColors);
    observer.observe(root, { attributes: true, attributeFilter: ["class", "data-special"] });

    draw(0, 0);
    start();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      observer.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [id]);

  return (
    <div className={contained ? "absolute inset-0 overflow-hidden pointer-events-none" : "tm-ambient"} aria-hidden>
      <div className="tm-grain" />
      {!contained && <div className="absolute inset-0" style={{ background: look.wash }} />}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
