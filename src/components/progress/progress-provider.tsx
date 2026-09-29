"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { usePathname } from "next/navigation";
import { format, subMonths } from "date-fns";
import { getEraProgress, getProfile } from "@/app/actions/gamification";
import { getSeasonRecap } from "@/app/actions/recap";
import RecapModal from "@/components/RecapModal";
import { DEV_ERA_EVENT, DEV_TOOLS_ENABLED, DEV_XP_EVENT, getDevEraOverride, withDevXp } from "@/lib/dev-xp";
import type { SeasonRecap } from "@/lib/types";
import { diffProfiles, rankForLevel, type ProfileSnapshot, type ProgressDiff } from "@/lib/progress";
import { ERAS, eraAt, liveEraIndex } from "@/lib/eras";
import { initSfx, sfx } from "@/lib/sfx";
import { currentPeriod, useTheme, type Rank } from "@/components/theme-provider";
import XpBurstLayer, { type XpBurst } from "./xp-burst-layer";
import LevelUpToast from "./level-up-toast";
import RankUpCeremony, { type Ceremony } from "./rank-up-ceremony";
import SeasonToast, { type Season } from "./season-toast";
import EraToast, { type EraShift } from "./era-toast";
import { EraStandingContext, type EraStanding } from "./era-standing";
import DevTools from "./dev-tools";

type Profile = Awaited<ReturnType<typeof getProfile>>;
type EraProgress = Awaited<ReturnType<typeof getEraProgress>>;


interface ProgressContextType {
  profile: Profile | null;
  // Increments when XP motes land on the bar, so it can pulse
  pulse: number;
  isManual: boolean;
  refresh: () => void;
  setManual: (manual: boolean) => void;
  // Opens last season's recap on demand (the dev tools use this to preview it)
  openRecap: () => void;
  era: EraStanding | null;
}

const ProgressContext = createContext<ProgressContextType | null>(null);

// When the XP motes reach the bar (see XpBurstLayer); the bar fills and pulses then
const XP_LANDING_MS = 950;

// The first visible element marked data-xp-target (desktop bar or mobile ribbon)
function findXpTarget() {
  for (const el of document.querySelectorAll<HTMLElement>("[data-xp-target]")) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return null;
}

