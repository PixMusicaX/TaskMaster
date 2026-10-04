"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { Menu } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useProgress } from "@/components/progress/progress-provider";
import { type PersonaStyle } from "@/lib/persona";
import { cn } from "@/lib/utils";
import PersonaHud from "./persona-hud";
import PersonaPauseMenu from "./persona-pause-menu";

// On Persona days there are no navbars: like the games, a floating corner opens the pause menu
// (which holds every page), and the in-game calendar sits in the top right. The spacer keeps
// pages where the normal navbar would have left them.
export default function PersonaNav({ style }: { style: PersonaStyle }) {
  const { theme } = useTheme();
  const { profile, pulse } = useProgress();
  const pulseControls = useAnimationControls();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const dark = theme === "dark";

  useEffect(() => {
    if (pulse) pulseControls.start({ scale: [1, 1.15, 1], rotate: style === "p5" ? [0, -6, 0] : 0, transition: { duration: 0.4 } });
  }, [pulse, pulseControls, style]);

  // "M" opens the menu, as long as nothing is being typed
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === "m" || e.key === "M") setMenuOpen(o => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const progress = profile ? Math.round((profile.levelProgress / profile.nextLevelXP) * 100) : 0;

  return (
    <>
      <div className="h-14 sm:h-16" aria-hidden />
      <div className="fixed top-0 inset-x-0 z-[100] pointer-events-none flex items-start justify-between px-3 sm:px-5 pt-[max(0.6rem,env(safe-area-inset-top))]">
        <motion.div
          className="pointer-events-auto"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 24 }}
        >
          <motion.button
            data-xp-target
            animate={pulseControls}
            whileTap={{ scale: 0.9 }}
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className={cn("flex items-center gap-2", menuTone(style))}
          >
            <Menu size={18} strokeWidth={2.8} />
            <span className="leading-none">{style === "p4" ? "Menu" : "MENU"}</span>
            {profile && (
              <span className={cn("flex flex-col gap-0.5 leading-none", style === "p3" && "pl-2 border-l border-white/50")}>
                <span className="text-[11px]">LV {profile.level}</span>
                <span className="block h-1 w-12 bg-black/20 overflow-hidden"><span className="tm-xp-fill block h-full" style={{ width: `${progress}%` }} /></span>
              </span>
            )}
          </motion.button>
        </motion.div>
        <div className={cn("pointer-events-auto", hudBacking(style))}>
          <PersonaHud style={style} dark={dark} />
        </div>
      </div>
      <PersonaPauseMenu style={style} open={menuOpen} onClose={closeMenu} />
    </>
  );
}

function menuTone(style: PersonaStyle) {
  switch (style) {
    case "p5": return "bg-black text-white font-display text-[16px] px-3 py-2 -skew-x-12 border-[3px] border-white shadow-[5px_5px_0_#e5001b]";
    case "p4": return "bg-[#181512] text-[#ffe100] font-display text-[16px] px-3 py-2 rounded-xl shadow-[4px_4px_0_#ef5f00]";
    default: return "bg-tm-yellow text-[var(--tm-on-accent)] italic font-medium tracking-[0.16em] text-[14px] px-3.5 py-2 -skew-x-[16deg] shadow-[0_4px_18px_-6px_var(--tm-yellow)]";
  }
}

// Keeps the date legible over any page while it floats
function hudBacking(style: PersonaStyle) {
  switch (style) {
    case "p5": return "drop-shadow-[0_2px_0_#000]";
    case "p4": return "";
    default: return "px-2 py-1 bg-[color-mix(in_srgb,var(--background)_72%,transparent)] -skew-x-[12deg] [&>*]:skew-x-[12deg]";
  }
}
