"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { PersonaStyle } from "@/lib/persona";
import { sfx } from "@/lib/sfx";

// A short wipe between pages, in the game's style. It plays over the page's own slide-in and
// never blocks taps. Kept brief: the bars are big layers, so they exist for well under a second.
export default function PersonaTransition({ style, dark }: { style: PersonaStyle; dark: boolean }) {
  const pathname = usePathname();
  const [seenPath, setSeenPath] = useState(pathname);
  const [run, setRun] = useState<number | null>(null);

  // Each navigation starts a new run (the first page load doesn't)
  if (pathname !== seenPath) {
    setSeenPath(pathname);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setRun(r => (r ?? 0) + 1);
  }

  useEffect(() => {
    if (run === null) return;
    sfx.swoosh();
    const t = setTimeout(() => setRun(null), style === "p4" ? 420 : 700);
    return () => clearTimeout(t);
  }, [run, style]);

  return (
    <div className="fixed inset-0 z-[300] pointer-events-none overflow-hidden" aria-hidden>
      <AnimatePresence>
        {run !== null && (
          <motion.div key={run} className="absolute inset-0" exit={{ opacity: 0, transition: { duration: 0.15 } }}>
            {style === "p5" && <P5Wipe />}
            {style === "p4" && <P4Static />}
            {style === "p3" && <P3Sweep dark={dark} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Black and red shards slash across, with a white streak riding the first one
function P5Wipe() {
  const bars = [
    { top: "-10%", color: "#0b0b0b", delay: 0 },
    { top: "18%", color: "#e5001b", delay: 0.04 },
    { top: "46%", color: "#0b0b0b", delay: 0.08 },
    { top: "72%", color: "#e5001b", delay: 0.12 },
  ];
  return (
    <>
      {bars.map((b, i) => (
        <motion.div
          key={i}
          className="absolute left-0 h-[34%] w-[80vw]"
          style={{ top: b.top, background: b.color, rotate: -14, clipPath: "polygon(6% 0, 100% 8%, 94% 100%, 0 90%)" }}
          initial={{ x: "-110vw" }}
          animate={{ x: "130vw" }}
          transition={{ duration: 0.55, delay: b.delay, ease: [0.7, 0, 0.3, 1] }}
        />
      ))}
      <motion.div
        className="absolute left-0 top-[44%] h-2 w-[70vw] bg-white"
        style={{ rotate: -14 }}
        initial={{ x: "-90vw" }}
        animate={{ x: "140vw" }}
        transition={{ duration: 0.45, delay: 0.1, ease: [0.7, 0, 0.3, 1] }}
      />
    </>
  );
}

// Channel change: a burst of TV static and a white scan line collapsing to the middle
function P4Static() {
  return (
    <>
      <motion.div
        className="absolute -inset-4 p-static p-static-jitter bg-[#181512]"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.85, 0.85, 0] }}
        transition={{ duration: 0.38, times: [0, 0.2, 0.6, 1] }}
      />
      <motion.div
        className="absolute left-0 right-0 top-1/2 h-[3px] -mt-px bg-white"
        initial={{ scaleX: 1, opacity: 0 }}
        animate={{ scaleX: [1, 1, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 0.38, times: [0, 0.5, 1] }}
      />
    </>
  );
}

// A diagonal sheet of light washes over, cyan by day and green in the Dark Hour
function P3Sweep({ dark }: { dark: boolean }) {
  const glow = dark ? "#5cff9a" : "#7fd4ff";
  const deep = dark ? "#021006" : "#0a3d91";
  return (
    <>
      <motion.div
        className="absolute top-[-20%] h-[140%] w-[45vw]"
        style={{ background: `linear-gradient(90deg, transparent, ${glow} 45%, #fff 50%, ${glow} 55%, transparent)`, rotate: 18, opacity: 0.55 }}
        initial={{ x: "-60vw" }}
        animate={{ x: "130vw" }}
        transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
      />
      <motion.div
        className="absolute top-[-20%] h-[140%] w-[3px]"
        style={{ background: deep, rotate: 18, boxShadow: `0 0 12px ${glow}` }}
        initial={{ x: "-10vw" }}
        animate={{ x: "120vw" }}
        transition={{ duration: 0.5, delay: 0.08, ease: [0.65, 0, 0.35, 1] }}
      />
    </>
  );
}
