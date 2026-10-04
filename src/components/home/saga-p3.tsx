"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { stagger, utils, type Timeline } from "animejs";
import { prefersReducedMotion } from "@/lib/scroll-fx";

// Persona 3 days: the growth saga is played on the protagonist's music player, the slim stick
// Walkman he wears on a neck strap, and the scenes are its tracks.
//
// - The player hangs at the right of the stage from its strap. It drops in and swings to rest; on
//   every track change it rolls round its long axis, its jog dial turns and it swings from the kick.
//   Its OLED strip shows the track number, the time on this track, and the scene's name.
// - The earbuds hang at the left and whip after each change, with sound rings leaving them.
// - The orbit in the middle is the disc being played: between tracks it flips, tumbles or spins in
//   3D, showing an engraved back mid-turn. (The scenes drawn on it are untouched.)
// - Behind it all: a huge track number that slides out and in, an equalizer that follows the
//   scroll, and bubbles rising through the water.

const hidden = { backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" } as const;
const pad = (n: number, width: number) => String(n).padStart(width, "0");

// Everything on the stage around the orbit
export function P3Stage({ scene, label }: { scene: number; label: string }) {
  const eq = useRef<HTMLDivElement>(null);
  useEqualizer(eq);
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none motion-reduce:hidden">
      {/* The track number, huge and sideways at the left edge, as in the game's menu */}
      <div className="absolute -left-[0.1em] top-0 h-full flex items-center" style={{ fontSize: "min(30svh, 46vw)" }}>
        <div data-saga="p3-num" className="rotate-90">
          <span className="block italic font-black leading-none tracking-[-0.12em] text-tm-blue-gray/25" style={{ fontFamily: "var(--font-p3-menu)" }}>
            {pad(scene + 1, 2)}
          </span>
        </div>
      </div>

      {/* The equalizer, across the middle of the stage behind the disc */}
      <div ref={eq} data-saga="p3-eq" className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[26svh] flex items-center justify-between px-[3%]">
        {Array.from({ length: 30 }, (_, i) => {
          // Fainter towards the middle, where the bars sit behind the disc (per bar, so nothing
          // needs masking while they move)
          const fromMiddle = Math.abs(i - 14.5) / 14.5;
          return (
            <span key={i} data-saga="p3-bar" className="w-[3px] sm:w-[5px] h-full rounded-full bg-tm-yellow/30" style={{ transform: "scaleY(0.08)", opacity: 0.18 + 0.82 * fromMiddle * fromMiddle }} />
          );
        })}
      </div>

      {/* Bubbles */}
      {[8, 19, 33, 52, 68, 81, 93].map((left, i) => (
        <motion.span
          key={left}
          className="absolute bottom-0 rounded-full border border-tm-orange-light/50"
          style={{ left: `${left}%`, width: 6 + (i % 3) * 4, height: 6 + (i % 3) * 4 }}
          animate={{ y: ["0svh", "-105svh"], x: [0, i % 2 ? 14 : -14, 0], opacity: [0, 0.8, 0] }}
          transition={{ duration: 7 + (i % 4) * 1.6, repeat: Infinity, delay: i * 1.1, ease: "easeOut" }}
        />
      ))}

      <Earbuds />
      <Walkman scene={scene} label={label} />
    </div>
  );
}

