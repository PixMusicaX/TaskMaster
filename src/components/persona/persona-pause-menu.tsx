"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun, Volume2, VolumeX, X } from "lucide-react";
import type { PersonaStyle } from "@/lib/persona";
import { isMuted, setMuted, sfx, subscribeMuted } from "@/lib/sfx";
import { useTheme } from "@/components/theme-provider";
import { useProgress } from "@/components/progress/progress-provider";
import { cn } from "@/lib/utils";
import { PERSONA_MENU_ITEMS } from "./persona-menu-items";

// The game's pause menu, which on Persona days is the only menu: P3 Reload's upside-down Makoto
// under water, P4's yellow sky with Yu, P5's red hand and Joker. Arrow keys move, Enter opens,
// Escape closes. Assets are in public/persona; see CREDITS.md.
export default function PersonaPauseMenu({ style, open, onClose }: { style: PersonaStyle; open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { profile } = useProgress();
  const muted = useSyncExternalStore(subscribeMuted, isMuted, () => false);
  const current = Math.max(0, PERSONA_MENU_ITEMS.findIndex(i => i.href === pathname));
  const [selected, setSelected] = useState(current);
  const moveSound = useRef<HTMLAudioElement | null>(null);

  // Each opening starts on the current page
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSelected(current);
  }

  const selectedRef = useRef(selected);
  useEffect(() => { selectedRef.current = selected; });

  const select = useCallback((index: number) => {
    if (selectedRef.current === index) return;
    selectedRef.current = index;
    setSelected(index);
    if (isMuted()) return;
    const file = style === "p3" ? "/persona/p3-menu-move.wav" : style === "p5" ? "/persona/p5-menu-move.mp3" : null;
    if (!file) return sfx.complete();
    moveSound.current ??= Object.assign(new Audio(file), { volume: 0.45 });
    moveSound.current.currentTime = 0;
    moveSound.current.play().catch(() => {});
  }, [style]);

  useEffect(() => {
    if (!open) return;
    sfx.swoosh();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      else if (e.key === "ArrowDown" || e.key === "s") { e.preventDefault(); select((selectedRef.current + 1) % PERSONA_MENU_ITEMS.length); }
      else if (e.key === "ArrowUp" || e.key === "w") { e.preventDefault(); select((selectedRef.current - 1 + PERSONA_MENU_ITEMS.length) % PERSONA_MENU_ITEMS.length); }
      else if (e.key === "Enter") { router.push(PERSONA_MENU_ITEMS[selectedRef.current].href); onClose(); }
    };
    // Capture phase, so the menu claims the arrow keys before the page under it (the home page's
    // orbit also steps on them, but skips events already handled)
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose, select, router]);

  const dark = theme === "dark";
  const props = { selected, select, onClose, level: profile?.level, xp: profile?.xp };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="pause"
          className="fixed inset-0 z-[420] overflow-hidden select-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          {style === "p3" && <P3Menu {...props} dark={dark} />}
          {style === "p4" && <P4Menu {...props} />}
          {style === "p5" && <P5Menu {...props} />}

          {/* Sound, the P3 day/Dark Hour switch, and close */}
          <div className={cn("absolute top-3 right-3 z-20 flex items-center gap-1.5", toolTone(style))}>
            <button onClick={() => setMuted(!muted)} className="p-2.5 active:scale-90 transition-transform" aria-label={muted ? "Unmute sounds" : "Mute sounds"} aria-pressed={muted}>
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            {style === "p3" && (
              <button onClick={toggleTheme} className="p-2.5 active:scale-90 transition-transform" aria-label="Toggle theme">
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            )}
            <button onClick={onClose} className="p-2.5 active:scale-90 transition-transform" aria-label="Close menu">
              <X size={20} strokeWidth={2.6} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function toolTone(style: PersonaStyle) {
  switch (style) {
    case "p5": return "[&>button]:bg-black [&>button]:text-white [&>button]:border-2 [&>button]:border-white [&>button]:-rotate-6";
    case "p4": return "[&>button]:bg-[#2a1533] [&>button]:text-[#ffe100] [&>button]:rounded-full";
    default: return "[&>button]:text-white [&>button]:drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)]";
  }
}

