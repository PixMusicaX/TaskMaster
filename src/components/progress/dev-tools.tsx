"use client";

import { useState, useSyncExternalStore } from "react";
import { Wrench, X } from "lucide-react";
import { LEVEL_UP_XP, RPG_TITLES } from "@/lib/constants";
import { DEV_ERA_EVENT, DEV_XP_EVENT, getDevEraOverride, getDevXpOffset, setDevEraOverride, setDevXpOffset } from "@/lib/dev-xp";
import { ERAS } from "@/lib/eras";
import { DEV_PERSONA_EVENT, getDevPersonaOverride, setDevPersonaOverride, type DevPersonaOverride } from "@/lib/persona";
import { getDevMapStatus, rerollDevMap, setDevMapStatus, subscribeDevMap, type MapStatus } from "@/lib/dev-map";
import { DEV_SPECIAL_EVENT, SPECIAL_DAYS, SPECIAL_IDS, getDevSpecialOverride, setDevSpecialOverride, type DevSpecialOverride } from "@/lib/special-days";
import { cn } from "@/lib/utils";
import { useProgress } from "./progress-provider";

const subscribe = (cb: () => void) => {
  window.addEventListener(DEV_XP_EVENT, cb);
  return () => window.removeEventListener(DEV_XP_EVENT, cb);
};

// XP needed to stand at the start of a level
const xpForLevel = (level: number) => (level - 1) * LEVEL_UP_XP;
const FINAL_RANK_XP = xpForLevel(RPG_TITLES[RPG_TITLES.length - 1].minLevel);

const subscribeEra = (cb: () => void) => {
  window.addEventListener(DEV_ERA_EVENT, cb);
  return () => window.removeEventListener(DEV_ERA_EVENT, cb);
};

const subscribePersona = (cb: () => void) => {
  window.addEventListener(DEV_PERSONA_EVENT, cb);
  return () => window.removeEventListener(DEV_PERSONA_EVENT, cb);
};

const subscribeSpecial = (cb: () => void) => {
  window.addEventListener(DEV_SPECIAL_EVENT, cb);
  return () => window.removeEventListener(DEV_SPECIAL_EVENT, cb);
};

const PERSONA_OPTIONS: { value: DevPersonaOverride; label: string; title: string }[] = [
  { value: null, label: "Auto", title: "Follow the calendar" },
  { value: "off", label: "Off", title: "Normal design today" },
  { value: "p3", label: "P3", title: "Force Persona 3" },
  { value: "p4", label: "P4", title: "Force Persona 4" },
  { value: "p5", label: "P5", title: "Force Persona 5" },
];

const MAP_STATUSES: (MapStatus | null)[] = [null, "low", "balanced", "peak"];

// Development-only panel for spoofing XP and the map (client-side, nothing is saved) to try the animations
export default function DevTools() {
  const { profile, openRecap } = useProgress();
  const [open, setOpen] = useState(false);
  const offset = useSyncExternalStore(subscribe, getDevXpOffset, () => 0);
  const mapStatus = useSyncExternalStore(subscribeDevMap, getDevMapStatus, () => null);
  const eraOverride = useSyncExternalStore(subscribeEra, getDevEraOverride, () => null);
  const personaOverride = useSyncExternalStore(subscribePersona, getDevPersonaOverride, () => null);
  const specialOverride = useSyncExternalStore(subscribeSpecial, getDevSpecialOverride, () => null);

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
    <div className="fixed bottom-24 lg:bottom-4 right-4 z-[500] flex flex-col items-end text-xs">
      {open ? (
        <div className="w-64 p-3 rounded-2xl bg-black/85 text-white shadow-2xl backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono font-semibold uppercase tracking-[0.12em] text-yellow-300">Dev tools</span>
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

          <div className="space-y-1.5 pt-2 border-t border-white/10">
            <p className="font-mono font-semibold uppercase tracking-[0.12em] text-white/60">Era</p>
            <div className="grid grid-cols-6 gap-1">
              {[null, ...ERAS.map((_, i) => i)].map(index => (
                <button
                  key={index ?? "auto"}
                  onClick={() => setDevEraOverride(index)}
                  aria-pressed={eraOverride === index}
                  title={index === null ? "Follow the real pace rules" : `Era of ${ERAS[index].name}`}
                  className={cn(
                    "px-1 py-1.5 rounded-lg",
                    eraOverride === index ? "bg-yellow-300 text-black font-semibold" : "bg-white/10 hover:bg-white/20",
                    index !== null && "font-serif font-bold"
                  )}
                >
                  {index === null ? "Auto" : ERAS[index].numeral}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-white/10">
            <p className="font-mono font-semibold uppercase tracking-[0.12em] text-white/60">Persona day</p>
            <div className="grid grid-cols-5 gap-1">
              {PERSONA_OPTIONS.map(o => (
                <button
                  key={o.label}
                  onClick={() => {
                    setDevPersonaOverride(o.value);
                    // Replay the day's intro when forcing a style
                    try { localStorage.removeItem("persona_intro_seen"); } catch { /* storage blocked */ }
                  }}
                  aria-pressed={personaOverride === o.value}
                  title={o.title}
                  className={cn(
                    "px-1 py-1.5 rounded-lg",
                    personaOverride === o.value ? "bg-yellow-300 text-black font-semibold" : "bg-white/10 hover:bg-white/20"
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-white/10">
            <p className="font-mono font-semibold uppercase tracking-[0.12em] text-white/60">Special day</p>
            {/* Twelve themes are too many for buttons: Auto follows the calendar, Off forces a normal day */}
            <select
              value={specialOverride ?? ""}
              onChange={e => setDevSpecialOverride((e.target.value || null) as DevSpecialOverride)}
              className="w-full px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 outline-none"
            >
              <option value="" className="text-black">Auto</option>
              <option value="off" className="text-black">Off</option>
              {SPECIAL_IDS.map(id => <option key={id} value={id} className="text-black">{SPECIAL_DAYS[id].name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-white/10">
            <p className="font-mono font-semibold uppercase tracking-[0.12em] text-white/60">Map status</p>
            <div className="grid grid-cols-4 gap-1">
              {MAP_STATUSES.map(status => (
                <button
                  key={status ?? "auto"}
                  onClick={() => setDevMapStatus(status)}
                  aria-pressed={mapStatus === status}
                  className={cn(
                    "px-1 py-1.5 rounded-lg capitalize",
                    mapStatus === status ? "bg-yellow-300 text-black font-semibold" : "bg-white/10 hover:bg-white/20"
                  )}
                >
                  {status ?? "Auto"}
                </button>
              ))}
            </div>
            <button onClick={rerollDevMap} className="w-full px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20">
              Reroll map terrain
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open dev tools"
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/80 text-yellow-300 font-mono font-semibold shadow-lg"
        >
          <Wrench size={14} /> DEV{offset !== 0 && ` ${offset > 0 ? "+" : ""}${offset}`}{eraOverride !== null && ` · era ${ERAS[eraOverride].numeral}`}{mapStatus && ` · map ${mapStatus}`}{personaOverride && ` · ${personaOverride}`}{specialOverride && ` · ${specialOverride}`}
        </button>
      )}
    </div>
  );
}
