"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { AmbientLayer, ParticleKind } from "@/lib/eras";
import { useEra } from "./theme-provider";
import { useMounted } from "@/lib/use-mounted";

const PALETTE_VARS = ["--tm-yellow", "--tm-orange-light", "--tm-red", "--tm-blue-gray", "--tm-orange-dark"];

interface Particle {
  x: number; y: number; r: number; vy: number;
  phase: number; c: number; a: number; spin: number;
}

function spawn(kind: ParticleKind, w: number, h: number, initial: boolean): Particle {
  const base = {
    x: Math.random() * w,
    y: initial ? Math.random() * h : h + 6,
    phase: Math.random() * Math.PI * 2,
    c: Math.floor(Math.random() * 5),
    spin: (Math.random() - 0.5) * 0.8,
  };
  switch (kind) {
    case "embers": return { ...base, r: 0.8 + Math.random() * 1.6, vy: 28 + Math.random() * 44, a: 0.5 + Math.random() * 0.5 };
    case "glyphs": return { ...base, r: 2 + Math.random() * 2.5, vy: 5 + Math.random() * 8, a: 0.25 + Math.random() * 0.35 };
    case "stars": return { ...base, r: 1.5 + Math.random() * 3, vy: 2 + Math.random() * 4, a: 0.4 + Math.random() * 0.5 };
    default: return { ...base, r: 0.6 + Math.random() * 1.6, vy: 6 + Math.random() * 14, a: 0.25 + Math.random() * 0.5 };
  }
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

// Era particles. Capped at 30fps, DPR 1.5, fewer on phones, paused when the tab is hidden.
function ParticleCanvas({ kind, count, multicolor }: { kind: ParticleKind; count: number; multicolor: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const n = window.innerWidth < 640 ? Math.round(count * 0.6) : count;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    let colors: string[] = [];
    const readColors = () => {
      const styles = getComputedStyle(root);
      const all = PALETTE_VARS.map(v => styles.getPropertyValue(v).trim()).filter(Boolean);
      // Embers burn in the warm pair; single-colour eras use the primary accent
      colors = multicolor ? all : kind === "embers" ? [all[4], all[0]] : [all[0]];
    };
    readColors();

    let w = 0, h = 0;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const particles = Array.from({ length: n }, () => spawn(kind, w, h, true));

    const draw = (t: number, dt: number) => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y -= p.vy * dt;
        if (p.y < -8) particles[i] = spawn(kind, w, h, false);

        ctx.fillStyle = colors[p.c % colors.length] || "#fff";
        if (kind === "embers") {
          // Fade as they rise, with a flicker
          const life = Math.max(0, p.y / h);
          ctx.globalAlpha = p.a * life * (0.7 + 0.3 * Math.sin(t / 90 + p.phase));
          const x = p.x + Math.sin(t / 900 + p.phase) * 18;
          ctx.beginPath();
          ctx.arc(x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        } else if (kind === "glyphs") {
          ctx.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(t / 1400 + p.phase));
          const x = p.x + Math.sin(t / 3000 + p.phase) * 10;
          ctx.save();
          ctx.translate(x, p.y);
          ctx.rotate(p.phase + (t / 1000) * p.spin);
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = 1;
          ctx.strokeRect(-p.r, -p.r, p.r * 2, p.r * 2);
          ctx.restore();
        } else if (kind === "stars") {
          const tw = 0.5 + 0.5 * Math.sin(t / 600 + p.phase);
          ctx.globalAlpha = p.a * (0.25 + 0.75 * tw);
          drawStar(ctx, p.x, p.y, p.r * (0.6 + 0.6 * tw));
        } else {
          ctx.globalAlpha = p.a;
          const x = p.x + Math.sin(t / 2600 + p.phase) * 12;
          ctx.beginPath();
          ctx.arc(x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = (now - last) / 1000;
      if (dt < 1 / 30) return;
      last = now;
      draw(now, Math.min(dt, 0.1));
    };

    const start = () => { if (!raf && !reduced) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const onVisibility = () => (document.hidden ? stop() : start());

    // Palette changes with rank and theme
    const observer = new MutationObserver(readColors);
    observer.observe(root, { attributes: true, attributeFilter: ["class", "data-rank"] });

    draw(performance.now(), 0);
    start();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      observer.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [kind, count, multicolor]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

function Layer({ layer }: { layer: AmbientLayer }) {
  switch (layer) {
    case "hearth":
      return <><div className="tm-hearth" /><div className="tm-vignette" /></>;
    case "mesh":
      return <><div className="tm-blob tm-blob-a" /><div className="tm-blob tm-blob-b" /><div className="tm-blob tm-blob-c" /></>;
    case "grid":
      return <div className="tm-grid"><div className="tm-scanline" /></div>;
    case "rays":
      return <div className="tm-rays"><div className="tm-ray tm-ray-a" /><div className="tm-ray tm-ray-b" /><div className="tm-ray tm-ray-c" /></div>;
    case "aurora":
      return <><div className="tm-aurora tm-aurora-a" /><div className="tm-aurora tm-aurora-b" /><div className="tm-aurora tm-aurora-c" /></>;
    case "runes":
      return <div className="tm-runes"><div className="tm-rune tm-rune-a" /><div className="tm-rune tm-rune-b" /><div className="tm-rune tm-rune-c" /></div>;
    case "prism":
      return <div className="tm-prism" />;
  }
}

export default function EraAmbient() {
  const era = useEra();
  const { layers, particles } = era.ambient;
  // The pre-rendered HTML can't know the saved era, so it would show Era I's layers and then
  // cross-fade on every load. Draw the era layers only once hydrated (the grain is era-neutral).
  const mounted = useMounted();

  return (
    <div className="tm-ambient" aria-hidden>
      <div className="tm-grain" />
      <AnimatePresence>
        {mounted && <motion.div
          key={era.id}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        >
          {layers.map(layer => <Layer key={layer} layer={layer} />)}
          {particles && <ParticleCanvas {...particles} />}
        </motion.div>}
      </AnimatePresence>
    </div>
  );
}
