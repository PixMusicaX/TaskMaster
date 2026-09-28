"use client";

import { AnimatePresence, motion } from "framer-motion";

export interface XpBurst {
  id: number;
  delta: number;
  origin: { x: number; y: number };
  target: { x: number; y: number } | null;
}

const PARTICLES = 7;

// "+30 XP" chip rising from where you tapped, with motes flying into the XP bar
export default function XpBurstLayer({ bursts }: { bursts: XpBurst[] }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-[350]" aria-live="polite">
      <AnimatePresence>
        {bursts.map(b => (
          <div key={b.id}>
            <motion.div
              className="absolute"
              style={{ left: b.origin.x, top: b.origin.y }}
              initial={{ opacity: 0, y: 0, scale: 0.6, x: "-50%" }}
              animate={{ opacity: [0, 1, 1, 0], y: -70, scale: [0.6, 1.15, 1, 0.95], x: "-50%" }}
              transition={{ duration: 1.2, ease: "easeOut", times: [0, 0.15, 0.7, 1] }}
            >
              <span className={b.delta > 0
                ? "px-2.5 py-1 rounded-full bg-tm-yellow text-tm-purple-dark text-xs font-black shadow-[0_4px_20px_-4px_var(--tm-yellow)] whitespace-nowrap"
                : "px-2.5 py-1 rounded-full bg-tm-blue-gray/80 text-white text-xs font-black whitespace-nowrap"}>
                {b.delta > 0 ? "+" : ""}{b.delta} XP
              </span>
            </motion.div>

            {b.delta > 0 && b.target && Array.from({ length: PARTICLES }).map((_, i) => {
              const dx = b.target!.x - b.origin.x;
              const dy = b.target!.y - b.origin.y;
              // Fan out first, then converge on the bar
              const angle = (i / PARTICLES) * Math.PI * 2;
              const spread = 26 + (i % 3) * 10;
              return (
                <motion.span
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full bg-tm-yellow shadow-[0_0_8px_var(--tm-yellow)]"
                  style={{ left: b.origin.x, top: b.origin.y }}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
                  animate={{
                    x: [0, Math.cos(angle) * spread, dx],
                    y: [0, Math.sin(angle) * spread, dy],
                    opacity: [0, 1, 0.9, 0],
                    scale: [0.5, 1.2, 0.6],
                  }}
                  transition={{ duration: 0.9, delay: 0.1 + i * 0.03, ease: [0.5, 0, 0.75, 0], times: [0, 0.3, 1] }}
                />
              );
            })}
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
