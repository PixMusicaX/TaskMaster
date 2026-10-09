"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { SpecialId } from "@/lib/special-days";
import { sfx } from "@/lib/sfx";
import { SPECIAL_LOOKS, type WipeKind } from "./special-themes";

const OUT = [0.7, 0, 0.3, 1] as const;

// A short wipe between pages in the day's colours. It plays over the page's own slide-in and
// never blocks taps. Kept brief: these are big layers, so they exist for well under a second.
export default function SpecialTransition({ id }: { id: SpecialId }) {
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
    const t = setTimeout(() => setRun(null), 720);
    return () => clearTimeout(t);
  }, [run]);

  return (
    <div className="fixed inset-0 z-[300] pointer-events-none overflow-hidden" aria-hidden>
      <AnimatePresence>
        {run !== null && (
          <motion.div key={run} className="absolute inset-0" exit={{ opacity: 0, transition: { duration: 0.15 } }}>
            <Wipe kind={SPECIAL_LOOKS[id].wipe} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Wipe({ kind }: { kind: WipeKind }) {
  switch (kind) {
    // A tilted sheet of the accent colour crosses the screen (snow drift, page turn, map unrolling)
    case "sweep":
      return (
        <>
          <motion.div
            className="absolute top-[-20%] h-[140%] w-[60vw]"
            style={{ background: "linear-gradient(90deg, transparent, var(--tm-yellow) 35%, var(--tm-orange-light) 65%, transparent)", rotate: 14, opacity: 0.6 }}
            initial={{ x: "-70vw" }}
            animate={{ x: "130vw" }}
            transition={{ duration: 0.6, ease: OUT }}
          />
          <motion.div
            className="absolute top-[-20%] h-[140%] w-[3px] bg-tm-yellow"
            style={{ rotate: 14 }}
            initial={{ x: "-10vw" }}
            animate={{ x: "120vw" }}
            transition={{ duration: 0.5, delay: 0.08, ease: OUT }}
          />
        </>
      );
    // A ring closes in on the middle and is gone (a cup, a porthole, a wreath)
    case "iris":
      return (
        <motion.div
          className="absolute left-1/2 top-1/2 w-[160vmax] h-[160vmax] -ml-[80vmax] -mt-[80vmax] rounded-full border-tm-yellow"
          style={{ borderStyle: "solid" }}
          initial={{ scale: 1, borderWidth: "0vmax", opacity: 0.7 }}
          animate={{ scale: [1, 0.55, 0.02], borderWidth: ["0vmax", "26vmax", "0vmax"], opacity: [0.7, 0.6, 0] }}
          transition={{ duration: 0.62, ease: OUT }}
        />
      );
    // A tide comes up from the bottom and drains away (surf, new growth)
    case "rise":
      return (
        <motion.div
          className="absolute inset-x-0 bottom-0 h-[120%] rounded-t-[50%_12%]"
          style={{ background: "linear-gradient(to top, var(--tm-yellow), color-mix(in srgb, var(--tm-orange-light) 70%, transparent))", opacity: 0.55 }}
          initial={{ y: "105%" }}
          animate={{ y: ["105%", "12%", "105%"] }}
          transition={{ duration: 0.68, ease: "easeInOut" }}
        />
      );
    // Slashes in the day's two strongest colours (claws, a gust of leaves)
    case "slash":
      return (
        <>
          {[
            { top: "-8%", color: "var(--tm-purple-dark)", delay: 0 },
            { top: "22%", color: "var(--tm-yellow)", delay: 0.05 },
            { top: "52%", color: "var(--tm-orange-light)", delay: 0.1 },
            { top: "78%", color: "var(--tm-purple-dark)", delay: 0.14 },
          ].map((bar, i) => (
            <motion.div
              key={i}
              className="absolute left-0 h-[30%] w-[80vw]"
              style={{ top: bar.top, background: bar.color, rotate: -14, clipPath: "polygon(6% 0, 100% 8%, 94% 100%, 0 90%)", opacity: 0.9 }}
              initial={{ x: "-110vw" }}
              animate={{ x: "130vw" }}
              transition={{ duration: 0.55, delay: bar.delay, ease: OUT }}
            />
          ))}
        </>
      );
    // Bands of colour jump about for a few frames (a bad signal)
    case "static":
      return (
        <>
          {[
            { top: "12%", height: "9%", color: "var(--tm-yellow)", shift: [0, -30, 22, 0] },
            { top: "34%", height: "5%", color: "var(--tm-orange-light)", shift: [0, 26, -18, 0] },
            { top: "58%", height: "14%", color: "var(--tm-orange-dark)", shift: [0, -16, 34, 0] },
            { top: "81%", height: "6%", color: "var(--tm-yellow)", shift: [0, 30, -24, 0] },
          ].map((band, i) => (
            <motion.div
              key={i}
              className="absolute inset-x-[-5%]"
              style={{ top: band.top, height: band.height, background: band.color, mixBlendMode: "difference" }}
              initial={{ opacity: 0, x: 0 }}
              animate={{ opacity: [0, 0.8, 0.5, 0], x: band.shift }}
              transition={{ duration: 0.42, times: [0, 0.2, 0.6, 1], ease: "linear" }}
            />
          ))}
        </>
      );
  }
}