// Centre of the text field that has focus, if it's on screen
function focusedFieldPoint() {
  const el = document.activeElement;
  if (!(el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement)) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.bottom < 0 || r.top > window.innerHeight) return null;
  return { x: r.left + Math.min(r.width / 2, 120), y: r.top + r.height / 2 };
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
  const { rank, setRank, era: themeEra, setEra } = useTheme();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [pulse, setPulse] = useState(0);
  const [isManual, setIsManual] = useState(false);
  const [bursts, setBursts] = useState<XpBurst[]>([]);
  const [levelToast, setLevelToast] = useState<number | null>(null);
  const [ceremony, setCeremony] = useState<Ceremony | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [recap, setRecap] = useState<SeasonRecap | null>(null);
  const [recapOpen, setRecapOpen] = useState(false);
  const [eraShift, setEraShift] = useState<EraShift | null>(null);
  const [eraStanding, setEraStanding] = useState<EraStanding | null>(null);

  const prevRef = useRef<ProfileSnapshot | null>(null);
  const requestRef = useRef(0);
  const lastTapRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const ceremonyRef = useRef<Ceremony | null>(null);
  // This season's starting era and last month's pace, fetched once a day
  const eraProgressRef = useRef<{ day: string; data: EraProgress } | null>(null);
  // Latest theme values for the stable refresh callback
  const rankRef = useRef(rank);
  const setRankRef = useRef(setRank);
  const eraIdRef = useRef(themeEra.id);
  const setEraRef = useRef(setEra);
  useEffect(() => {
    rankRef.current = rank;
    setRankRef.current = setRank;
    eraIdRef.current = themeEra.id;
    setEraRef.current = setEra;
  });

  // Place the player in an era for this XP; with `announce`, a change gets a toast and the palette
  // wipe once the XP motes have landed
  const placeEra = useCallback((xp: number, announceAfterMs: number | null) => {
    const progress = eraProgressRef.current?.data;
    const forced = getDevEraOverride(); // dev tools only; always null in production
    if (!progress && forced === null) return;
    const index = forced ?? liveEraIndex(progress!.startIndex, xp, progress!.lastMonthPaceXP);
    if (progress) {
      setEraStanding({ index, startIndex: progress.startIndex, lastMonthName: progress.lastMonthName, lastMonthPaceXP: progress.lastMonthPaceXP });
    }

    const current = ERAS.findIndex(e => e.id === eraIdRef.current);
    if (index === current) return;
    const next = eraAt(index);
    if (announceAfterMs === null) {
      setEraRef.current(next.id);
      return;
    }
    setTimeout(() => {
      withRankWipe(() => setEraRef.current(next.id));
      setEraShift({ era: next, up: index > current, lastMonthName: progress?.lastMonthName ?? "last month" });
      if (index > current) sfx.levelUp(); else sfx.undo();
    }, announceAfterMs);
  }, []);

  const ensureEraProgress = useCallback(async () => {
    const day = format(new Date(), "yyyy-MM-dd");
    if (eraProgressRef.current?.day === day) return;
    const data = await getEraProgress(day);
    eraProgressRef.current = { day, data };
    // Place silently against the latest known XP (the profile may have loaded first)
    placeEra(prevRef.current ? prevRef.current.xp : 0, null);
  }, [placeEra]);

  // Plays the effects for a change; returns true when motes are flying to the XP bar
  const announce = useCallback((diff: ProgressDiff): boolean => {
    const tap = lastTapRef.current && Date.now() - lastTapRef.current.t < 8000 ? lastTapRef.current : null;
    lastTapRef.current = null;
    const target = findXpTarget();
    // Typing (e.g. a note autosave) has no tap, so start from the field being typed in
    const origin = tap ?? focusedFieldPoint() ?? target ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    const flying = diff.xpDelta > 0 && !!target;
    if (diff.xpDelta !== 0) {
      const id = Date.now() + Math.random();
      setBursts(b => [...b, { id, delta: diff.xpDelta, origin, target }]);
      setTimeout(() => setBursts(b => b.filter(x => x.id !== id)), 1500);
      if (flying) setTimeout(() => setPulse(p => p + 1), XP_LANDING_MS);
    }

    // Level-ups land after the bar fills
    const landed = flying ? XP_LANDING_MS : 0;
    if (diff.rankUp) {
      // The ceremony covers the level-up; the palette changes when it closes
      ceremonyRef.current = diff.rankUp;
      setTimeout(() => { setCeremony(diff.rankUp); sfx.rankUp(); }, landed + 300);
    } else if (diff.levelUp) {
      const to = diff.levelUp.to;
      setTimeout(() => { setLevelToast(to); sfx.levelUp(); }, landed + 150);
      setTimeout(() => setLevelToast(current => (current === to ? null : current)), landed + 3250);
    } else if (diff.xpDelta > 0) {
      sfx.complete();
    } else if (diff.xpDelta < 0) {
      sfx.undo();
    }
    return flying;
  }, []);

  const load = useCallback(async (withEffects: boolean) => {
    const id = ++requestRef.current;
    const fetched = await getProfile(format(new Date(), "yyyy-MM-dd"));
    if (id !== requestRef.current || !fetched) return; // a newer request superseded this one
    const data = withDevXp(fetched);

    const diff = withEffects ? diffProfiles(prevRef.current, data) : null;
    prevRef.current = data;
    // Gained XP shows on the bar once the motes reach it (unless a newer load took over)
    const flying = diff ? announce(diff) : false;
    if (flying) {
      setTimeout(() => { if (id === requestRef.current) setProfile(data); }, XP_LANDING_MS);
    } else {
      setProfile(data);
    }
    // Rank-ups have their own ceremony; era shifts follow the XP landing
    placeEra(data.xp, diff ? (flying ? XP_LANDING_MS : 0) + (diff.rankUp ? 7500 : 400) : null);

    // A manual rank pick only lasts for the month it was made in (older flags, including the
    // pre-v6 "true", are dropped so the rank syncs again instead of sticking at Novice)
    const flag = localStorage.getItem("rank_manually_set");
    const manual = flag === currentPeriod();
    if (flag && !manual) localStorage.removeItem("rank_manually_set");
    setIsManual(manual);
    if (manual || diff?.rankUp || ceremonyRef.current) return;

    // Also re-save when the stored rank isn't stamped with this month (e.g. saved before v6),
    // so the next load starts on the right rank instead of Novice
    const target = rankForLevel(data.level) as Rank;
    if (target !== rankRef.current || localStorage.getItem("rank_period") !== currentPeriod()) {
      setRankRef.current(target);
    }
  }, [announce, placeEra]);

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
    let cancelled = false;
    const showSeasonToast = () => {
      if (!seen || seen === period) return;
      const storedRank = localStorage.getItem("rank");
      const earnedLastSeason = storedRank && localStorage.getItem("rank_period") !== period && storedRank !== "Novice";
      // Let the page settle before announcing
      seasonTimer = setTimeout(() => setSeason({ lastRank: earnedLastSeason ? storedRank : null }), 900);
    };

    // Once per season, recap the one that just ended; the recap replaces the new-season toast
    const recapKey = `recap_${format(subMonths(new Date(), 1), "yyyy_MM")}`;
    if (localStorage.getItem(recapKey)) {
      showSeasonToast();
    } else {
      getSeasonRecap(format(new Date(), "yyyy-MM-dd"))
        .then(data => {
          if (cancelled) return;
          localStorage.setItem(recapKey, "true");
          if (data.xp > 0) {
            setRecap(data);
            seasonTimer = setTimeout(() => setRecapOpen(true), 900);
          } else {
            showSeasonToast();
          }
        })
        .catch(() => { if (!cancelled) showSeasonToast(); });
    }

    return () => {
      cancelled = true;
      clearTimeout(seasonTimer);
      window.removeEventListener("pointerdown", onPointer, { capture: true });
    };
  }, []);

  useEffect(() => {
    const onUpdate = () => load(true);
    // A forced era plays the same toast and wipe as a real crossing
    const onDevEra = () => placeEra(prevRef.current ? prevRef.current.xp : 0, 0);
    window.addEventListener("profile-updated", onUpdate);
    window.addEventListener(DEV_XP_EVENT, onUpdate);
    window.addEventListener(DEV_ERA_EVENT, onDevEra);
    return () => {
      window.removeEventListener("profile-updated", onUpdate);
      window.removeEventListener(DEV_XP_EVENT, onUpdate);
      window.removeEventListener(DEV_ERA_EVENT, onDevEra);
    };
  }, [load, placeEra]);

  // Refresh on navigation (e.g. an event's XP lands once its time passes)
  useEffect(() => {
    load(prevRef.current !== null);
    ensureEraProgress().catch(err => console.error("Era progress failed:", err));
  }, [pathname, load, ensureEraProgress]);

  const setManual = useCallback((manual: boolean) => {
    if (manual) localStorage.setItem("rank_manually_set", currentPeriod());
    else localStorage.removeItem("rank_manually_set");
    setIsManual(manual);
    if (!manual) load(false);
  }, [load]);

  const refresh = useCallback(() => { load(true); }, [load]);
  const closeSeason = useCallback(() => setSeason(null), []);
  const closeRecap = useCallback(() => setRecapOpen(false), []);
  const closeEraShift = useCallback(() => setEraShift(null), []);
  const openRecap = useCallback(() => {
    getSeasonRecap(format(new Date(), "yyyy-MM-dd")).then(data => {
      setRecap(data);
      setRecapOpen(true);
    });
  }, []);

  return (
    <ProgressContext.Provider value={{ profile, pulse, isManual, refresh, setManual, openRecap, era: eraStanding }}>
      <EraStandingContext.Provider value={eraStanding}>
        {children}
      </EraStandingContext.Provider>
      <XpBurstLayer bursts={bursts} />
      <LevelUpToast level={levelToast} />
      <SeasonToast season={season} onDone={closeSeason} />
      <EraToast shift={eraShift} onDone={closeEraShift} />
      <RankUpCeremony ceremony={ceremony} onDone={finishCeremony} />
      <RecapModal recap={recap} isOpen={recapOpen} onClose={closeRecap} />
      {DEV_TOOLS_ENABLED && <DevTools />}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) throw new Error("useProgress must be used within ProgressProvider");
  return context;
}
