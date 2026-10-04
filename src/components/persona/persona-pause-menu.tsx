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
import Ransom from "./ransom";

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
    if (style === "p3") {
      moveSound.current ??= Object.assign(new Audio("/persona/p3-menu-move.wav"), { volume: 0.45 });
      moveSound.current.currentTime = 0;
      moveSound.current.play().catch(() => {});
    } else {
      sfx.complete();
    }
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
  const props = { selected, select, onClose, level: profile?.level };

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

// ======================= P4 =======================

function Flower({ className, color, ink }: { className?: string; color: string; ink?: string }) {
  return (
    <svg viewBox="-50 -50 100 100" className={className} aria-hidden>
      {[0, 60, 120, 180, 240, 300].map(a => (
        <ellipse key={a} cx="0" cy="-24" rx="15" ry="24" fill={color} stroke={ink} strokeWidth={ink ? 3 : 0} transform={`rotate(${a})`} />
      ))}
      <circle r="10" fill={color} />
    </svg>
  );
}

function P4Menu({ selected, select, onClose, level }: MenuProps) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: "linear-gradient(200deg, #5fb8ff 0%, #8fd0ff 35%, #ffd93b 36%)" }}>
      {/* Clouds in the sky, top right */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(9% 6% at 70% 24%, #fff 60%, transparent 62%), radial-gradient(7% 5% at 76% 21%, #fff 60%, transparent 62%), radial-gradient(10% 6% at 90% 30%, #fff 60%, transparent 62%), radial-gradient(6% 4% at 95% 26%, #fff 60%, transparent 62%)" }} />
      {/* The yellow sweep and the purple band */}
      <motion.div className="absolute -left-[10%] top-[-12%] h-[66%] w-[82%] bg-[#ffe100]" style={{ rotate: -14, transformOrigin: "left" }} initial={{ x: "-100%" }} animate={{ x: 0 }} transition={{ duration: 0.35, ease: [0.7, 0, 0.3, 1] }} />
      <motion.div className="absolute -left-[10%] top-[48%] h-[70%] w-[130%] bg-[#3a1846]" style={{ rotate: -10, transformOrigin: "left" }} initial={{ x: "100%" }} animate={{ x: 0 }} transition={{ duration: 0.35, delay: 0.08, ease: [0.7, 0, 0.3, 1] }} />
      <div className="absolute -left-[10%] top-[47%] h-[2.2%] w-[130%] bg-[#ffb000]" style={{ rotate: "-10deg", transformOrigin: "left" }} />

      <motion.div className="absolute right-[6%] bottom-[6%] w-[22vmin]" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.35, type: "spring", stiffness: 300, damping: 14 }}>
        <Flower color="#ffe100" />
      </motion.div>
      <motion.div className="absolute left-[3%] bottom-[8%] w-[13vmin]" initial={{ scale: 0 }} animate={{ scale: 1, rotate: 20 }} transition={{ delay: 0.45, type: "spring", stiffness: 300, damping: 14 }}>
        <Flower color="#fff" ink="#ff3b6b" />
      </motion.div>

      {/* Yu, big, on the left */}
      <motion.div
        className="absolute left-[-14%] md:left-[-2%] top-[-4%] h-[170%] aspect-[634/1200]"
        initial={{ x: -140, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 160, damping: 20 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a static asset; next/image adds nothing here */}
        <img src="/persona/p4-yu.webp" alt="" className="h-full w-full object-contain object-top" style={{ filter: "drop-shadow(10px 0 0 #ffe100) drop-shadow(-6px 0 0 #fff)" }} draggable={false} />
      </motion.div>

      <nav className="absolute left-[34%] md:left-[30%] top-[16%] flex flex-col" aria-label="Menu">
        {PERSONA_MENU_ITEMS.map((item, i) => {
          const on = selected === i;
          return (
            <motion.div key={item.href} style={{ marginLeft: `${i * 1.1}em`, fontSize: "clamp(30px, 5.6vw, 64px)" }} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1, rotate: -8 }} transition={{ delay: 0.15 + i * 0.05, type: "spring", stiffness: 500, damping: 22 }}>
              <Link href={item.href} onClick={onClose} onMouseEnter={() => select(i)} onFocus={() => select(i)} className="relative block outline-none leading-[0.95]">
                {on && <motion.span layoutId="p4-pause-cursor" className="absolute -inset-x-3 inset-y-1 bg-white/90 -skew-x-12 shadow-[6px_6px_0_#2be0ff]" transition={{ type: "spring", stiffness: 600, damping: 32 }} />}
                <span
                  className="relative"
                  style={{
                    fontFamily: "var(--font-p4-menu)",
                    color: on ? "transparent" : "#2a1533",
                    backgroundImage: on ? "linear-gradient(180deg, #ff4fa3, #ffd1ea)" : undefined,
                    WebkitBackgroundClip: on ? "text" : undefined,
                    backgroundClip: on ? "text" : undefined,
                    textShadow: on ? "none" : "3px 3px 0 #ffe100, -1px -1px 0 #fff",
                  }}
                >
                  {item.labels.p4}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {level !== undefined && (
        <p className="absolute left-[34%] bottom-[7%] text-[#ffe100] text-[clamp(22px,4vw,40px)]" style={{ fontFamily: "var(--font-p4-menu)" }}>
          Lv {level}
        </p>
      )}
    </div>
  );
}

// ======================= P5 =======================

// An open hand, palm towards us, fingers spread (the menu's backing)
const HAND = "M 34 100 L 22 64 L 6 44 L 10 38 L 24 50 L 22 12 L 30 10 L 34 44 L 38 4 L 46 4 L 46 44 L 54 8 L 62 10 L 56 48 L 70 22 L 77 26 L 64 60 L 62 100 Z";

function P5Menu({ selected, select, onClose, level }: MenuProps) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#b8000f]">
      <div className="absolute inset-0" style={{ background: "radial-gradient(60% 50% at 20% 30%, rgb(0 0 0 / 0.35), transparent 70%), radial-gradient(50% 40% at 30% 80%, rgb(80 0 0 / 0.5), transparent 70%)" }} />

      {/* The black-and-white half with Joker */}
      <motion.div
        className="absolute inset-y-0 right-0 w-[62%] md:w-[52%] bg-white"
        style={{ clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0 100%)" }}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        transition={{ duration: 0.35, ease: [0.7, 0, 0.3, 1] }}
      >
        <div className="absolute inset-0" style={{ background: "repeating-linear-gradient(-35deg, #0b0b0b 0 18px, #fff 18px 30px, #0b0b0b 30px 34px, #fff 34px 60px)", opacity: 0.9 }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle, #0b0b0b 2.4px, transparent 2.9px) 0 0 / 11px 11px", WebkitMaskImage: "radial-gradient(55% 45% at 45% 40%, #000, transparent)", maskImage: "radial-gradient(55% 45% at 45% 40%, #000, transparent)" }} />
        {/* eslint-disable-next-line @next/next/no-img-element -- a static asset; next/image adds nothing here */}
        <img
          src="/persona/p5-joker.webp"
          alt=""
          className="absolute bottom-0 right-[-10%] h-[96%] w-auto max-w-none"
          style={{ filter: "grayscale(1) contrast(1.8) brightness(0.9) drop-shadow(6px 0 0 #fff) drop-shadow(-6px 0 0 #fff) drop-shadow(0 6px 0 #0b0b0b)" }}
          draggable={false}
        />
        {/* Joker's red slash */}
        <div className="absolute left-[24%] top-[18%] h-[52%] w-[22%] bg-[#e5001b]" style={{ clipPath: "polygon(40% 0, 70% 6%, 46% 70%, 100% 62%, 92% 84%, 10% 100%)" }} />
      </motion.div>

      {/* The hand and the menu written on it */}
      <motion.div
        className="absolute left-[-6%] md:left-[4%] bottom-[-6%] h-[100%] aspect-[84/100]"
        initial={{ y: "30%", rotate: -14, opacity: 0 }}
        animate={{ y: 0, rotate: -6, opacity: 1 }}
        transition={{ delay: 0.12, type: "spring", stiffness: 200, damping: 18 }}
      >
        <svg viewBox="0 0 84 100" className="h-full w-full" aria-hidden>
          <path d={HAND} fill="#fff" stroke="#0b0b0b" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </motion.div>

      <nav className="absolute left-[10%] md:left-[16%] top-[22%] flex flex-col items-end gap-0.5" aria-label="Menu">
        {PERSONA_MENU_ITEMS.map((item, i) => {
          const on = selected === i;
          return (
            <motion.div
              key={item.href}
              style={{ marginRight: `${(i % 3) * 0.4}em`, fontSize: "clamp(26px, 4.6vw, 52px)" }}
              initial={{ x: -80, opacity: 0, rotate: -10 }}
              animate={{ x: 0, opacity: 1, rotate: on ? -4 : -2 }}
              transition={{ delay: 0.2 + i * 0.04, type: "spring", stiffness: 520, damping: 22 }}
            >
              <Link href={item.href} onClick={onClose} onMouseEnter={() => select(i)} onFocus={() => select(i)} className="relative block outline-none">
                {on && <span className="absolute -right-4 top-1/2 -translate-y-1/2 w-6 h-8 bg-[#2be0ff]" style={{ clipPath: "polygon(0 0, 100% 50%, 0 100%)" }} />}
                <span className={cn("relative block transition-transform", on && "scale-110")}>
                  <Ransom text={item.labels.p5.toUpperCase()} on="light" />
                </span>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <motion.div className="absolute right-[4%] bottom-[5%] -rotate-3" initial={{ scale: 2.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.45, type: "spring", stiffness: 500, damping: 16 }}>
        <span className="block bg-black px-3 py-1 border-[3px] border-white -skew-x-6 shadow-[6px_6px_0_#e5001b]">
          <Ransom text="COMMAND" size="clamp(30px, 6.4vw, 80px)" />
        </span>
      </motion.div>
      {level !== undefined && (
        <p className="absolute left-[6%] bottom-[4%] text-white font-display italic text-[clamp(24px,4vw,44px)]" style={{ textShadow: "3px 3px 0 #000" }}>
          LV {level}
        </p>
      )}
    </div>
  );
}
