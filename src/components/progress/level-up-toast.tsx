"use client";

import { AnimatePresence, motion } from "framer-motion";
import { RPG_TITLES } from "@/lib/constants";

// Non-blocking level-up banner under the navbar
export default function LevelUpToast({ level }: { level: number | null }) {
  const nextRank = level ? RPG_TITLES.find(t => t.minLevel > level) : null;

  return (
    <AnimatePresence>
      {level && (
        <motion.div
          key={level}
          className="fixed top-20 left-1/2 z-[360] pointer-events-none"
          initial={{ opacity: 0, y: -24, scale: 0.8, x: "-50%" }}
          animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
          exit={{ opacity: 0, y: -16, scale: 0.95, x: "-50%" }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          role="status"
        >
          <div className="relative flex items-center gap-4 pl-3 pr-6 py-3 rounded-2xl bg-white/90 dark:bg-tm-purple-dark/90 backdrop-blur-xl border border-tm-yellow/40 shadow-[0_10px_40px_-10px_var(--tm-yellow)] overflow-hidden">
            {/* Light rays behind the number */}
            <motion.div
              className="absolute -left-10 top-1/2 w-40 h-40 -mt-20 opacity-40"
              style={{ background: "repeating-conic-gradient(from 0deg, var(--tm-yellow) 0 8deg, transparent 8deg 24deg)", maskImage: "radial-gradient(closest-side, #000, transparent)", WebkitMaskImage: "radial-gradient(closest-side, #000, transparent)" }}
              animate={{ rotate: 90 }}
              transition={{ duration: 3, ease: "linear" }}
            />
            <motion.div
              className="relative w-12 h-12 rounded-xl bg-tm-yellow text-tm-purple-dark flex items-center justify-center text-2xl font-display font-bold"
              initial={{ rotate: -20, scale: 0.4 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 12, delay: 0.1 }}
            >
              {level}
            </motion.div>
            <div className="relative">
              <p className="text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-orange-dark dark:text-tm-yellow">Level Up</p>
              <p className="text-sm font-semibold text-foreground">You reached level {level}</p>
              {nextRank && (
                <p className="text-caption font-bold text-tm-blue-gray">
                  {nextRank.minLevel - level} to {nextRank.title}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
