"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Era } from "@/lib/eras";

export interface EraShift {
  era: Era;
  up: boolean;
  lastMonthName: string;
}

// Announces crossing last month's pace (up an era) or falling behind it (back down)
export default function EraToast({ shift, onDone }: { shift: EraShift | null; onDone: () => void }) {
  useEffect(() => {
    if (!shift) return;
    const timer = setTimeout(onDone, 4500);
    return () => clearTimeout(timer);
  }, [shift, onDone]);

  return (
    <AnimatePresence>
      {shift && (
        <motion.button
          key={`${shift.era.id}-${shift.up}`}
          className="fixed top-20 left-1/2 z-[360] w-[min(92vw,380px)] text-left"
          initial={{ opacity: 0, y: -20, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: -12, x: "-50%" }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          onClick={onDone}
        >
          <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/90 dark:bg-tm-purple-dark/90 backdrop-blur-xl border border-tm-yellow/30 shadow-2xl">
            <span className="tm-era-badge text-2xl">{shift.era.numeral}</span>
            <div>
              <p className="text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-orange-dark dark:text-tm-yellow">
                {shift.up ? "New era" : "Era lost"} · {shift.era.name}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {shift.up
                  ? `You passed ${shift.lastMonthName}'s pace.`
                  : `You fell behind ${shift.lastMonthName}'s pace.`}
              </p>
            </div>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
