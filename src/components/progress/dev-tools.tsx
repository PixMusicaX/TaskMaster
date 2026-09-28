"use client";

import { useState, useSyncExternalStore } from "react";
import { Wrench, X } from "lucide-react";
import { LEVEL_UP_XP, RPG_TITLES } from "@/lib/constants";
import { DEV_XP_EVENT, getDevXpOffset, setDevXpOffset } from "@/lib/dev-xp";
import { useProgress } from "./progress-provider";

const subscribe = (cb: () => void) => {
  window.addEventListener(DEV_XP_EVENT, cb);
  return () => window.removeEventListener(DEV_XP_EVENT, cb);
};

// XP needed to stand at the start of a level
const xpForLevel = (level: number) => (level - 1) * LEVEL_UP_XP;
const FINAL_RANK_XP = xpForLevel(RPG_TITLES[RPG_TITLES.length - 1].minLevel);

// Development-only panel for spoofing XP (client-side, nothing is saved) to try the animations
export default function DevTools() {
  const { profile, openRecap } = useProgress();
  const [open, setOpen] = useState(false);
  const offset = useSyncExternalStore(subscribe, getDevXpOffset, () => 0);

  if (!profile) return null;

  // Move the (already spoofed) XP to a target by shifting the offset
  const goTo = (xp: number) => setDevXpOffset(offset + (xp - profile.xp));
  const add = (delta: number) => goTo(Math.max(0, profile.xp + delta));
  const nextRank = RPG_TITLES.find(t => t.minLevel > profile.level);

  const buttons: { label: string; onClick: () => void; disabled?: boolean }[] = [
    { label: "+10 XP", onClick: () => add(10) },
    { label: "Level up", onClick: () => goTo(xpForLevel(profile.level + 1)) },
    { label: nextRank ? `Rank up (${nextRank.title})` : "Rank up", onClick: () => nextRank && goTo(xpForLevel(nextRank.minLevel)), disabled: !nextRank },
    { label: "Overflow", onClick: () => goTo(FINAL_RANK_XP + 200) },
    { label: "−100 XP", onClick: () => add(-100) },
    { label: "Preview recap", onClick: openRecap },
  ];

  return (
    <div className="fixed bottom-24 lg:bottom-4 left-4 z-[500] text-xs">
      {open ? (
        <div className="w-64 p-3 rounded-2xl bg-black/85 text-white shadow-2xl backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono font-semibold uppercase tracking-[0.12em] text-yellow-300">Dev · XP spoof</span>
            <button onClick={() => setOpen(false)} aria-label="Close dev tools" className="p-1 rounded hover:bg-white/10"><X size={14} /></button>
          </div>
          <p className="font-mono text-white/70">
            {profile.xp.toLocaleString()} XP · Lv {profile.level} · {profile.title}
            <br />
            Offset: {offset >= 0 ? "+" : ""}{offset.toLocaleString()} (not saved)
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {buttons.map(b => (
              <button
                key={b.label}
                onClick={b.onClick}
                disabled={b.disabled}
                className="px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-left"
              >
                {b.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setDevXpOffset(0)}
            disabled={offset === 0}
            className="w-full px-2 py-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 disabled:opacity-40"
          >
            Reset to real XP
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open dev tools"
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/80 text-yellow-300 font-mono font-semibold shadow-lg"
        >
          <Wrench size={14} /> DEV{offset !== 0 && ` ${offset > 0 ? "+" : ""}${offset}`}
        </button>
      )}
    </div>
  );
}
