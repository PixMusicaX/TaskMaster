"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RPG_TITLES } from "@/lib/constants";
import { RankCrest } from "@/lib/rank-icons";
import type { PersonaStyle } from "@/lib/persona";
import type { Ceremony } from "@/components/progress/rank-up-ceremony";
import Ransom from "./ransom";

// Each rank is a Major Arcana card
const ARCANA: Record<string, [string, string]> = {
  Novice: ["0", "Fool"],
  Squire: ["I", "Magician"],
  Vanguard: ["II", "Priestess"],
  Veteran: ["III", "Empress"],
  Knight: ["IV", "Emperor"],
  Champion: ["V", "Hierophant"],
  Sentinel: ["VI", "Lovers"],
  Paladin: ["VII", "Chariot"],
  Grandmaster: ["VIII", "Justice"],
  Hero: ["XXI", "World"],
};

const arcanaFor = (rank: string) => ARCANA[rank] ?? ["?", rank];
const rankNumber = (rank: string) => Math.max(1, RPG_TITLES.findIndex(t => t.title === rank) + 1);

// ---------------- Level up: a non-blocking banner ----------------

export function PersonaLevelUp({ level, style }: { level: number | null; style: PersonaStyle }) {
  return (
    <AnimatePresence>
      {level && (
        <motion.div
          key={level}
          className="fixed top-20 left-1/2 z-[360] pointer-events-none"
          initial={{ x: "-50%" }}
          animate={{ x: "-50%" }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          role="status"
          aria-label={`Level up: level ${level}`}
        >
          {style === "p5" && <P5Level level={level} />}
          {style === "p4" && <P4Level level={level} />}
          {style === "p3" && <P3Level level={level} />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function P5Level({ level }: { level: number }) {
  return (
    <div className="relative flex flex-col items-center">
      <motion.div
        className="absolute top-1/2 left-1/2 w-56 h-56 -ml-28 -mt-28"
        style={{ background: "#e5001b", clipPath: "polygon(50% 0, 61% 32%, 96% 20%, 72% 48%, 100% 72%, 64% 68%, 56% 100%, 44% 70%, 8% 90%, 30% 56%, 0 30%, 38% 32%)" }}
        initial={{ scale: 0, rotate: -60 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 14 }}
      />
      <motion.div className="relative -rotate-6" initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.08, type: "spring", stiffness: 600, damping: 18 }}>
        <Ransom text="LEVEL UP!" size="40px" />
      </motion.div>
      <motion.div
        className="relative mt-2 bg-black text-white font-display text-[22px] px-4 py-0.5 border-2 border-white -skew-x-12"
        initial={{ x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 500, damping: 22 }}
      >
        LV {level - 1} <span className="text-[#ff1d38]">▸</span> {level}
      </motion.div>
    </div>
  );
}

function P4Level({ level }: { level: number }) {
  return (
    <motion.div
      className="relative flex items-center gap-3 bg-[#ffe100] border-[3px] border-[#181512] rounded-xl px-4 py-2 shadow-[6px_6px_0_#181512]"
      initial={{ scaleY: 0.05, opacity: 0 }}
      animate={{ scaleY: 1, opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex font-display text-[30px] text-[#181512] italic leading-none">
        {Array.from("LEVEL UP!").map((ch, i) => (
          <motion.span
            key={i}
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: [-24, 4, 0], opacity: 1 }}
            transition={{ delay: 0.15 + i * 0.04, duration: 0.35 }}
            style={{ whiteSpace: "pre" }}
          >
            {ch}
          </motion.span>
        ))}
      </div>
      <motion.span
        className="font-display text-[20px] bg-[#181512] text-[#ffe100] rounded-lg px-2 py-0.5"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.6, type: "spring", stiffness: 600, damping: 12 }}
      >
        Lv{level}
      </motion.span>
    </motion.div>
  );
}

function P3Level({ level }: { level: number }) {
  return (
    <div className="relative px-10 py-3 overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--background)_88%,transparent)] -skew-x-[24deg] border-l-4 border-tm-yellow"
        initial={{ scaleX: 0, originX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="absolute top-0 bottom-0 w-12 bg-white/70 -skew-x-[24deg]"
        initial={{ x: -80 }}
        animate={{ x: 360 }}
        transition={{ delay: 0.3, duration: 0.6, ease: "easeInOut" }}
      />
      <motion.div className="relative flex items-baseline gap-4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
        <span className="text-[28px] italic font-medium uppercase tracking-[0.2em] text-tm-yellow">Level up</span>
        <span className="text-[13px] uppercase tracking-[0.3em] text-tm-blue-gray">Lv <span className="text-[22px] italic text-foreground tracking-normal">{level}</span></span>
      </motion.div>
    </div>
  );
}

// ---------------- Rank up: a full-screen arcana reveal ----------------

export function PersonaRankUp({ ceremony, onDone, style }: { ceremony: Ceremony | null; onDone: () => void; style: PersonaStyle }) {
  useEffect(() => {
    if (!ceremony) return;
    const timer = setTimeout(onDone, 7000);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter") onDone(); };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(timer); window.removeEventListener("keydown", onKey); };
  }, [ceremony, onDone]);

  return (
    <AnimatePresence>
      {ceremony && (
        <motion.div
          className="fixed inset-0 z-[400] flex items-center justify-center overflow-hidden cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          onClick={onDone}
          role="dialog"
          aria-modal="true"
          aria-label={`Rank up: ${ceremony.to}`}
        >
          {style === "p5" && <P5Rank ceremony={ceremony} />}
          {style === "p4" && <P4Rank ceremony={ceremony} />}
          {style === "p3" && <P3Rank ceremony={ceremony} />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ArcanaCard({ rank, className, ink, paper, accent }: { rank: string; className?: string; ink: string; paper: string; accent: string }) {
  const [numeral, name] = arcanaFor(rank);
  return (
    <div className={className} style={{ background: paper, color: ink, border: `3px solid ${ink}` }}>
      <div className="h-full w-full flex flex-col items-center justify-between py-3" style={{ outline: `1px solid ${accent}`, outlineOffset: -8 }}>
        <span className="font-display text-[22px] leading-none">{numeral}</span>
        <span style={{ color: accent }}><RankCrest rank={rank} size={64} strokeWidth={1.5} /></span>
        <span className="font-display text-[13px] uppercase tracking-[0.2em] leading-none">{name}</span>
      </div>
    </div>
  );
}

function P5Rank({ ceremony }: { ceremony: Ceremony }) {
  const n = rankNumber(ceremony.to);
  return (
    <div className="absolute inset-0 bg-[#0b0b0b] flex items-center justify-center">
      <motion.div
        className="absolute h-[46vh] w-[160vw] bg-[#e5001b]"
        style={{ rotate: -14 }}
        initial={{ x: "-140vw" }}
        animate={{ x: 0 }}
        transition={{ duration: 0.45, ease: [0.7, 0, 0.3, 1] }}
      />
      <div className="relative flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
        <motion.div
          initial={{ rotateY: 180, scale: 0.4, rotate: -30 }}
          animate={{ rotateY: 0, scale: 1, rotate: -8 }}
          transition={{ delay: 0.35, type: "spring", stiffness: 160, damping: 14 }}
          style={{ transformPerspective: 800 }}
        >
          <ArcanaCard rank={ceremony.to} className="w-36 h-56 shadow-[10px_10px_0_#000]" ink="#0b0b0b" paper="#ffffff" accent="#e5001b" />
        </motion.div>
        <div className="flex flex-col items-center sm:items-start gap-3">
          <motion.div initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.75, type: "spring", stiffness: 500, damping: 16 }} className="-rotate-6">
            <Ransom text="RANK UP!!" size="clamp(40px, 10vw, 72px)" />
          </motion.div>
          <motion.div className="bg-white text-black font-display text-[26px] px-4 -skew-x-12 border-[3px] border-black" initial={{ x: 120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 1, type: "spring", stiffness: 400, damping: 22 }}>
            {ceremony.to.toUpperCase()} <span className="text-[#e5001b]">RANK {n}</span>
          </motion.div>
          <motion.p className="font-display italic text-white text-[15px] tracking-wider bg-black px-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>
            I am thou, thou art I…
          </motion.p>
        </div>
      </div>
      <TapHint className="text-white/70 font-display tracking-[0.3em]" />
    </div>
  );
}

function P4Rank({ ceremony }: { ceremony: Ceremony }) {
  const n = rankNumber(ceremony.to);
  return (
    <div className="absolute inset-0 bg-[#181512]/90 flex items-center justify-center">
      <motion.div
        className="relative flex flex-col items-center gap-5 bg-[#ffe100] border-4 border-[#181512] rounded-2xl px-8 py-6 shadow-[10px_10px_0_#ef5f00]"
        initial={{ scaleY: 0.02, scaleX: 1.1 }}
        animate={{ scaleY: 1, scaleX: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <motion.p className="font-display text-[clamp(26px,7vw,44px)] italic text-[#181512] leading-none" initial={{ opacity: 0, y: -10 }} animate={{ opacity: [0, 1, 0.5, 1], y: 0 }} transition={{ delay: 0.3 }}>
          SOCIAL LINK
        </motion.p>
        <motion.div
          initial={{ rotateY: 90 }}
          animate={{ rotateY: 0 }}
          transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
          style={{ transformPerspective: 800 }}
        >
          <ArcanaCard rank={ceremony.to} className="w-32 h-48 rounded-lg" ink="#181512" paper="#fffdf2" accent="#ef5f00" />
        </motion.div>
        <motion.div className="flex items-center gap-2" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1, type: "spring", stiffness: 500, damping: 12 }}>
          <span className="font-display text-[22px] text-[#181512]">RANK</span>
          <span className="font-display text-[34px] bg-[#181512] text-[#ffe100] rounded-lg px-3 leading-tight">{n}</span>
          <span className="font-display text-[18px] text-[#e35200]">{ceremony.to.toUpperCase()}</span>
        </motion.div>
        <motion.p className="text-[13px] font-black text-[#181512]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>
          Thou art I… and I am thou…
        </motion.p>
      </motion.div>
      <TapHint className="text-[#ffe100]/80 font-display tracking-[0.3em]" />
    </div>
  );
}

function P3Rank({ ceremony }: { ceremony: Ceremony }) {
  const [numeral, name] = arcanaFor(ceremony.to);
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--background) 94%, transparent)" }}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="absolute w-40 h-40 border border-tm-yellow rotate-45"
          initial={{ scale: 0.3, opacity: 0.8 }}
          animate={{ scale: 3.4, opacity: 0 }}
          transition={{ delay: 0.5 + i * 0.3, duration: 1.6, ease: "easeOut" }}
        />
      ))}
      <div className="relative flex flex-col items-center gap-6">
        <motion.div
          initial={{ rotateY: 720, scale: 0.3, opacity: 0 }}
          animate={{ rotateY: 0, scale: 1, opacity: 1 }}
          transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformPerspective: 900 }}
        >
          <div className="text-tm-yellow" style={{ filter: "drop-shadow(0 0 18px var(--tm-yellow))" }}>
            <ArcanaCard rank={ceremony.to} className="w-36 h-56" ink="var(--tm-yellow)" paper="var(--background)" accent="var(--tm-orange-light)" />
          </div>
        </motion.div>
        <motion.p className="text-[12px] uppercase tracking-[0.5em] text-tm-blue-gray" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
          Arcana {numeral} · {name}
        </motion.p>
        <motion.h2
          className="text-[clamp(32px,8vw,64px)] italic font-light uppercase text-foreground leading-none"
          initial={{ opacity: 0, letterSpacing: "0.5em" }}
          animate={{ opacity: 1, letterSpacing: "0.1em" }}
          transition={{ delay: 1.1, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          {ceremony.to}
        </motion.h2>
        <motion.p className="text-[13px] italic text-tm-yellow tracking-wider" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}>
          Thou art I… and I am thou…
        </motion.p>
      </div>
      <TapHint className="text-tm-blue-gray uppercase tracking-[0.4em]" />
    </div>
  );
}

function TapHint({ className }: { className?: string }) {
  return (
    <motion.p
      className={`absolute bottom-10 left-0 right-0 text-center text-[12px] ${className ?? ""}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0.4, 1] }}
      transition={{ delay: 2.2, duration: 2, repeat: Infinity }}
    >
      TAP TO CONTINUE
    </motion.p>
  );
}
