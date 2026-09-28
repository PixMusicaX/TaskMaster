"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { usePathname } from "next/navigation";
import { format } from "date-fns";
import { getProfile } from "@/app/actions/gamification";
import { diffProfiles, rankForLevel, type ProfileSnapshot, type ProgressDiff } from "@/lib/progress";
import { initSfx, sfx } from "@/lib/sfx";
import { currentPeriod, useTheme, type Rank } from "@/components/theme-provider";
import XpBurstLayer, { type XpBurst } from "./xp-burst-layer";
import LevelUpToast from "./level-up-toast";
import RankUpCeremony, { type Ceremony } from "./rank-up-ceremony";
import SeasonToast, { type Season } from "./season-toast";

type Profile = Awaited<ReturnType<typeof getProfile>>;

interface ProgressContextType {
  profile: Profile | null;
  // Increments when XP motes land on the bar, so it can pulse
  pulse: number;
  isManual: boolean;
  refresh: () => void;
  setManual: (manual: boolean) => void;
}

const ProgressContext = createContext<ProgressContextType | null>(null);

// The first visible element marked data-xp-target (desktop bar or mobile ribbon)
function findXpTarget() {
  for (const el of document.querySelectorAll<HTMLElement>("[data-xp-target]")) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return null;
}

// Radial palette wipe via the View Transitions API, where supported
function withRankWipe(apply: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduced) return apply();
  const root = document.documentElement;
  root.classList.add("tm-rank-wipe");
  doc.startViewTransition(() => flushSync(apply)).finished.finally(() => root.classList.remove("tm-rank-wipe"));
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { rank, setRank } = useTheme();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [pulse, setPulse] = useState(0);
  const [isManual, setIsManual] = useState(false);
  const [bursts, setBursts] = useState<XpBurst[]>([]);
  const [levelToast, setLevelToast] = useState<number | null>(null);
  const [ceremony, setCeremony] = useState<Ceremony | null>(null);
  const [season, setSeason] = useState<Season | null>(null);

  const prevRef = useRef<ProfileSnapshot | null>(null);
  const requestRef = useRef(0);
  const lastTapRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const ceremonyRef = useRef<Ceremony | null>(null);
  // Latest theme values for the stable refresh callback
  const rankRef = useRef(rank);
  const setRankRef = useRef(setRank);
  useEffect(() => {
    rankRef.current = rank;
    setRankRef.current = setRank;
  });

  const announce = useCallback((diff: ProgressDiff) => {
    const tap = lastTapRef.current && Date.now() - lastTapRef.current.t < 8000 ? lastTapRef.current : null;
    lastTapRef.current = null;
    const target = findXpTarget();
    const origin = tap ?? target ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    if (diff.xpDelta !== 0) {
      const id = Date.now() + Math.random();
      setBursts(b => [...b, { id, delta: diff.xpDelta, origin, target }]);
      setTimeout(() => setBursts(b => b.filter(x => x.id !== id)), 1500);
      if (diff.xpDelta > 0 && target) setTimeout(() => setPulse(p => p + 1), 950);
    }

    if (diff.rankUp) {
      // The ceremony covers the level-up; the palette changes when it closes
      ceremonyRef.current = diff.rankUp;
      setTimeout(() => { setCeremony(diff.rankUp); sfx.rankUp(); }, 700);
    } else if (diff.levelUp) {
      const to = diff.levelUp.to;
      setTimeout(() => { setLevelToast(to); sfx.levelUp(); }, 500);
      setTimeout(() => setLevelToast(current => (current === to ? null : current)), 3600);
    } else if (diff.xpDelta > 0) {
      sfx.complete();
    } else if (diff.xpDelta < 0) {
      sfx.undo();
    }
  }, []);

  const load = useCallback(async (withEffects: boolean) => {
    const id = ++requestRef.current;
    const data = await getProfile(format(new Date(), "yyyy-MM-dd"));
    if (id !== requestRef.current || !data) return; // a newer request superseded this one

    const diff = withEffects ? diffProfiles(prevRef.current, data) : null;
    prevRef.current = data;
    setProfile(data);
    if (diff) announce(diff);

    const manual = !!localStorage.getItem("rank_manually_set");
    setIsManual(manual);
    if (manual || diff?.rankUp || ceremonyRef.current) return;

    const target = rankForLevel(data.level) as Rank;
    if (target !== rankRef.current) setRankRef.current(target);
  }, [announce]);

  const finishCeremony = useCallback(() => {
    const done = ceremonyRef.current;
    ceremonyRef.current = null;
    setCeremony(null);
    if (!done) return;
    // Let the overlay fade before the palette sweeps in
    setTimeout(() => withRankWipe(() => setRankRef.current(done.to as Rank)), 350);
  }, []);

  // Sounds unlock, tap origin tracking and the once-a-month season notice
  useEffect(() => {
    initSfx();
    const onPointer = (e: PointerEvent) => { lastTapRef.current = { x: e.clientX, y: e.clientY, t: Date.now() }; };
    window.addEventListener("pointerdown", onPointer, { capture: true, passive: true });

    const period = currentPeriod();
    const seen = localStorage.getItem("season_seen");
    localStorage.setItem("season_seen", period);
    let seasonTimer: ReturnType<typeof setTimeout> | undefined;
    if (seen && seen !== period) {
      const storedRank = localStorage.getItem("rank");
      const earnedLastSeason = storedRank && localStorage.getItem("rank_period") !== period && storedRank !== "Novice";
      // Let the page settle before announcing
      seasonTimer = setTimeout(() => setSeason({ lastRank: earnedLastSeason ? storedRank : null }), 900);
    }

    return () => {
      clearTimeout(seasonTimer);
      window.removeEventListener("pointerdown", onPointer, { capture: true });
    };
  }, []);

  useEffect(() => {
    const onUpdate = () => load(true);
    window.addEventListener("profile-updated", onUpdate);
    return () => window.removeEventListener("profile-updated", onUpdate);
  }, [load]);

  // Refresh on navigation (e.g. an event's XP lands once its time passes)
  useEffect(() => {
    load(prevRef.current !== null);
  }, [pathname, load]);

  const setManual = useCallback((manual: boolean) => {
    if (manual) localStorage.setItem("rank_manually_set", "true");
    else localStorage.removeItem("rank_manually_set");
    setIsManual(manual);
    if (!manual) load(false);
  }, [load]);

  const refresh = useCallback(() => { load(true); }, [load]);
  const closeSeason = useCallback(() => setSeason(null), []);

  return (
    <ProgressContext.Provider value={{ profile, pulse, isManual, refresh, setManual }}>
      {children}
      <XpBurstLayer bursts={bursts} />
      <LevelUpToast level={levelToast} />
      <SeasonToast season={season} onDone={closeSeason} />
      <RankUpCeremony ceremony={ceremony} onDone={finishCeremony} />
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) throw new Error("useProgress must be used within ProgressProvider");
  return context;
}
