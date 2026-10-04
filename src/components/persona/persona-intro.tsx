"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { PERSONA_NAMES, type PersonaStyle } from "@/lib/persona";
import { sfx } from "@/lib/sfx";
import Ransom from "./ransom";

const SEEN_KEY = "persona_intro_seen";

// The day's opening splash, once per Persona day: tap to skip
export default function PersonaIntro({ style, dark }: { style: PersonaStyle; dark: boolean }) {
  const stamp = `${format(new Date(), "yyyy-MM-dd")}:${style}`;
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(SEEN_KEY) !== stamp; } catch { return false; }
  });

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    try { localStorage.setItem(SEEN_KEY, stamp); } catch { /* storage blocked */ }
    sfx.personaIntro();
    const t = setTimeout(close, 3400);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter") close(); };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [open, stamp, close]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[450] overflow-hidden cursor-pointer select-none"
          onClick={close}
          role="dialog"
          aria-label={`${PERSONA_NAMES[style]} day`}
          exit={style === "p4" ? { scaleY: 0.004, opacity: [1, 1, 0], transition: { duration: 0.35 } } : { opacity: 0, transition: { duration: 0.35 } }}
        >
          {style === "p5" && <P5Intro />}
          {style === "p4" && <P4Intro />}
          {style === "p3" && <P3Intro dark={dark} />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Subtitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.p
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.1, duration: 0.5 }}
    >
      {children}
    </motion.p>
  );
}

function P5Intro() {
  return (
    <div className="absolute inset-0 bg-[#0b0b0b] flex flex-col items-center justify-center">
      <motion.div
        className="absolute w-[110vmin] h-[110vmin]"
        style={{ background: "repeating-conic-gradient(#e5001b 0 7deg, transparent 7deg 16deg)", WebkitMaskImage: "radial-gradient(closest-side, #000 30%, transparent)", maskImage: "radial-gradient(closest-side, #000 30%, transparent)" }}
        initial={{ scale: 0, rotate: -40 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="absolute h-[22vmin] w-[140vw] bg-[#e5001b]"
        style={{ rotate: -12 }}
        initial={{ x: "-120vw" }}
        animate={{ x: 0 }}
        transition={{ duration: 0.4, delay: 0.25, ease: [0.7, 0, 0.3, 1] }}
      />
      <motion.div
        className="relative -rotate-6"
        initial={{ scale: 2.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 500, damping: 16 }}
      >
        <Ransom text="IT'S SHOWTIME" size="clamp(34px, 9vw, 84px)" />
      </motion.div>
      <Subtitle className="relative mt-8 font-display text-white text-[15px] tracking-[0.3em] italic bg-black px-3 py-1 -skew-x-12">
        {format(new Date(), "M/d EEEE").toUpperCase()} · PERSONA 5 DAY
      </Subtitle>
    </div>
  );
}

function P4Intro() {
  return (
    <div className="absolute inset-0 bg-black flex flex-col items-center justify-center">
      {/* The set warming up: a line opens into a screen of static */}
      <motion.div
        className="absolute inset-x-0 top-1/2 h-[64vh] -mt-[32vh] p-static p-static-jitter bg-[#222]"
        initial={{ scaleY: 0.005, opacity: 1 }}
        animate={{ scaleY: [0.005, 0.005, 1, 1], opacity: [1, 1, 0.9, 0.18] }}
        transition={{ duration: 1.3, times: [0, 0.15, 0.35, 1] }}
      />
      <motion.div
        className="absolute inset-x-0 top-1/2 h-[64vh] -mt-[32vh] bg-[#ffe100]"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 0.9, 0.75, 0.9] }}
        transition={{ duration: 1.6, times: [0, 0.5, 0.6, 0.8, 1] }}
      />
      <motion.h2
        className="relative font-display text-[clamp(30px,8vw,76px)] text-[#181512] italic leading-none text-center"
        initial={{ opacity: 0, scale: 1.2 }}
        animate={{ opacity: [0, 1, 0.4, 1], scale: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        MIDNIGHT<br />CHANNEL
      </motion.h2>
      <Subtitle className="relative mt-5 text-[14px] font-black text-[#181512] bg-white px-3 py-1 rounded-lg border-2 border-[#181512] shadow-[3px_3px_0_#181512]">
        {format(new Date(), "MM/dd EEE")} · Persona 4 day
      </Subtitle>
    </div>
  );
}

function P3Intro({ dark }: { dark: boolean }) {
  const glow = dark ? "#5cff9a" : "#7fd4ff";
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: dark ? "#020a05" : "#06204a" }}>
      {[0, 1, 2, 3, 4].map(i => (
        <motion.div
          key={i}
          className="absolute h-px w-[150vw]"
          style={{ top: `${18 + i * 16}%`, background: glow, rotate: -20, opacity: 0.5 }}
          initial={{ x: i % 2 ? "100vw" : "-100vw" }}
          animate={{ x: 0 }}
          transition={{ duration: 0.9, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
      {dark && (
        <motion.div
          className="absolute top-[12%] right-[14%] w-[22vmin] h-[22vmin] rounded-full"
          style={{ background: "radial-gradient(circle, #f4ffc8 55%, rgb(200 255 140 / 0.5) 62%, transparent 72%)" }}
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      )}
      <motion.h2
        className="relative text-[clamp(30px,8vw,80px)] italic font-light uppercase text-white text-center leading-none"
        style={{ textShadow: `0 0 24px ${glow}` }}
        initial={{ opacity: 0, letterSpacing: "0.6em" }}
        animate={{ opacity: 1, letterSpacing: "0.12em" }}
        transition={{ delay: 0.3, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      >
        {dark ? "The Dark Hour" : "Burn my dread"}
      </motion.h2>
      <Subtitle className="relative mt-6 text-[12px] uppercase tracking-[0.4em]" >
        <span style={{ color: glow }}>{format(new Date(), "M/d EEE")} · Persona 3 day</span>
      </Subtitle>
    </div>
  );
}
