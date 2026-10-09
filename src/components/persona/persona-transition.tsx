"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { PersonaStyle } from "@/lib/persona";
import { sfx } from "@/lib/sfx";

// How long each style's wipe stays mounted
export const PERSONA_WIPE_MS: Record<PersonaStyle, number> = { p3: 700, p4: 420, p5: 1400 };

// A short wipe between pages, in the game's style. It plays over the page's own slide-in and
// never blocks taps. Kept brief: the layers are big, so they exist for about a second at most.
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
    const t = setTimeout(() => setRun(null), PERSONA_WIPE_MS[style]);
    return () => clearTimeout(t);
  }, [run, style]);

  return (
    <div className="fixed inset-0 z-[300] pointer-events-none overflow-hidden" aria-hidden>
      {/* Keeps the clip's cut in the browser's cache, so a wipe starts the moment it is asked for */}
      {style === "p5" && <video className="hidden" src={`${P5_CLIP}#t=${P5_CUT.from}`} preload="auto" muted playsInline />}
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

// The game's own brushwork, cut from the "Take Your Heart" animation (public/persona/
// p5-transition.mp4, see CREDITS.md): Joker's eyes in red, swept over by white swirls that turn the
// screen black and white and then red. It fades out at the end to show the page.
const P5_CLIP = "/persona/p5-transition.mp4";
const P5_CUT = { from: 21.3, to: 23.3 };
// The cut is sped up to fit the wipe
const P5_RATE = 1.8;

export function P5Wipe() {
  const video = useRef<HTMLVideoElement>(null);
  // Nothing shows until the first frame of the cut is on screen
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    el.playbackRate = P5_RATE;
    el.play().catch(() => {});
    // Hold the last frame of the cut
    const hold = () => { if (el.currentTime >= P5_CUT.to) el.pause(); };
    el.addEventListener("timeupdate", hold);
    return () => el.removeEventListener("timeupdate", hold);
  }, []);

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: PERSONA_WIPE_MS.p5 / 1000, times: [0, 0.83, 1], ease: "linear" }}
    >
      <video
        ref={video}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ opacity: playing ? 1 : 0 }}
        src={`${P5_CLIP}#t=${P5_CUT.from}`}
        preload="auto"
        muted
        playsInline
        onPlaying={() => setPlaying(true)}
      />
    </motion.div>
  );
}

// Channel change: a burst of TV static and a white scan line collapsing to the middle
export function P4Static() {
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
export function P3Sweep({ dark }: { dark: boolean }) {
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