// The earbuds, hanging at the left from somewhere above the screen
function Earbuds() {
  return (
    <>
      {[{ x: "2%", length: "33%", flip: 1 }, { x: "8%", length: "43%", flip: -1 }].map((bud, i) => (
        <div key={i} data-saga="p3-bud" data-flip={bud.flip} className="absolute top-0 w-[clamp(12px,3.2vw,22px)] origin-top" style={{ left: bud.x, height: bud.length }}>
          {/* The script swings the wrapper; the idle sway is the inner element's */}
          <motion.div
            className="relative h-full w-full origin-top"
            animate={{ rotate: [2.5 * bud.flip, -2.5 * bud.flip, 2.5 * bud.flip] }}
            transition={{ duration: 3.6 + i * 0.7, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="absolute left-1/2 top-0 bottom-[1.2em] w-[2px] -translate-x-1/2 bg-tm-blue-gray/70" />
            {/* Radii are inline: P3 days square off arbitrary rounded-[..] classes (see persona.css) */}
            <span className="absolute bottom-0 left-0 w-full aspect-[1/1.5] bg-tm-yellow" style={{ borderRadius: "50%" }}>
              <span className="absolute inset-[26%]" style={{ borderRadius: "50%", background: "color-mix(in srgb, var(--background) 70%, transparent)" }} />
            </span>
            {/* Sound leaving the earbud */}
            {[0, 1].map(ring => (
              <span key={ring} data-saga="p3-wave" className="absolute left-1/2 bottom-0 w-[190%] aspect-square -translate-x-1/2 rounded-full border-2 border-tm-yellow" />
            ))}
          </motion.div>
        </div>
      ))}
    </>
  );
}

// The stick player on its strap. `p3-hang` is the pendulum (strap and player, pivoting at the
// top of the screen); `p3-stick` is the player itself, which rolls round its long axis.
function Walkman({ scene, label }: { scene: number; label: string }) {
  // The time on this track: it restarts whenever the scene changes
  const [clock, setClock] = useState({ scene, since: 0, now: 0 });
  if (clock.scene !== scene) setClock({ scene, since: clock.now, now: clock.now });
  useEffect(() => {
    const id = setInterval(() => setClock(c => ({ ...c, now: c.now + 1 })), 1000);
    return () => clearInterval(id);
  }, []);
  const seconds = clock.now - clock.since;

  return (
    <div data-saga="p3-hang" className="absolute top-0 right-[2%] sm:right-[7%] h-[64%] w-[clamp(26px,7vw,48px)] origin-top">
      {/* The neck strap, a flat band running up out of the screen, and its clip */}
      <span className="absolute left-1/2 top-0 bottom-[46%] w-[26%] -translate-x-1/2 bg-tm-blue-gray/45" />
      <span className="absolute left-1/2 bottom-[44%] w-[46%] h-[4%] -translate-x-1/2 rounded-sm bg-tm-purple-dark" />

      <div className="absolute inset-x-0 bottom-0 h-[46%]" style={{ perspective: 600 }}>
        <div data-saga="p3-stick" className="relative h-full w-full [transform-style:preserve-3d]">
          {/* Front: the jog dial on top, the dark body with its OLED strip, and the end cap */}
          <div className="absolute inset-0 flex flex-col items-center" style={hidden}>
            <span
              data-saga="p3-jog"
              className="relative w-[118%] h-[17%] border border-white/60"
              style={{ borderRadius: "18%", background: "repeating-linear-gradient(90deg, #c9d2dc 0 2px, #8e99a6 2px 4px)", backgroundSize: "200% 100%" }}
            >
              <span className="absolute inset-x-0 top-[38%] text-center p3-hud text-[6px] leading-none text-[#3c4652]">HOLD</span>
            </span>
            <span className="relative grow w-full bg-[#0a0d12] border-x border-white/25 overflow-hidden">
              {/* Volume buttons */}
              <span className="absolute left-1/2 top-[5%] w-[52%] h-[9%] -translate-x-1/2 rounded-sm bg-[#aab4bf]" />
              <span className="absolute left-1/2 top-[16%] w-[52%] h-[9%] -translate-x-1/2 rounded-sm bg-[#aab4bf]" />
              {/* The OLED: read along the stick, as on the real thing */}
              <span data-saga="p3-oled" className="absolute left-1/2 top-[64%] -translate-x-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap p3-hud leading-[1.25] text-[clamp(7px,1.9vw,10px)] text-[#e8f6ff] text-left">
                <span className="block">♫{pad(scene + 1, 4)} {pad(Math.floor(seconds / 60), 2)}:{pad(seconds % 60, 2)}</span>
                <span className="block text-tm-orange-light">{label.slice(0, 16)}</span>
                <span className="block opacity-60">MP3 320kbps</span>
              </span>
            </span>
            <span className="w-[92%] h-[6%] rounded-b-md bg-[#b9c2cc] border border-white/50" />
          </div>
          {/* Back: brushed silver, seen as it rolls */}
          <div className="absolute inset-0 flex flex-col items-center" style={{ ...hidden, transform: "rotateY(180deg)" }}>
            <span className="w-[118%] h-[17%] bg-[#aab4bf] border border-white/60" style={{ borderRadius: "18%" }} />
            <span className="grow w-full border-x border-white/40" style={{ background: "linear-gradient(90deg, #8e99a6, #dfe6ee 45%, #9aa5b1)" }} />
            <span className="w-[92%] h-[6%] rounded-b-md bg-[#b9c2cc] border border-white/50" />
          </div>
        </div>
      </div>
    </div>
  );
}

// The back of the disc, inside the element that turns: hidden until the orbit flips over
export function P3DiscBack() {
  return (
    <div
      aria-hidden
      className="absolute -inset-[3%] rounded-full bg-tm-purple-dark flex flex-col items-center justify-center gap-[3%] text-tm-yellow pointer-events-none motion-reduce:hidden"
      style={{ ...hidden, transform: "rotateY(180deg)", boxShadow: "inset 0 0 0 0.3em var(--tm-yellow), inset 0 0 0 1.4em color-mix(in srgb, var(--tm-yellow) 16%, transparent)" }}
    >
      <svg viewBox="-50 -50 100 100" className="w-[26%]">
        <path d="M 12 -38 A 40 40 0 1 0 12 38 A 30 30 0 1 1 12 -38 Z" fill="currentColor" />
      </svg>
      <span className="italic font-black uppercase tracking-[0.3em] text-[clamp(14px,3.4vw,26px)]" style={{ fontFamily: "var(--font-p3-menu)" }}>S.E.E.S.</span>
      <span className="p3-hud text-[9px] sm:text-[11px] uppercase text-tm-orange-light">Memento mori</span>
    </div>
  );
}

// The moves, added to the saga's scroll script. `froms` are the moments each scene takes the stage
// (the first is the opening, so track changes start from the second). Times are in the script's
// units (svh of scroll), like everything else in it.
export function addP3Script(timeline: Timeline, froms: number[]) {
  utils.set("[data-saga=p3-eq], [data-saga=p3-num], [data-saga=p3-wave], [data-saga=p3-oled]", { opacity: 0 });
  const buds = utils.$("[data-saga=p3-bud]");

  // The opening: the player drops in on its strap and swings to rest, the earbuds fall and swing,
  // the OLED boots, and the equalizer and the track number arrive
  timeline
    .add("[data-saga=p3-hang]", { translateY: ["-110%", "0%"], duration: 26, ease: "out(3)" }, 0)
    .add("[data-saga=p3-hang]", { rotate: [26, -17, 10, -5, 0], duration: 52, ease: "inOut(2)" }, 0)
    .add("[data-saga=p3-stick]", { rotateY: [-540, 0], duration: 40, ease: "out(3)" }, 0)
    .add("[data-saga=p3-oled]", { opacity: [0, 1, 0.2, 1], duration: 14, ease: "linear" }, 34)
    .add("[data-saga=p3-eq]", { opacity: [0, 1], duration: 16 }, 34)
    .add("[data-saga=p3-num]", { opacity: [0, 1], translateY: ["70%", "0%"], duration: 18 }, 36);
  buds.forEach((bud, i) => {
    const flip = Number((bud as HTMLElement).dataset.flip);
    timeline
      .add(bud, { translateY: ["-110%", "0%"], duration: 24, ease: "out(3)" }, 2 + i * 4)
      .add(bud, { rotate: [-30 * flip, 20 * flip, -11 * flip, 5 * flip, 0], duration: 50, ease: "inOut(2)" }, 2 + i * 4);
  });

  froms.slice(1).forEach((at, i) => {
    const way = i % 2 ? -1 : 1;
    const move = i % 3;
    // The disc changes sides. Three moves in turn: a side flip past its engraved back, a forward
    // tumble, and a spin with a dip
    if (move === 0) {
      timeline.add("[data-saga=device]", { rotateY: [0, 360 * way], duration: 30, ease: "inOut(3)" }, at - 15);
    } else if (move === 1) {
      timeline.add("[data-saga=device]", { rotateX: [0, -360], duration: 30, ease: "inOut(3)" }, at - 15);
    } else {
      timeline.add("[data-saga=device]", { rotate: [0, 360 * way], duration: 30, ease: "inOut(3)" }, at - 15);
    }
    timeline
      .add("[data-saga=device]", { scale: [1, move === 2 ? 0.62 : 0.84, 1], duration: 30, ease: "inOut(2)" }, at - 15)
      // The player: the jog dial turns, the stick rolls round its long axis, and it swings from the kick
      .add("[data-saga=p3-jog]", { backgroundPositionX: ["0%", `${way * 140}%`], duration: 16, ease: "inOut(2)" }, at - 16)
      .add("[data-saga=p3-stick]", { rotateY: [0, 720 * way], duration: 28, ease: "inOut(3)" }, at - 12)
      .add("[data-saga=p3-hang]", { rotate: [0, 13 * way, -8 * way, 4 * way, 0], duration: 44, ease: "inOut(2)" }, at - 12)
      // The OLED blanks while the next track loads
      .add("[data-saga=p3-oled]", { opacity: [1, 0, 0, 1], duration: 18, ease: "linear" }, at - 9)
      // The old track number leaves upward and the new one comes up from below
      .add("[data-saga=p3-num]", { opacity: [1, 0], translateY: ["0%", "-70%"], duration: 9, ease: "in(2)" }, at - 10)
      .add("[data-saga=p3-num]", { opacity: [0, 1], translateY: ["70%", "0%"], duration: 12, ease: "out(3)" }, at + 1)
      // Sound leaves the earbuds as the track starts
      .add("[data-saga=p3-wave]", { opacity: [0.9, 0], scale: [0.5, 3.4], duration: 18, delay: stagger(3), ease: "out(2)" }, at + 3);
    buds.forEach(bud => {
      const flip = Number((bud as HTMLElement).dataset.flip);
      const swing = move === 1 ? flip : way;
      timeline.add(bud, { rotate: [0, 30 * swing, -18 * swing, 8 * swing, 0], duration: 42, ease: "inOut(2)" }, at - 13);
    });
  });
}

// The equalizer never stops: the bars idle low and jump with the scroll speed. Each bar follows
// its own mix of two slow waves, so the row moves like music and never repeats exactly. Only runs
// while it is on screen.
function useEqualizer(row: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = row.current;
    if (!el || prefersReducedMotion()) return;
    const bars = Array.from(el.querySelectorAll<HTMLElement>("[data-saga=p3-bar]"));
    if (!bars.length) return;

    let raf = 0;
    let last = 0;
    let lastY = window.scrollY;
    let energy = 0.25;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (dt <= 0) return;
      const scrolled = Math.abs(window.scrollY - lastY) / dt;
      lastY = window.scrollY;
      const target = 0.25 + Math.min(0.75, scrolled / 1400);
      energy += (target - energy) * Math.min(1, dt * (target > energy ? 9 : 2.2));
      const t = now / 1000;
      bars.forEach((bar, i) => {
        const wave = 0.5 + 0.5 * Math.sin(t * (2.1 + (i % 5) * 0.7) + i * 1.7) * Math.sin(t * 0.9 + i * 0.37);
        // Taller towards the middle of the row
        const arch = 0.45 + 0.55 * Math.sin((i / (bars.length - 1)) * Math.PI);
        bar.style.transform = `scaleY(${Math.max(0.05, wave * energy * arch).toFixed(3)})`;
      });
    };
    const start = () => { if (!raf) { last = performance.now(); lastY = window.scrollY; raf = requestAnimationFrame(frame); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    let visible = false;
    const sync = () => (visible && !document.hidden ? start() : stop());
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [row]);
}
