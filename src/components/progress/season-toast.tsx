"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";

export interface Season {
  lastRank: string | null;
}

// Shown once at the start of each month, when the look resets to Novice
export default function SeasonToast({ season, onDone }: { season: Season | null; onDone: () => void }) {
  useEffect(() => {
    if (!season) return;
    const timer = setTimeout(onDone, 6000);
    return () => clearTimeout(timer);
  }, [season, onDone]);

  return (
    <AnimatePresence>
      {season && (
        <motion.button
          className="fixed top-20 left-1/2 z-[360] w-[min(92vw,380px)] text-left"
          initial={{ opacity: 0, y: -20, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: -12, x: "-50%" }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          onClick={onDone}
        >
          <div className="px-5 py-4 rounded-2xl bg-white/90 dark:bg-tm-purple-dark/90 backdrop-blur-xl border border-tm-orange-dark/30 shadow-2xl">
            <p className="text-caption font-black uppercase tracking-[0.3em] text-tm-orange-dark dark:text-tm-yellow">
              New Season · {format(new Date(), "MMMM")}
            </p>
            <p className="mt-1 text-sm font-black text-foreground">The climb begins again. Earn your rank back.</p>
            {season.lastRank && (
              <p className="mt-1 text-caption font-bold text-tm-blue-gray">Last season you reached {season.lastRank}.</p>
            )}
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
