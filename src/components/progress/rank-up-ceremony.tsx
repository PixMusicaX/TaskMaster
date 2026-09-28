"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RankCrest } from "@/lib/rank-icons";
import { eraForRank } from "@/lib/eras";

export interface Ceremony {
  from: string;
  to: string;
}

// Full-screen reveal for a new rank; the palette switches when it's dismissed
export default function RankUpCeremony({ ceremony, onDone }: { ceremony: Ceremony | null; onDone: () => void }) {
  useEffect(() => {
    if (!ceremony) return;
    const timer = setTimeout(onDone, 7000);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter") onDone(); };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(timer); window.removeEventListener("keydown", onKey); };
  }, [ceremony, onDone]);

  const newEra = ceremony ? eraForRank(ceremony.to) : null;
  const eraChanged = ceremony && newEra && eraForRank(ceremony.from).id !== newEra.id;

  return (
    <AnimatePresence>
      {ceremony && newEra && (
        <motion.div
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/75 px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          onClick={onDone}
          role="dialog"
          aria-modal="true"
          aria-label={`New rank: ${ceremony.to}`}
        >
          <div className="relative flex flex-col items-center text-center">
            {/* Expanding shock rings */}
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="absolute top-[72px] left-1/2 w-36 h-36 -ml-18 -mt-18 rounded-full border-2 border-tm-yellow"
                initial={{ scale: 0.4, opacity: 0.9 }}
                animate={{ scale: 3.2, opacity: 0 }}
                transition={{ duration: 1.8, delay: 0.3 + i * 0.35, ease: "easeOut" }}
              />
            ))}

            {/* Rotating rays */}
            <motion.div
              className="absolute top-[72px] left-1/2 w-[420px] h-[420px] -ml-[210px] -mt-[210px] opacity-30"
              style={{ background: "repeating-conic-gradient(from 0deg, var(--tm-yellow) 0 6deg, transparent 6deg 18deg)", maskImage: "radial-gradient(closest-side, #000 20%, transparent)", WebkitMaskImage: "radial-gradient(closest-side, #000 20%, transparent)" }}
              initial={{ scale: 0, rotate: 0 }}
              animate={{ scale: 1, rotate: 60 }}
              transition={{ scale: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }, rotate: { duration: 7, ease: "linear" } }}
            />

            <motion.div
              className="relative w-36 h-36 rounded-full bg-tm-purple-dark border-2 border-tm-yellow flex items-center justify-center text-tm-yellow shadow-[0_0_60px_-5px_var(--tm-yellow)]"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.15 }}
            >
              <RankCrest rank={ceremony.to} size={64} strokeWidth={1.5} />
            </motion.div>

            <motion.p
              className="relative mt-10 text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-yellow/80"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              Rank Achieved
            </motion.p>
            <motion.h2
              className="relative mt-2 text-5xl sm:text-6xl font-display font-bold uppercase tracking-tight text-white"
              initial={{ opacity: 0, scale: 1.4, letterSpacing: "0.3em" }}
              animate={{ opacity: 1, scale: 1, letterSpacing: "-0.05em" }}
              transition={{ delay: 0.75, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              {ceremony.to}
            </motion.h2>

            {eraChanged && (
              <motion.div
                className="relative mt-5 flex items-center gap-3 px-4 py-2 rounded-full border border-tm-yellow/40 bg-tm-yellow/10"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
              >
                <span className="font-serif font-bold text-tm-yellow">{newEra.numeral}</span>
                <span className="text-caption font-mono font-semibold uppercase tracking-[0.12em] text-white/90">New Era · {newEra.name}</span>
              </motion.div>
            )}

            <motion.p
              className="relative mt-10 text-caption font-mono font-semibold uppercase tracking-[0.12em] text-white/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.4, 1] }}
              transition={{ delay: 1.8, duration: 2, repeat: Infinity }}
            >
              Tap to continue
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
