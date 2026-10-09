"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useAnimationControls } from "framer-motion";
import { Menu } from "lucide-react";
import { useSpecial } from "@/components/theme-provider";
import { useProgress } from "@/components/progress/progress-provider";
import { SPECIAL_DAYS, type SpecialId } from "@/lib/special-days";
import { SPECIAL_LOOKS } from "./special-themes";

// Special-day code only downloads on special days
const SpecialBackdrop = dynamic(() => import("./special-backdrop"), { ssr: false });
const SpecialTransition = dynamic(() => import("./special-transition"), { ssr: false });
const SpecialMenu = dynamic(() => import("./special-menu"), { ssr: false });

// The month's special day: its backdrop, its menu button (in place of the navbars) and its page
// wipes. Nothing at all on every other day.
export default function SpecialChrome() {
  const special = useSpecial();
  if (!special) return null;
  return (
    <>
      <SpecialBackdrop key={`backdrop-${special}`} id={special} />
      <SpecialNav key={`nav-${special}`} id={special} />
      <SpecialTransition id={special} />
    </>
  );
}

// As on Persona days there are no navbars: a floating button opens the day's menu, which holds
// every page, and the day's name sits in the top right. The spacer keeps pages where the normal
// navbar would have left them.
function SpecialNav({ id }: { id: SpecialId }) {
  const { profile, pulse } = useProgress();
  const pulseControls = useAnimationControls();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const Icon = SPECIAL_LOOKS[id].icon;

  useEffect(() => {
    if (pulse) pulseControls.start({ scale: [1, 1.15, 1], transition: { duration: 0.4 } });
  }, [pulse, pulseControls]);

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
      <div className="fixed top-0 inset-x-0 z-[100] pointer-events-none flex items-start justify-between gap-2 px-3 sm:px-5 pt-[max(0.6rem,env(safe-area-inset-top))]">
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
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-tm-yellow text-tm-purple-dark font-mono font-semibold uppercase tracking-[0.12em] text-[13px] shadow-[0_4px_18px_-6px_var(--tm-yellow)]"
          >
            <Menu size={18} strokeWidth={2.8} />
            <span className="leading-none">Menu</span>
            {profile && (
              <span className="flex flex-col gap-0.5 leading-none pl-2 border-l border-tm-purple-dark/30">
                <span className="text-[11px]">LV {profile.level}</span>
                <span className="block h-1 w-12 rounded-full bg-tm-purple-dark/20 overflow-hidden"><span className="block h-full bg-tm-purple-dark" style={{ width: `${progress}%` }} /></span>
              </span>
            )}
          </motion.button>
        </motion.div>
        <motion.div
          className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-full bg-[color-mix(in_srgb,var(--background)_78%,transparent)] border border-tm-yellow/30 text-tm-purple-dark dark:text-tm-yellow"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 24, delay: 0.05 }}
        >
          <Icon size={16} />
          <span className="text-sm font-bold leading-none" style={{ fontFamily: "var(--special-font)" }}>{SPECIAL_DAYS[id].name}</span>
        </motion.div>
      </div>
      <SpecialMenu id={id} open={menuOpen} onClose={closeMenu} />
    </>
  );
}