interface MenuProps {
  selected: number;
  select: (index: number) => void;
  onClose: () => void;
  level?: number;
  xp?: number;
}

// ======================= P3 Reload =======================

// Rotation and offset per row, after the game's fanned list
const P3_LAYOUT = [
  { rotate: -18, x: -40, z: 1 },
  { rotate: -12, x: 0, z: 0 },
  { rotate: -15, x: -36, z: 1 },
  { rotate: -6, x: -14, z: 2 },
  { rotate: -3, x: -48, z: 1 },
  { rotate: 6, x: 0, z: 0 },
];
const P3_DESCRIPTIONS = ["Back to the dorm", "View Calendar", "Read your Diary", "View Social Links", "View Records", "View Settings"];
const P3_COLORS = ["#16CFFB", "#7DE6FD", "#77FEFC"];
// The white slash and the pink one behind it (from the game's cursor)
const P3_CURSOR = "polygon(4% 96%, 100% 4%, 84% 100%)";
const P3_CURSOR_BACK = "polygon(-6% 100%, 104% 0%, 82% 98%)";

function P3Menu({ selected, select, onClose, dark }: MenuProps & { dark: boolean }) {
  const [src] = useState(() => (window.matchMedia("(min-width: 768px)").matches ? "/persona/p3-menu.mp4" : "/persona/p3-menu-mobile.mp4"));
  // Day is the game's blue; the Dark Hour turns the water green
  const tint = dark ? "hue-rotate(-95deg) saturate(1.15) brightness(0.9)" : undefined;
  const colors = dark ? ["#5CFF9A", "#9DFFC4", "#C8FF8A"] : P3_COLORS;

  return (
    <div className="absolute inset-0 bg-[#015FCC]" style={{ fontFamily: "var(--font-p3-menu)" }}>
      <motion.video
        className="absolute inset-0 h-full w-full object-cover object-[22%_center] md:object-left"
        style={{ filter: tint }}
        src={src}
        poster="/persona/p3-menu-poster.webp"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden
        initial={{ y: "-8%", scale: 1.08 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* The page number, huge and sideways down the left edge */}
      <div className="absolute -left-[0.08em] top-0 h-full flex items-center pointer-events-none" aria-hidden>
        <span className="block rotate-90 origin-center italic font-black text-[#808080]/80 leading-none tracking-[-0.12em]" style={{ fontSize: "min(34vh, 40vw)" }}>
          0{selected + 1}
        </span>
      </div>

      <nav className="absolute left-[24%] md:left-[40%] top-[64%] md:top-1/2 -translate-y-1/2 flex flex-col" aria-label="Menu">
        {PERSONA_MENU_ITEMS.map((item, i) => {
          const on = selected === i;
          const l = P3_LAYOUT[i];
          return (
            <motion.div
              key={item.href}
              className="relative -my-[0.04em]"
              style={{ zIndex: on ? 5 : l.z, fontSize: "clamp(38px, 7.2vw, 84px)" }}
              initial={{ x: -120, opacity: 0, rotate: l.rotate }}
              animate={{ x: l.x * 0.6, opacity: 1, rotate: l.rotate }}
              transition={{ delay: 0.12 + i * 0.04, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                href={item.href}
                onClick={onClose}
                onMouseEnter={() => select(i)}
                onFocus={() => select(i)}
                className="relative block px-[0.1em] outline-none"
              >
                {on && (
                  <>
                    <motion.span
                      className="absolute inset-[-0.1em_-0.35em_-0.05em_-0.5em] bg-[#FD77D9]"
                      style={{ clipPath: P3_CURSOR_BACK }}
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 0.15, repeat: Infinity, repeatDelay: 0.6 }}
                    />
                    <span className="absolute inset-[-0.1em_-0.35em_-0.05em_-0.5em] bg-white" style={{ clipPath: P3_CURSOR }} />
                  </>
                )}
                <motion.span
                  className="relative block italic font-black uppercase leading-[0.9] tracking-[-0.09em] whitespace-nowrap"
                  style={{ color: on ? "#000" : colors[(i + 2) % colors.length], textShadow: on ? "none" : "0 2px 10px rgba(0,40,120,0.35)" }}
                  animate={on ? { scale: [1, 1.18, 1.08] } : { scale: 1 }}
                  transition={{ duration: 0.22 }}
                >
                  {item.labels.p3}
                </motion.span>
                {/* Where the white slash crosses the word it turns red */}
                {on && (
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 px-[0.1em] block italic font-black uppercase leading-[0.9] tracking-[-0.09em] whitespace-nowrap text-[#F00] pointer-events-none"
                    style={{ clipPath: P3_CURSOR }}
                    animate={{ scale: [1, 1.18, 1.08] }}
                    transition={{ duration: 0.22 }}
                  >
                    {item.labels.p3}
                  </motion.span>
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Command caption, bottom right */}
      <div className="absolute bottom-4 right-0 flex flex-col items-start text-white" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>
        <p className="italic text-[20px] md:text-[30px] pr-6 md:pr-20 font-bold">{P3_DESCRIPTIONS[selected]}</p>
        <div className="flex items-center w-full gap-1 text-[11px]">
          <span>Command</span>
          <span className="grow h-px bg-white shadow-[0_1px_6px_rgba(0,0,0,0.5)]" />
        </div>
        <p className="mt-2 pr-6 md:pr-20 self-end text-[13px] italic hidden md:block">↵ Confirm · Esc Close</p>
      </div>
    </div>
  );
}

// ======================= P4 Revival =======================
// After Persona 4 Revival's menu: a yellow field, blue sky in the top-right wedge, a purple band
// under the list, Yu adjusting his glasses on the left, flowers, and serif options stepping down
// the diagonal. Laid out on a 16:9 stage like P5's (cover the screen, zoom out on tall phones).
// The sky, Yu and the white flower come from the official site (see CREDITS.md).

const P4_DESCRIPTIONS = ["Head home", "View Calendar", "Open your notebook", "View Social Links", "Look back on records", "View Settings"];
// Left, top and type size per row (percent of the stage, cqh), and which part of the picture it
// sits on: the yellow field, the edge of the band, or the purple band
const P4_ROWS = [
  { left: 30, top: 15, fs: 9.2, zone: "field" },
  { left: 33.5, top: 26, fs: 7, zone: "field" },
  { left: 36.5, top: 35.5, fs: 7.4, zone: "edge" },
  { left: 40, top: 45.5, fs: 8, zone: "band" },
  { left: 43.5, top: 56, fs: 8.6, zone: "band" },
  { left: 47.5, top: 67, fs: 9.6, zone: "band" },
] as const;

const P4_TONES = {
  // A pale edge all round, so the dark rows also read over Yu's jacket
  field: { color: "#2a1533", WebkitTextStroke: "0.14em #fff6b0", paintOrder: "stroke fill" },
  edge: { color: "#fff3a0", textShadow: "0.05em 0.05em 0 #1c6f8f, -0.03em -0.02em 0 #ff7a00" },
  // The game's colour fringe: a red and a green copy, nudged apart
  band: { color: "#ffd400", textShadow: "-0.035em 0.02em 0 #ff2a2a, 0.035em -0.02em 0 #19c22f" },
};

// Vector flower (the game's six-petal mark), with an optional red and green fringe
function Flower({ className, color, fringe }: { className?: string; color: string; fringe?: boolean }) {
  return (
    <svg viewBox="-50 -50 100 100" className={className} aria-hidden style={fringe ? { filter: "drop-shadow(-1.5px 1px 0 #ff2a5a) drop-shadow(1.5px -1px 0 #19c22f)" } : undefined}>
      {[0, 60, 120, 180, 240, 300].map(a => (
        <path key={a} d="M 0 -6 C -16 -22 -15 -46 0 -46 C 15 -46 16 -22 0 -6 Z" fill={color} transform={`rotate(${a})`} />
      ))}
      <circle r="9" fill={color} />
    </svg>
  );
}

// Safari (and every iOS browser) plays WebM without its transparency, so those get the still
function supportsAlphaVideo() {
  const ua = navigator.userAgent;
  const webkitOnly = /iP(hone|ad|od)/.test(ua) || (/Safari/.test(ua) && !/Chrome|Chromium|Android|Edg\//.test(ua));
  return !webkitOnly && document.createElement("video").canPlayType('video/webm; codecs="vp9"') !== "";
}

function P4Menu({ selected, select, onClose, xp }: MenuProps) {
  const [alphaVideo] = useState(supportsAlphaVideo);
  // Tall screens only see the middle of the stage, so Yu moves in over the list there
  const [portrait] = useState(() => window.matchMedia("(max-aspect-ratio: 1/1)").matches);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#ffc400]">
      <motion.div
        className="absolute [container-type:size]"
        style={{
          ["--w" as string]: "min(max(100vw, 177.78vh), 250vw)",
          width: "var(--w)",
          height: "calc(var(--w) * 0.5625)",
          top: "calc(50% - var(--w) * 0.28125)",
          // Keep the list (about 45% across) centred on narrow screens
          left: "clamp(calc(100vw - var(--w)), calc(50vw - var(--w) * 0.45), 0px)",
          background: "linear-gradient(155deg, #ffe53b 0%, #ffd400 45%, #ffb300 100%)",
        }}
        initial={{ opacity: 0, scale: 1.06 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Lighter streaks across the yellow */}
        <div className="absolute inset-0 opacity-50" style={{ background: "repeating-linear-gradient(-14deg, transparent 0 9cqh, #fff27a 9cqh 9.6cqh, transparent 9.6cqh 21cqh)" }} />

        {/* The sky, in the top-right wedge */}
        <motion.div
          className="absolute inset-0"
          style={{ clipPath: "polygon(47% 0, 100% 0, 100% 25%, 54% 37%)" }}
          initial={{ x: "20%" }}
          animate={{ x: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <video className="absolute right-0 top-0 h-[62%] w-[62%] object-cover" src="/persona/p4-sky.mp4" poster="/persona/p4-sky-poster.webp" autoPlay={!reduced} loop muted playsInline aria-hidden />
        </motion.div>
        <div className="absolute inset-0 bg-[#ffb300]" style={{ clipPath: "polygon(54% 37%, 100% 25%, 100% 28.5%, 54.6% 40%)" }} />

        {/* The purple band under the lower rows */}
        <motion.div
          className="absolute inset-0"
          style={{ background: "linear-gradient(120deg, #4a1763, #2a0d3d 70%)", clipPath: "polygon(31% 49%, 100% 30%, 100% 68%, 63% 100%, 25% 100%)" }}
          initial={{ x: "-30%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.05, ease: [0.7, 0, 0.3, 1] }}
        />

        {/* Flowers: the big yellow one, a small black one, and the official white one */}
        <motion.div className="absolute" style={{ left: "62%", top: "66%", width: "19%" }} initial={{ scale: 0, rotate: -120 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.3, type: "spring", stiffness: 260, damping: 14 }}>
          <Flower color="#ffe100" fringe />
        </motion.div>
        <motion.div className="absolute" style={{ left: "71%", top: "88%", width: "6.5%" }} initial={{ scale: 0 }} animate={{ scale: 1, rotate: 25 }} transition={{ delay: 0.42, type: "spring", stiffness: 300, damping: 14 }}>
          <Flower color="#16101c" />
        </motion.div>
        <motion.div className="absolute" style={{ left: "2%", top: "77%", width: "11%" }} initial={{ scale: 0, rotate: 90 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.38, type: "spring", stiffness: 300, damping: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a static asset; next/image adds nothing here */}
          <img src="/persona/p4-flower-white.webp" alt="" className="w-full h-auto" draggable={false} />
        </motion.div>

        {/* Yu, adjusting his glasses */}
        <motion.div
          className="absolute"
          style={portrait
            // Higher, so his face clears the first row, and faded out where the clip ends
            ? { left: "17%", top: "-34%", height: "112%", aspectRatio: "1149 / 1000", WebkitMaskImage: "linear-gradient(#000 74%, transparent 96%)", maskImage: "linear-gradient(#000 74%, transparent 96%)" }
            : { left: "-9%", top: "-16%", height: "150%", aspectRatio: "1149 / 1000" }}
          initial={{ x: "-18%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 170, damping: 22 }}
        >
          {alphaVideo && !reduced ? (
            <video className="h-full w-full object-contain" src="/persona/p4-yu.webm" poster="/persona/p4-yu.webp" autoPlay loop muted playsInline aria-hidden />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- a static asset; next/image adds nothing here
            <img src="/persona/p4-yu.webp" alt="" className="h-full w-full object-contain" draggable={false} />
          )}
        </motion.div>

        {/* The dashed stitch that runs from his shoulder into the list */}
        <svg viewBox="0 0 1000 562.5" className={cn("absolute inset-0 w-full h-full pointer-events-none", portrait && "hidden")} aria-hidden>
          <path d="M 250 330 C 330 300 380 290 430 286" fill="none" stroke="#fff" strokeWidth="2.4" strokeDasharray="9 8" strokeLinecap="round" />
        </svg>

        <nav aria-label="Menu" className="absolute inset-0">
          {PERSONA_MENU_ITEMS.map((item, i) => {
            const on = selected === i;
            const row = P4_ROWS[i];
            return (
              <motion.div
                key={item.href}
                className="absolute"
                style={{ left: `${row.left}%`, top: `${row.top}%`, fontSize: `${row.fs}cqh`, zIndex: on ? 5 : 1, transformOrigin: "left center" }}
                initial={{ y: "-40%", opacity: 0, rotate: -12 }}
                animate={{ y: 0, opacity: 1, rotate: -12, scale: on ? 1.12 : 1 }}
                transition={{ delay: 0.14 + i * 0.05, type: "spring", stiffness: 480, damping: 22 }}
              >
                <Link href={item.href} onClick={onClose} onMouseEnter={() => select(i)} onFocus={() => select(i)} className="relative block outline-none leading-[1] whitespace-nowrap px-[0.12em]">
                  {on && (
                    <motion.span
                      layoutId="p4-pause-cursor"
                      className="absolute -inset-x-[0.14em] inset-y-[0.04em] bg-white -skew-x-12"
                      style={{ boxShadow: "0.1em 0.09em 0 #2be0ff, -0.07em -0.05em 0 #ff4fa3" }}
                      transition={{ type: "spring", stiffness: 600, damping: 32 }}
                    />
                  )}
                  <span
                    className="relative font-black"
                    style={{
                      fontFamily: "var(--font-p4-menu)",
                      ...(on
                        ? { color: "transparent", backgroundImage: "linear-gradient(180deg, #ff3d98 20%, #ffb3d9 95%)", WebkitBackgroundClip: "text", backgroundClip: "text" }
                        : P4_TONES[row.zone]),
                    }}
                  >
                    {item.labels.p4}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* The wallet, here your XP */}
        {xp !== undefined && (
          <p className="absolute font-black" style={{ left: "32%", top: "88%", fontSize: "5cqh", fontFamily: "var(--font-p4-menu)", color: "#ffd400", textShadow: "0.05em 0.05em 0 #2a0d3d" }}>
            ¥{xp.toLocaleString()}
          </p>
        )}
      </motion.div>

      {/* What the choice does, bottom right as the game prints its hints (on the screen, not the
          stage, whose right edge can be cropped) */}
      <motion.p
        key={selected}
        className="absolute bottom-[max(1.2rem,env(safe-area-inset-bottom))] right-4 rounded-full bg-[#2a0d3d] text-[#fff3a0] font-bold text-[14px] md:text-[16px] px-4 py-1.5 shadow-[3px_3px_0_#ff7a00]"
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
      >
        ✦ {P4_DESCRIPTIONS[selected]}
      </motion.p>
    </div>
  );
}

// ======================= P5 =======================

// ======================= P5: the game's own menu screen =======================
// The background is the game's pause menu (public/persona/p5-menu-bg.webp) with its menu words
// painted out; our stickers sit exactly where they were. Everything is placed on a 16:9 stage, in
// the screenshot's 1000×562.5 units, scaled to cover the screen and slid sideways on narrow ones
// to keep the hand in view.

const P5_DESCRIPTIONS = ["Lay low at the hideout", "Check the calendar", "Read your notes", "Visit your confidants", "Look back on records", "Change settings"];
// Our six words on the palm: right edge, top and type size, in screenshot units. The two long
// ones sit where the game's words spilled off the palm, so they cover those sticker shapes.
const P5_ROWS = [
  { right: 552, top: 136, fs: 40, tilt: -2 },
  { right: 549, top: 214, fs: 44, tilt: 1 },
  { right: 512, top: 266, fs: 30, tilt: -2 },
  { right: 509, top: 300, fs: 38, tilt: 0 },
  { right: 461, top: 344, fs: 28, tilt: 2 },
  { right: 503, top: 375, fs: 30, tilt: -1 },
];
const UNIT_X = 100 / 1000;
const UNIT_Y = 100 / 562.5;

function seeded(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  return () => {
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  };
}

const P5_MENU_FACE = '"P5 Menu", Anton, sans-serif';
const STICKER_FACES = [P5_MENU_FACE, '"Archivo Black", sans-serif', '"P5 Ransom", Anton, sans-serif', "Anton, Impact, sans-serif"];

// A black edge drawn around the white cut (four hard drop-shadows)
const CUT_EDGE = "drop-shadow(0.05em 0 0 #0b0b0b) drop-shadow(-0.05em 0 0 #0b0b0b) drop-shadow(0 0.05em 0 #0b0b0b) drop-shadow(0 -0.05em 0 #0b0b0b)";

// One menu word as the game cuts it: mixed faces and case, letters bobbing, a white cut hugging the
// letters with a black edge, the odd letter inverted. The selected word turns mint on a black cut,
// with a red edge and the cyan pointer.
function P5Sticker({ text, on }: { text: string; on: boolean }) {
  const rand = seeded(text);
  return (
    <span className="relative inline-flex items-center whitespace-nowrap leading-none" style={{ filter: on ? "drop-shadow(-0.09em -0.07em 0 #e5001b)" : CUT_EDGE }}>
      {on && <span aria-hidden className="absolute -inset-x-[0.14em] -inset-y-[0.1em] bg-[#0b0b0b]" style={{ clipPath: "polygon(1% 14%, 100% 0, 97% 100%, 0 90%)" }} />}
      {Array.from(text).map((ch, i) => {
        if (ch === " ") return <span key={i} aria-hidden className="inline-block w-[0.28em]" />;
        const face = STICKER_FACES[Math.floor(rand() * STICKER_FACES.length)];
        const lower = i > 0 && rand() < 0.35;
        const size = 0.84 + rand() * 0.3;
        const lift = (rand() - 0.5) * 0.12;
        const tilt = (rand() - 0.5) * 12;
        const invert = !on && rand() < 0.16;
        const tight = face === P5_MENU_FACE;
        return (
          <span
            key={i}
            aria-hidden
            className="relative inline-block"
            style={{
              fontFamily: face,
              fontSize: `${size}em`,
              transform: `translateY(${lift}em) rotate(${tilt.toFixed(1)}deg)`,
              // The fan font's glyphs carry wide side bearings
              letterSpacing: tight ? "-0.18em" : "-0.02em",
              marginRight: tight ? "0.12em" : "0.01em",
              ...(on
                ? { color: "#d8ffe0", WebkitTextStroke: "0.09em #0b0b0b", paintOrder: "stroke fill" }
                : invert
                  ? { color: "#fff", background: "#0b0b0b", padding: "0 0.06em", boxShadow: "0 0 0 0.08em #fff" }
                  : { color: "#0b0b0b", WebkitTextStroke: "0.22em #fff", paintOrder: "stroke fill" }),
            }}
          >
            {lower ? ch.toLowerCase() : ch}
          </span>
        );
      })}
      {on && <span aria-hidden className="absolute left-full top-1/2 -translate-y-1/2 ml-[0.1em] w-[0.75em] h-[0.95em] bg-[#2be0ff]" style={{ clipPath: "polygon(0 0, 100% 45%, 0 100%)" }} />}
    </span>
  );
}

// The selector's jitter: a red and a cyan quad whose corners jump every 120ms, the cyan one
// screen-blended over the red (after Drew Powers' "Persona 5 Menu UI" pen)
function randomQuad() {
  const r = Math.random;
  return [r() * 30, r() * 20, r() * 30 + 70, r() * 20, r() * 30 + 70, r() * 20 + 30, r() * 30, r() * 20 + 30].map(n => n.toFixed(1)).join(" ");
}

function P5Selector() {
  const [quads, setQuads] = useState(() => [randomQuad(), randomQuad()]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setQuads([randomQuad(), randomQuad()]), 120);
    return () => clearInterval(id);
  }, []);
  return (
    <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="absolute -inset-x-[8%] -inset-y-[30%] w-[116%] h-[160%] pointer-events-none opacity-75" aria-hidden>
      <polygon points={quads[0]} fill="#ff0022" />
      <polygon points={quads[1]} fill="#1cfeff" style={{ mixBlendMode: "screen" }} />
    </svg>
  );
}

function P5Menu({ selected, select, onClose }: MenuProps) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {/* Fills whatever the stage leaves uncovered on tall phones */}
      {/* eslint-disable-next-line @next/next/no-img-element -- a static asset; next/image adds nothing here */}
      <img src="/persona/p5-menu-bg-blur.webp" alt="" className="absolute inset-0 h-full w-full object-cover scale-110" draggable={false} />
      <motion.div
        className="absolute [container-type:size]"
        style={{
          // Cover the screen at 16:9, but on tall phones zoom out (to 2.5 screen widths at most) so
          // the hand, the claw and COMMAND all fit; keep the hand (about 44% across) centred
          ["--w" as string]: "min(max(100vw, 177.78vh), 250vw)",
          width: "var(--w)",
          height: "calc(var(--w) * 0.5625)",
          top: "calc(50% - var(--w) * 0.28125)",
          boxShadow: "0 0 60px 30px rgb(0 0 0 / 0.55)",
          left: "clamp(calc(100vw - var(--w)), calc(50vw - var(--w) * 0.44), 0px)",
        }}
        initial={{ scale: 1.12, rotate: -2, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a static asset; next/image adds nothing here */}
        <img src="/persona/p5-menu-bg.webp" alt="" className="absolute inset-0 h-full w-full" draggable={false} />

        <nav aria-label="Menu" className="absolute inset-0">
          {PERSONA_MENU_ITEMS.map((item, i) => {
            const on = selected === i;
            const row = P5_ROWS[i];
            return (
              <motion.div
                key={item.href}
                className="absolute flex justify-end"
                style={{ right: `${100 - row.right * UNIT_X}%`, top: `${row.top * UNIT_Y}%`, fontSize: `${row.fs * UNIT_Y}cqh`, zIndex: on ? 5 : 1 }}
                initial={{ x: "-30%", opacity: 0 }}
                animate={{ x: 0, opacity: 1, rotate: on ? row.tilt - 3 : row.tilt, scale: on ? 1.08 : 1 }}
                transition={{ delay: 0.16 + i * 0.04, type: "spring", stiffness: 520, damping: 22 }}
              >
                <Link href={item.href} onClick={onClose} onMouseEnter={() => select(i)} onFocus={() => select(i)} className="relative flex outline-none" aria-label={item.labels.p5}>
                  {on && <P5Selector />}
                  <P5Sticker text={item.labels.p5.toUpperCase()} on={on} />
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* Filler in the gap under the first row, as the game packs its list: Morgana's line */}
        <motion.div
          aria-hidden
          className="absolute flex justify-end pointer-events-none"
          style={{ right: `${100 - 545 * UNIT_X}%`, top: `${182 * UNIT_Y}%`, fontSize: `${24 * UNIT_Y}cqh` }}
          initial={{ x: "-30%", opacity: 0 }}
          animate={{ x: 0, opacity: 1, rotate: 2 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 520, damping: 22 }}
        >
          <P5Sticker text="TAKE YOUR TIME" on={false} />
        </motion.div>

        {/* What the choice does, where the game prints it under COMMAND */}
        <motion.p
          key={selected}
          className="absolute text-white font-bold whitespace-nowrap max-md:hidden"
          style={{ left: `${560 * UNIT_X}%`, top: `${475 * UNIT_Y}%`, fontSize: "3.6cqh" }}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {P5_DESCRIPTIONS[selected]}
        </motion.p>
      </motion.div>

      {/* Narrow screens crop the caption's spot, so it sits along the bottom instead */}
      <motion.p
        key={`m${selected}`}
        className="md:hidden absolute bottom-[max(1.2rem,env(safe-area-inset-bottom))] right-4 bg-black text-white font-bold text-[15px] px-3 py-1 -skew-x-12 border-2 border-white shadow-[4px_4px_0_#e5001b]"
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
      >
        {P5_DESCRIPTIONS[selected]}
      </motion.p>
    </div>
  );
}
