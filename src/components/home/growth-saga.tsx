"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import { createScope, createTimeline, onScroll, stagger, utils } from "animejs";
import { RPG_TITLES } from "@/lib/constants";
import { ERAS } from "@/lib/eras";
import { prefersReducedMotion } from "@/lib/scroll-fx";
import { cn } from "@/lib/utils";
import type { HistoryDay } from "@/app/actions/history";
import type { EventRow, NoteRow, Profile, SeasonPace } from "@/lib/types";
import { useEraStanding } from "@/components/progress/era-standing";
import { useTheme } from "@/components/theme-provider";
import EraHint from "./era-hint";
import { C, CAPTION, R, TITLE, anchorAt, polar } from "./saga-kit";
import {
  ChronicleDetails, ChronicleEmblem, ChronicleTitle, FutureDetails, FutureEmblem, FutureTitle,
  chronicleYears, futureMarks, yearSweep,
} from "./saga-time-scenes";
import type { MapInfo } from "@/components/map-generator";
import { AskDetails, AskEmblem, AskTaskmasterButton, AskTitle } from "./saga-ask-scene";
import { MapDetails, MapEmblem, MapTitle } from "./saga-map-scene";
import { TavernDetails, TavernEmblem, TavernTitle, type TavernProps } from "./saga-tavern-scene";
import { METER_MAX_XP, meterScale, raceGoal } from "./season-pace-card";

const RANKS = RPG_TITLES.length;

const polygon = (angles: readonly number[], radii: number[]) => angles.map((a, i) => { const p = polar(a, radii[i]); return `${p.x},${p.y}`; }).join(" ");

// Rank nodes sit evenly round the ring, Novice at twelve o'clock
const NODES = RPG_TITLES.map((t, i) => ({ ...t, ...polar((i / RANKS) * 360, R), label: polar((i / RANKS) * 360, R + 24) }));

// The radar sits inside the rank ring, its labels just outside it
const RADAR = 150;
const LABELS = R + 30;
const LEVELS = [0.25, 0.5, 0.75, 1];
const STATS = [
  { key: "strength", label: "Strength", className: "text-tm-orange-dark" },
  { key: "intelligence", label: "Intelligence", className: "text-tm-yellow" },
  { key: "wealth", label: "Wealth", className: "text-tm-orange-light" },
  { key: "vitality", label: "Vitality", className: "text-tm-red" },
  { key: "charisma", label: "Charisma", className: "text-tm-blue-gray" },
] as const;
const MOODS = [
  { mood: "good", label: "Joy", className: "text-tm-yellow" },
  { mood: "neutral", label: "Steady", className: "text-tm-blue-gray" },
  { mood: "bad", label: "Stress", className: "text-tm-orange-dark" },
] as const;
const STAT_ANGLES = STATS.map((_, i) => i * 72);
// The mood triangle drawn with the pentagon's five vertices (two pairs coincide), so one can morph into the other
const MOOD_ANGLES = [0, 120, 120, 240, 240];
const MOOD_OF_VERTEX = [0, 1, 1, 2, 2];
// The season XP gauge: a circle inside the rank path with a quarter cut out of the bottom, read clockwise
const GAUGE_FROM = 225;
const GAUGE_SWEEP = 270;
const gaugeAngle = (fraction: number) => GAUGE_FROM + GAUGE_SWEEP * Math.min(1, Math.max(0, fraction));
const GAUGE = 166;
const GAUGE_START = polar(GAUGE_FROM, GAUGE);
const GAUGE_END = polar(GAUGE_FROM + GAUGE_SWEEP, GAUGE);
const GAUGE_PATH = `M ${GAUGE_START.x} ${GAUGE_START.y} A ${GAUGE} ${GAUGE} 0 1 1 ${GAUGE_END.x} ${GAUGE_END.y}`;
// How far the pace rings tip over and slant, in degrees
const PACE_TIP = 58;
const PACE_SLANT = -14;
// The two tipped rings of the pace scene, in two shades of one accent: today's XP against the
// daily target, and the days of the season still to run
const RACE_RING = 146;
const TIME_RING = 112;
const RACE_COLOR = "var(--tm-orange-dark)";
// How long the Future Sight hand takes to go round
const FUTURE_SWEEP = 34;
const TIME_COLOR = "color-mix(in srgb, var(--tm-orange-dark) 55%, var(--tm-yellow))";

const even = (r: number) => STATS.map(() => r);
const STAT_GRID = LEVELS.map(l => polygon(STAT_ANGLES, even(RADAR * l)));
const MOOD_GRID = LEVELS.map(l => polygon(MOOD_ANGLES, even(RADAR * l)));

// The scroll script, in svh of scrolling. The orbit assembles during the approach (the half screen
// before the stage pins) and fills while pinned; its centre then turns from level to era while the
// level ring tips over, the season's XP gauge turns in with its two tipped rings, the radar draws
// inside the dotted circle for the stats and reshapes for the moods, the Tavern seats the day's
// relief, Future Sight sweeps the next two weeks, the Chronicle reaches back through the years, a
// compass gives way to the map and the orbit returns whole around the Taskmaster. The dial's
// turning is not part of the script (see its effect).
const APPROACH = 50;
const ERA_AT = 108;
const PACE_AT = 162;
const STATS_AT = 250;
const MOOD_AT = 322;
const TAVERN_AT = 394;
// The Chronicle steps through its years, one YEAR_STEP of scroll each
const YEAR_STEP = 40;
const FUTURE_LENGTH = 84;
const TAVERN_LENGTH = 76;
const MAP_LENGTH = 96;
const ASK_LENGTH = 64;
const TAIL = 30;

// When the later scenes start. The Chronicle only plays when past years have something on today's
// date, and its length depends on how many, so everything after it is worked out per render.
// `from` is the moment each scene takes the stage and `holdsAt` a moment when it is holding it.
function sceneTimes(years: number) {
  const futureAt = TAVERN_AT + TAVERN_LENGTH;
  const chronAt = futureAt + FUTURE_LENGTH;
  const mapAt = chronAt + (years > 0 ? 10 + years * YEAR_STEP + 14 : 0);
  const askAt = mapAt + MAP_LENGTH;
  const drawn = [
    { id: "standing", label: "Standing", from: 0, holdsAt: ERA_AT - 14 },
    { id: "era", label: "Era Status", from: ERA_AT + 6, holdsAt: PACE_AT - 16 },
    { id: "pace", label: "Season Pace", from: PACE_AT + 6, holdsAt: STATS_AT - 32 },
    { id: "stats", label: "Character Stats", from: STATS_AT + 8, holdsAt: MOOD_AT - 16 },
    { id: "mood", label: "Stress Metrics", from: MOOD_AT + 10, holdsAt: TAVERN_AT - 24 },
    { id: "tavern", label: "Tavern", from: TAVERN_AT + 2, holdsAt: futureAt - 28 },
    { id: "future", label: "Future Sight", from: futureAt + 2, holdsAt: chronAt - 24 },
    ...(years > 0 ? [{ id: "chronicle", label: "Chronicle", from: chronAt + 2, holdsAt: chronAt + 10 + 18 }] : []),
    { id: "map", label: "The Map", from: mapAt + 2, holdsAt: askAt - 20 },
    { id: "ask", label: "The Taskmaster", from: askAt + 2, holdsAt: askAt + 40 },
  ];
  // Where the scroll comes to rest: once per scene, and once per year inside the Chronicle
  const stops = drawn.flatMap(d => d.id === "chronicle" ? Array.from({ length: years }, (_, i) => d.holdsAt + i * YEAR_STEP) : [d.holdsAt]);
  // The last scene stays on stage for the TAIL, until the page unpins
  return { futureAt, chronAt, mapAt, askAt, drawn, stops, length: askAt + ASK_LENGTH + TAIL };
}

// Scrolling inside the saga moves one stop at a time. A gesture is a run of wheel events with no
// gap longer than this; a swipe has to travel this far; and the page settles on the nearest stop
// this long after any other scrolling ends.
const WHEEL_GAP = 160;
const SWIPE_MIN = 36;
const SETTLE_AFTER = 160;
// Left alone on a stop for this long, the saga moves on to the next one by itself (and from the
// last one, rolls back to the first)
const IDLE_BEFORE_AUTO = 8000;
// Left idle anywhere above the saga for this long, the home page scrolls down to it
const IDLE_BEFORE_ARRIVING = 20000;
// Future Sight waits longer, so its scrolling list can be read through: a base, plus the time the
// list takes to show each event (see TICK in saga-time-scenes.tsx), within these bounds
const FUTURE_IDLE = { base: 8000, perEvent: 2600, min: 14000, max: 32000 };
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// The dial's turn rate in degrees a second: at rest, per px/s of scrolling, and the most scrolling can add
const DIAL_IDLE = 5;
const DIAL_PER_PX = 0.12;
const DIAL_MAX = 240;
// How fast the tipped rings turn relative to the dial
const RING_TURN = 1.6;


// How far round the rank ring the player is: whole ranks plus progress towards the next one
function ringProgress(profile: Profile | null, rankIndex: number) {
  if (!profile) return rankIndex / RANKS;
  const from = RPG_TITLES[rankIndex].minLevel;
  const next = RPG_TITLES[rankIndex + 1];
  if (!next) return 1;
  const levels = profile.level - from + profile.levelProgress / profile.nextLevelXP;
  return (rankIndex + Math.min(1, levels / (next.minLevel - from))) / RANKS;
}

// A progress ring that can tip over like Saturn's. It is drawn in two halves, the upper behind the
// centre text and the lower in front of it, so that once tipped it passes round the text. `group`
// names the wrappers the script animates (tilt, tip and spin); `arc` names the filled part and
// `track` is the opacity of the unfilled part.
function TiltRing({ group, arc, r, progress, color, track = 0.07, front }: { group: string; arc: string; r: number; progress: number; color: string; track?: number; front?: boolean }) {
  return (
    <div data-saga={`${group}-tilt`} aria-hidden className={cn("absolute inset-0", front && "motion-reduce:hidden")}>
      <div
        className={cn("absolute inset-0", front ? "[clip-path:inset(50%_-25%_-25%_-25%)]" : "[clip-path:inset(-25%_-25%_49.8%_-25%)] motion-reduce:[clip-path:none]")}
        style={{ perspective: 900 }}
      >
        <div data-saga={group} className="absolute inset-0">
          <svg data-saga={`${group}-spin`} viewBox="0 0 400 400" className="absolute inset-0 w-full h-full overflow-visible" style={{ color }}>
            <circle cx={C} cy={C} r={r} fill="none" stroke="currentColor" strokeWidth="5" opacity={track} />
            <circle
              data-saga={arc}
              cx={C} cy={C} r={r}
              fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
              pathLength={1} strokeDasharray="1"
              transform={`rotate(-90 ${C} ${C})`}
              style={{ strokeDashoffset: 1 - progress }}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

// How today is going against the daily target: the XP still needed when the day began to finish
// above last month's total, spread over the days left (today included)
export function dailyTarget(xp: number, xpBeforeToday: number, lastMonthTotalXP: number, daysLeft: number) {
  const earned = Math.max(0, xp - xpBeforeToday);
  const needed = lastMonthTotalXP - xpBeforeToday + 1;
  if (needed <= 0) return { earned, target: 0, left: 0, progress: 1 };
  const target = Math.ceil(needed / (daysLeft + 1));
  return { earned, target, left: Math.max(0, target - earned), progress: Math.min(1, earned / target) };
}

// The analytics as one pinned scroll sequence. The season's emblem assembles (level, rank path),
// turns to show the era, becomes the season's XP gauge, then holds a radar that draws the character
// stats and reshapes into the 30-day moods, seats the day's relief suggestions, sweeps the next
// two weeks, reaches back through today's date in past years, unrolls the map and ends on the
// way to the Taskmaster. With reduced motion nothing pins or animates: the emblem sits in the page
// flow with the plain cards (`fallback`) beneath it.
const subscribeReducedMotion = (onChange: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

interface GrowthSagaProps {
  profile: Profile | null;
  moodData: Pick<NoteRow, "mood">[];
  pace: SeasonPace | null;
  // This season's XP as it stood when today began (null until loaded)
  xpBeforeToday: number | null;
  // Today's date in earlier years, and what is coming up
  onThisDay: HistoryDay[];
  futureEvents: EventRow[];
  todayStr: string;
  // Today's AI relief suggestions, and how to act on them
  tavern: TavernProps;
  // Feeds the map (with the profile and moods)
  completionScore: number;
  // Opens the Taskmaster's dialog
  onAsk: () => void;
  // The analytics as plain cards, shown instead of the drawn scenes when motion is reduced
  fallback: React.ReactNode;
}

export default function GrowthSaga({ profile, moodData, pace, xpBeforeToday, onThisDay, futureEvents, todayStr, tavern, completionScore, onAsk, fallback }: GrowthSagaProps) {
  const reduced = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);
  const [mapInfo, setMapInfo] = useState<MapInfo | null>(null);
  const root = useRef<HTMLElement>(null);
  const totalRef = useRef<HTMLSpanElement>(null);
  const paceXpRef = useRef<HTMLSpanElement>(null);
  const dialRef = useRef<SVGSVGElement>(null);
  const dialDirection = useRef(1);
  const levelRingTurns = useRef(false);
  const { rank: savedRank, era } = useTheme();
  const standing = useEraStanding();
  // Index into the scenes
  const [scene, setScene] = useState(0);
  // The year the Chronicle is showing
  const [chronStep, setChronStep] = useState(0);

  // Until the profile loads, stand on the rank saved before first paint
  const rankIndex = profile
    ? Math.max(0, RPG_TITLES.findLastIndex(t => profile.level >= t.minLevel))
    : Math.max(0, RPG_TITLES.findIndex(t => t.title === savedRank));
  const rank = RPG_TITLES[rankIndex].title;
  const progress = ringProgress(profile, rankIndex);
  const levelProgress = profile ? Math.min(1, profile.levelProgress / profile.nextLevelXP) : 0;
  const xp = profile?.xp ?? 0;
  const level = profile?.level ?? 1;
  const nextRank = NODES[rankIndex + 1];
  const topStat = profile && profile.topStat !== "none" ? profile.topStat : null;

  const values = STATS.map(s => profile?.[s.key] ?? 0);
  const maxStat = Math.max(...values, 1);
  const totalXP = values.reduce((a, b) => a + b, 0);
  const statRadii = values.map(v => (v / maxStat) * RADAR);

  const moods = MOODS.map(m => moodData.filter(d => d.mood === m.mood).length);
  const maxMood = Math.max(...moods, 1);
  const moodRadii = MOOD_OF_VERTEX.map(m => (moods[m] / maxMood) * RADAR);
  // Strings, so the effect below only rebuilds when a shape really changes
  const statShape = polygon(STAT_ANGLES, statRadii);
  const moodShape = polygon(MOOD_ANGLES, moodRadii);

  // Season pace: the gauge runs to the final rank's XP (further if anyone went past it), with last
  // month's pace by today and its final total marked on it
  const hasRival = !!pace && pace.lastMonthTotalXP > 0;
  const meter = meterScale(xp, hasRival ? pace : null);
  const meterFill = Math.min(1, xp / meter.max);
  const overflowing = xp >= METER_MAX_XP;
  const ticks = hasRival ? [
    { label: `${pace.lastMonthName.slice(0, 3)} D${pace.dayOfMonth} · ${pace.lastMonthPaceXP.toLocaleString()}`, at: pace.lastMonthPaceXP / meter.max, className: "text-foreground", dashed: false },
    { label: `Final · ${pace.lastMonthTotalXP.toLocaleString()}`, at: pace.lastMonthTotalXP / meter.max, className: "text-tm-blue-gray", dashed: true },
  ] : [];
  const daysLeft = pace ? pace.daysInMonth - pace.dayOfMonth : 0;
  const goal = pace ? raceGoal(xp, pace, daysLeft) : null;
  const delta = pace ? xp - pace.lastMonthPaceXP : 0;
  // Today's ring: XP earned today against today's share of what was still needed this morning to
  // finish above last month. Full once the share is met, or when last month is already beaten.
  const today = hasRival && xpBeforeToday !== null ? dailyTarget(xp, xpBeforeToday, pace.lastMonthTotalXP, daysLeft) : null;
  const raceProgress = today ? today.progress : 0;
  // The season ring empties as the days run out
  const timeProgress = pace ? daysLeft / pace.daysInMonth : 0;
  const tickCount = ticks.length;

  const years = chronicleYears(onThisDay, todayStr);
  const yearCount = years.length;
  const marks = futureMarks(futureEvents, todayStr);
  // A string, so the effect below only rebuilds when the days really change
  const markDays = marks.map(m => m.day).join();

  const times = sceneTimes(yearCount);
  const { length } = times;
  const scenes = times.drawn;
  const onTavern = scenes[scene]?.id === "tavern";
  const onAskScene = scenes[scene]?.id === "ask";
  // A string, so the navigation below only resets when the stops really change
  const stopsKey = times.stops.join();

  useEffect(() => {
    const el = root.current;
    const totalEl = totalRef.current;
    const paceXpEl = paceXpRef.current;
    if (!el || !totalEl || !paceXpEl) return;
    totalEl.textContent = totalXP.toLocaleString();
    paceXpEl.textContent = xp.toLocaleString();
    if (prefersReducedMotion()) return;

    const total = { value: 0 };
    const season = { value: 0 };
    const pad = { value: 0 };
    const all = (name: string) => Array.from(el.querySelectorAll(`[data-saga=${name}]`));
    const statPoints = statShape.split(" ").map(p => p.split(","));
    const moodPoints = moodShape.split(" ").map(p => p.split(","));
    // Reverting the previous run put back the attributes it first saw, which may predate the
    // loaded data, so restate the stats shape before this run records them
    all("polygon").forEach(p => p.setAttribute("points", statShape));
    all("point").forEach((p, i) => { p.setAttribute("cx", statPoints[i][0]); p.setAttribute("cy", statPoints[i][1]); });

    const { futureAt, chronAt, mapAt, askAt, drawn } = sceneTimes(yearCount);
    const froms = drawn.map(d => d.from);

    const scope = createScope({ root: el }).add(() => {
      // A timeline only applies a tween's starting values once it reaches it, so hide the later beats up front
      utils.set("[data-saga=core], [data-saga=era-core], [data-saga=reached], [data-saga=letter], [data-saga=caption], [data-saga=era-text], [data-saga=shape], [data-saga=stat], [data-saga=mood], [data-saga=stats-title], [data-saga=mood-title], [data-saga=gauge], [data-saga=tick], [data-saga=pace-tilt], [data-saga=pace-core], [data-saga=pace-text], [data-saga=chron], [data-saga=chron-title], [data-saga=chron-node], [data-saga=chron-halo], [data-saga=chron-year], [data-saga=chron-entry], [data-saga=chron-items], [data-saga=future], [data-saga=future-title], [data-saga=future-node], [data-saga=future-core], [data-saga=future-row], [data-saga=future-details], [data-saga=tavern], [data-saga=tavern-title], [data-saga=tavern-row], [data-saga=map], [data-saga=map-title], [data-saga=map-disc], [data-saga=map-warp], [data-saga=map-row], [data-saga=ask], [data-saga=ask-title], [data-saga=ask-row]", { opacity: 0 });
      utils.set("[data-saga=arc], [data-saga=level], [data-saga=grid], [data-saga=axis], [data-saga=gauge-fill], [data-saga=race-arc], [data-saga=time-arc]", { strokeDashoffset: 1 });
      paceXpEl.textContent = "0";
      totalEl.textContent = "0";

      const timeline = scriptRef.current = createTimeline({
        defaults: { ease: "out(3)" },
        autoplay: onScroll({ target: el, enter: "center top", leave: "bottom bottom", sync: 0.85 }),
        onUpdate: ({ currentTime: t }) => {
          // The dial turns backwards through the moods and the Chronicle
          dialDirection.current = (t >= MOOD_AT && t < TAVERN_AT) || (t >= chronAt && t < mapAt) ? -1 : 1;
          levelRingTurns.current = t >= ERA_AT - 6 && t < PACE_AT + 12;
          let current = 0;
          froms.forEach((from, i) => { if (t >= from) current = i; });
          setScene(current);
          setChronStep(Math.min(Math.max(0, yearCount - 1), Math.max(0, Math.floor((t - chronAt - 10) / YEAR_STEP))));
        },
      })
        // The emblem assembles while the stage rises into view
        .add("[data-saga=emblem]", { opacity: [0, 1], scale: [0.7, 1], duration: 30 }, 0)
        .add("[data-saga=core]", { opacity: [0, 1], scale: [0.5, 1], duration: 22 }, 12)
        // Pinned: the rings fill to the current standing
        .add("[data-saga=arc]", { strokeDashoffset: [1, 1 - progress], duration: 32, ease: "inOut(2)" }, APPROACH)
        .add("[data-saga=level]", { strokeDashoffset: [1, 1 - levelProgress], duration: 32, ease: "inOut(2)" }, APPROACH + 6)
        .add("[data-saga=reached]", { opacity: [0, 1], duration: 6, delay: stagger(32 / RANKS) }, APPROACH)
        .add("[data-saga=letter]", { opacity: [0, 1], translateY: [18, 0], duration: 16, delay: stagger(1.8) }, APPROACH + 4)
        .add("[data-saga=caption]", { opacity: [0, 1], translateY: [12, 0], duration: 16 }, APPROACH + 12)
        // The centre turns over from level to era
        .add("[data-saga=core]", { opacity: 0, scale: 0.55, rotate: -90, duration: 16, ease: "in(2)" }, ERA_AT - 6)
        .add("[data-saga=standing]", { opacity: 0, translateY: -20, duration: 14, ease: "in(2)" }, ERA_AT - 6)
        .add("[data-saga=rings]", { rotate: [0, 360], duration: 44, ease: "inOut(3)" }, ERA_AT - 6)
        .add("[data-saga=era-core]", { opacity: [0, 1], scale: [1.6, 1], rotate: [90, 0], duration: 20 }, ERA_AT + 6)
        // The level ring tips over to circle the era like Saturn's (the loop below turns it in its own plane)
        .add("[data-saga=saturn]", { rotateX: [0, 74], duration: 30, ease: "inOut(2)" }, ERA_AT - 6)
        .add("[data-saga=saturn-tilt]", { rotate: [0, -16], duration: 30, ease: "inOut(2)" }, ERA_AT - 6)
        .add("[data-saga=era-text]", { opacity: [0, 1], translateY: [20, 0], duration: 16, delay: stagger(4) }, ERA_AT + 8)
        // The rank ring dims and the season's XP gauge turns in inside it
        .add("[data-saga=era-core]", { opacity: 0, scale: 0.55, duration: 14, ease: "in(2)" }, PACE_AT - 6)
        .add("[data-saga=era]", { opacity: 0, translateY: -20, duration: 14, ease: "in(2)" }, PACE_AT - 6)
        .add("[data-saga=saturn-tilt]", { opacity: 0, scale: 1.2, duration: 18, ease: "in(2)" }, PACE_AT - 6)
        .add("[data-saga=rings]", { opacity: 0.3, duration: 18 }, PACE_AT - 4)
        .add("[data-saga=dial-inner], [data-saga=next]", { opacity: 0, duration: 14 }, PACE_AT - 4)
        .add("[data-saga=gauge]", { opacity: [0, 1], rotate: [-120, 0], scale: [0.9, 1], duration: 26 }, PACE_AT + 4)
        .add("[data-saga=gauge-fill]", { strokeDashoffset: [1, 1 - meterFill], duration: 22, ease: "inOut(2)" }, PACE_AT + 10)
        .add("[data-saga=tick]", { opacity: [0, 1], duration: 10, delay: stagger(3) }, PACE_AT + 22)
        .add("[data-saga=pace-core]", { opacity: [0, 1], scale: [0.5, 1], duration: 18 }, PACE_AT + 4)
        .add(season, {
          value: [0, xp],
          duration: 24,
          onRender: () => { paceXpEl.textContent = Math.round(season.value).toLocaleString(); },
        }, PACE_AT + 6)
        // The dotted circle sits this scene out
        .add("[data-saga=dial-wrap]", { opacity: [1, 0], duration: 18 }, PACE_AT)
        // Two rings appear flat, then tip over to circle the XP: today's XP and the days of the season
        .add("[data-saga=pace-tilt]", { opacity: [0, 1], scale: [0.6, 1], duration: 18 }, PACE_AT + 6)
        .add("[data-saga=pace]", { rotateX: [0, PACE_TIP], duration: 22, ease: "inOut(2)" }, PACE_AT + 14)
        .add("[data-saga=pace-tilt]", { rotate: [0, PACE_SLANT], duration: 22, ease: "inOut(2)" }, PACE_AT + 14)
        // The rings have filled by the time their labels arrive, so a label never sits beside a half-drawn ring
        .add("[data-saga=race-arc]", { strokeDashoffset: [1, 1 - raceProgress], duration: 20, ease: "inOut(2)" }, PACE_AT + 8)
        .add("[data-saga=time-arc]", { strokeDashoffset: [1, 1 - timeProgress], duration: 20, ease: "inOut(2)" }, PACE_AT + 10)
        .add("[data-saga=pace-text]", { opacity: [0, 1], translateY: [20, 0], duration: 14, delay: stagger(4) }, PACE_AT + 26)
        // The dotted circle returns, and the radar draws inside it with the stats springing from its centre
        .add("[data-saga=dial-wrap]", { opacity: [0, 1], duration: 20 }, STATS_AT - 12)
        .add("[data-saga=gauge], [data-saga=pace-tilt], [data-saga=pace-core], [data-saga=pace-title]", { opacity: 0, duration: 12, ease: "in(2)" }, STATS_AT - 14)
        .add("[data-saga=grid]", { strokeDashoffset: [1, 0], duration: 20, delay: stagger(3, { reversed: true }), ease: "inOut(2)" }, STATS_AT + 2)
        .add("[data-saga=axis]", { strokeDashoffset: [1, 0], duration: 16, delay: stagger(2) }, STATS_AT + 6)
        .add("[data-saga=shape]", { opacity: [0, 1], scale: [0, 1], rotate: [-50, 0], duration: 26, ease: "outBack(1.4)" }, STATS_AT + 14)
        .add("[data-saga=stat]", { opacity: [0, 1], duration: 12, delay: stagger(4) }, STATS_AT + 18)
        .add("[data-saga=stats-title]", { opacity: [0, 1], translateY: [24, 0], duration: 18 }, STATS_AT + 8)
        .add(total, {
          value: [0, totalXP],
          duration: 26,
          onRender: () => { totalEl.textContent = Math.round(total.value).toLocaleString(); },
        }, STATS_AT + 14)
        // The pentagon folds into the mood triangle
        .add("[data-saga=stat], [data-saga=stats-title]", { opacity: 0, duration: 12, ease: "in(2)" }, MOOD_AT - 8)
        .add("[data-saga=polygon]", { points: [statShape, moodShape], duration: 30, ease: "inOut(3)" }, MOOD_AT)
        .add("[data-saga=shape]", { rotate: [0, 360], duration: 30, ease: "inOut(3)" }, MOOD_AT)
        .add("[data-saga=mood]", { opacity: [0, 1], duration: 12, delay: stagger(5) }, MOOD_AT + 20)
        .add("[data-saga=mood-title]", { opacity: [0, 1], translateY: [24, 0], duration: 18 }, MOOD_AT + 14)
        .add("[data-saga=radar], [data-saga=mood-title]", { opacity: 0, duration: 12, ease: "in(2)" }, TAVERN_AT - 14)
        // The Tavern: its three-seat ring turns in and the suggestions line up beneath it
        .add("[data-saga=tavern]", { opacity: [0, 1], scale: [0.85, 1], rotate: [-60, 0], duration: 20 }, TAVERN_AT - 2)
        .add("[data-saga=tavern-title]", { opacity: [0, 1], translateY: [24, 0], duration: 16 }, TAVERN_AT + 2)
        .add("[data-saga=tavern-row]", { opacity: [0, 1], translateY: [16, 0], duration: 12, delay: stagger(4) }, TAVERN_AT + 8)
        .add("[data-saga=tavern], [data-saga=tavern-title], [data-saga=tavern-details]", { opacity: 0, duration: 12, ease: "in(2)" }, futureAt - 14)
        // Future Sight: a hand sweeps the two-week dial once and what lies ahead appears as it passes
        .add("[data-saga=future]", { opacity: [0, 1], scale: [0.9, 1], duration: 16 }, futureAt - 2)
        .add("[data-saga=future-title]", { opacity: [0, 1], translateY: [24, 0], duration: 16 }, futureAt + 2)
        .add("[data-saga=future-hand]", { rotate: [0, 360], duration: FUTURE_SWEEP, ease: "linear" }, futureAt + 6)
        .add("[data-saga=future-hand]", { opacity: 0, duration: 8 }, futureAt + 6 + FUTURE_SWEEP)
        .add("[data-saga=future-core]", { opacity: [0, 1], scale: [0.5, 1], duration: 18 }, futureAt + 10)
        // The list can be long, so its rows come in close together, inside a block that fades as one;
        // going backwards the block is gone even if the list is mid-scroll
        .add("[data-saga=future-details]", { opacity: [0, 1], duration: 10 }, futureAt + 20)
        .add("[data-saga=future-row]", { opacity: [0, 1], translateY: [16, 0], duration: 10, delay: stagger(1.2) }, futureAt + 22)
        // (the Chronicle, when there is one, plays between these two; see below)
        .add("[data-saga=future], [data-saga=future-title], [data-saga=future-details]", { opacity: 0, duration: 12, ease: "in(2)" }, chronAt - 14)
        // The Map: a compass turns in, its needle swings and settles, then rings rush outward and
        // the map warps in where the needle was
        .add("[data-saga=dial-wrap]", { opacity: 0, duration: 14 }, mapAt - 10)
        .add("[data-saga=map]", { opacity: [0, 1], scale: [0.8, 1], duration: 16 }, mapAt - 2)
        .add("[data-saga=map-title]", { opacity: [0, 1], translateY: [24, 0], duration: 16 }, mapAt + 2)
        .add("[data-saga=map-rose]", { rotate: [-135, 0], duration: 36 }, mapAt - 2)
        .add("[data-saga=map-needle]", { rotate: [-340, 0], duration: 44, ease: "outElastic(1, 0.45)" }, mapAt + 2)
        .add("[data-saga=map-warp]", { opacity: [0.9, 0], scale: [0.1, 1.7], duration: 22, delay: stagger(5), ease: "out(2)" }, mapAt + 42)
        .add("[data-saga=map-needle]", { opacity: 0, scale: 0.2, duration: 10, ease: "in(2)" }, mapAt + 42)
        .add("[data-saga=map-disc]", { opacity: [0, 1], scale: [0, 1], rotate: [-270, 0], duration: 28, ease: "out(4)" }, mapAt + 44)
        .add("[data-saga=map-row]", { opacity: [0, 1], translateY: [16, 0], duration: 12, delay: stagger(4) }, mapAt + 58)
        // The Taskmaster: the map folds away into the centre, the orbit comes back whole and the
        // way to the Taskmaster opens in the middle of it
        .add("[data-saga=map]", { opacity: 0, scale: 0.3, rotate: 90, duration: 18, ease: "in(2)" }, askAt - 16)
        .add("[data-saga=map-title], [data-saga=map-details]", { opacity: 0, duration: 12, ease: "in(2)" }, askAt - 14)
        .add("[data-saga=rings], [data-saga=dial-wrap]", { opacity: 1, duration: 20 }, askAt - 8)
        .add("[data-saga=rings]", { rotate: [0, 360], duration: 40, ease: "inOut(3)" }, askAt - 8)
        .add("[data-saga=ask]", { opacity: [0, 1], scale: [0.2, 1], duration: 24, ease: "outBack(1.6)" }, askAt)
        .add("[data-saga=ask-title]", { opacity: [0, 1], translateY: [24, 0], duration: 16 }, askAt + 4)
        .add("[data-saga=ask-row]", { opacity: [0, 1], translateY: [16, 0], duration: 12, delay: stagger(4) }, askAt + 14)
        // Nothing moves in the tail; this only makes the script as long as the scroll
        .add(pad, { value: 1, duration: 1 }, length - 1);

      all("grid").forEach((grid, i) => {
        timeline.add(grid, { points: [STAT_GRID[i], MOOD_GRID[i]], duration: 30, ease: "inOut(3)" }, MOOD_AT);
      });
      all("axis").forEach((axis, i) => {
        const from = polar(STAT_ANGLES[i], RADAR);
        const to = polar(MOOD_ANGLES[i], RADAR);
        timeline.add(axis, { x2: [from.x, to.x], y2: [from.y, to.y], duration: 30, ease: "inOut(3)" }, MOOD_AT);
      });
      all("point").forEach((point, i) => {
        timeline.add(point, { cx: [statPoints[i][0], moodPoints[i][0]], cy: [statPoints[i][1], moodPoints[i][1]], duration: 30, ease: "inOut(3)" }, MOOD_AT);
      });
      all("future-node").forEach(node => {
        const angle = Number((node as HTMLElement).dataset.angle);
        timeline.add(node, { opacity: [0, 1], duration: 6 }, futureAt + 6 + (angle / 360) * FUTURE_SWEEP);
      });

      // The Chronicle: the ring's sweep reaches back one year at a time, and the centre and the
      // entry below change with it
      if (yearCount > 0) {
        timeline
          .add("[data-saga=chron]", { opacity: [0, 1], scale: [0.9, 1], duration: 16 }, chronAt - 2)
          .add("[data-saga=chron-title]", { opacity: [0, 1], translateY: [24, 0], duration: 16 }, chronAt + 2)
          .add("[data-saga=chron-node]", { opacity: [0, 1], duration: 8, delay: stagger(2) }, chronAt + 4)
          .add("[data-saga=chron], [data-saga=chron-title], [data-saga=chron-details]", { opacity: 0, duration: 12, ease: "in(2)" }, mapAt - 14);
        const halos = all("chron-halo");
        const centres = all("chron-year");
        const entries = all("chron-entry");
        const fans = all("chron-items");
        for (let i = 0; i < yearCount; i++) {
          const start = chronAt + 10 + i * YEAR_STEP;
          if (i > 0) timeline.add("[data-saga=chron-sweep]", { strokeDashoffset: [1 - yearSweep(i - 1), 1 - yearSweep(i)], duration: 16, ease: "inOut(2)" }, start - 8);
          timeline
            .add(halos[i], { opacity: [0, 1], duration: 8 }, start)
            .add(centres[i], { opacity: [0, 1], translateY: [24, 0], duration: 12 }, start)
            .add(entries[i], { opacity: [0, 1], translateY: [16, 0], duration: 12 }, start + 2)
            .add(fans[i], { opacity: [0, 1], rotate: [16, 0], duration: 16 }, start + 2);
          if (i < yearCount - 1) {
            const leave = start + YEAR_STEP - 12;
            timeline
              .add(halos[i], { opacity: 0, duration: 8 }, leave)
              .add(centres[i], { opacity: 0, translateY: -24, duration: 10, ease: "in(2)" }, leave)
              .add(entries[i], { opacity: 0, translateY: -16, duration: 10, ease: "in(2)" }, leave)
              .add(fans[i], { opacity: 0, rotate: -16, duration: 10, ease: "in(2)" }, leave);
          }
        }
      }

      // Start where the scroll already is. Without this a rebuild (the XP changing, say, when a
      // relief is ticked off) would replay the whole script from the top to catch up.
      const from = el.getBoundingClientRect().top - window.innerHeight / 2;
      timeline.seek(Math.min(length, Math.max(0, (-from / (el.offsetHeight - window.innerHeight / 2)) * length)));
    });
    return () => { scope.revert(); };
  }, [progress, levelProgress, rank, xp, totalXP, statShape, moodShape, length, yearCount, markDays, era.id, meterFill, raceProgress, timeProgress, tickCount]);

  // The dial never stops: it drifts while the page is still and spins up with the scroll speed,
  // turning backwards through the moods. The two pace rings turn with it in their own planes, one
  // each way, and so does the level ring while it is tipped over for the era (in the standing it
  // settles upright, so its arc starts at twelve o'clock). Only runs while the section is on screen.
  useEffect(() => {
    const el = root.current;
    const dial = dialRef.current;
    if (!el || !dial || prefersReducedMotion()) return;
    // In document order: race and time behind the centre text, then race and time in front of it
    const spins = Array.from(el.querySelectorAll<SVGSVGElement>("[data-saga=pace-spin]"));
    const levelSpins = Array.from(el.querySelectorAll<SVGSVGElement>("[data-saga=saturn-spin]"));

    let raf = 0;
    let last = 0;
    let lastY = window.scrollY;
    let angle = 0;
    let levelAngle = 0;
    let speed = DIAL_IDLE;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (dt <= 0) return;
      const scrolled = Math.abs(window.scrollY - lastY) / dt;
      lastY = window.scrollY;
      const target = dialDirection.current * (DIAL_IDLE + Math.min(scrolled * DIAL_PER_PX, DIAL_MAX));
      speed += (target - speed) * Math.min(1, dt * 5);
      angle += speed * dt;
      dial.style.transform = `rotate(${angle.toFixed(2)}deg)`;
      spins.forEach((spin, i) => { spin.style.transform = `rotate(${(angle * (i % 2 ? -RING_TURN : RING_TURN)).toFixed(2)}deg)`; });
      if (levelRingTurns.current) levelAngle += Math.abs(speed) * RING_TURN * dt;
      else levelAngle += (Math.round(levelAngle / 360) * 360 - levelAngle) * Math.min(1, dt * 6);
      levelSpins.forEach(spin => { spin.style.transform = `rotate(${levelAngle.toFixed(2)}deg)`; });
    };
    const start = () => { if (!raf) { last = performance.now(); lastY = window.scrollY; raf = requestAnimationFrame(frame); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    let visible = false;
    const sync = () => (visible && !document.hidden ? start() : stop());
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      dial.style.transform = "";
      [...spins, ...levelSpins].forEach(spin => { spin.style.transform = ""; });
    };
  }, []);

  // --- One stop at a time ---------------------------------------------------------------------
  const scrollAnim = useRef(0);
  // The scroll script, so the roll back can put it straight at the start
  const scriptRef = useRef<{ seek: (time: number) => unknown } | null>(null);

  // Where the script is for a scroll position, and back
  const measure = useCallback(() => {
    const el = root.current!;
    const start = el.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2;
    const distance = el.offsetHeight - window.innerHeight / 2;
    return {
      timeNow: ((window.scrollY - start) / distance) * length,
      yOf: (time: number) => start + (time / length) * distance,
      // From the stage starting to rise into view until it unpins
      engaged: window.scrollY > start && window.scrollY < start + distance - window.innerHeight / 2 + 2,
    };
  }, [length]);

  // A step between neighbouring stops is slow enough to watch; a longer ride (a jump, the way
  // back to the start or the top) moves along
  const scrollToY = useCallback((y: number, ride = false) => {
    cancelAnimationFrame(scrollAnim.current);
    const from = window.scrollY;
    const far = Math.abs(y - from);
    const duration = ride ? Math.min(2400, Math.max(900, far * 0.4)) : Math.min(3400, Math.max(1900, far * 3.4));
    const began = performance.now();
    const frame = (now: number) => {
      const t = Math.min(1, (now - began) / duration);
      window.scrollTo(0, Math.round(from + (y - from) * easeInOut(t)));
      scrollAnim.current = t < 1 ? requestAnimationFrame(frame) : 0;
    };
    scrollAnim.current = requestAnimationFrame(frame);
  }, []);

  // Move to the next stop in a direction; false when there is none that way
  const step = useCallback((direction: number) => {
    if (!root.current) return false;
    const stops = stopsKey.split(",").map(Number);
    const { timeNow, yOf } = measure();
    const target = direction > 0 ? stops.find(s => s > timeNow + 1) : [...stops].reverse().find(s => s < timeNow - 1);
    if (target === undefined) return false;
    scrollToY(yOf(target));
    return true;
  }, [stopsKey, measure, scrollToY]);

  // Scroll to a scene's first stop
  function jumpTo(target: number) {
    if (!root.current) return;
    scrollToY(measure().yOf(times.drawn[target].holdsAt), true);
  }

  // From the last stop back to the first without running the whole script backwards: the stage
  // winds down into its centre, the page jumps to the start while nothing shows, and the Standing
  // unwinds out again. Wheel, swipe and autoplay hold off until it is done.
  const rollBack = useCallback(async () => {
    const el = root.current;
    if (!el || scrollAnim.current) return;
    const layers = Array.from(el.querySelectorAll<HTMLElement>("[data-saga=layer]"));
    scrollAnim.current = -1;
    const play = (frames: Keyframe[], options: KeyframeAnimationOptions) =>
      Promise.all(layers.map(layer => layer.animate(frames, { fill: "both", ...options }).finished));
    try {
      const out = await play(
        [{ opacity: 1, transform: "scale(1) rotate(0deg)" }, { opacity: 0, transform: "scale(0.12) rotate(-200deg)" }],
        { duration: 800, easing: "cubic-bezier(0.6, 0, 0.9, 0.3)" }
      );
      const first = stopsKey.split(",").map(Number)[0];
      window.scrollTo(0, Math.round(measure().yOf(first)));
      scriptRef.current?.seek(first);
      setScene(0);
      setChronStep(0);
      // Give the scroll a moment to land before anything shows again
      await new Promise(resolve => setTimeout(resolve, 180));
      const back = await play(
        [{ opacity: 0, transform: "scale(1.7) rotate(120deg)" }, { opacity: 1, transform: "scale(1) rotate(0deg)" }],
        { duration: 1100, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
      );
      [...out, ...back].forEach(animation => animation.cancel());
    } finally {
      scrollAnim.current = 0;
    }
  }, [stopsKey, measure]);

  // The legend's Next button goes round again from the last stop (scrolling itself never wraps)
  function nextOrRestart() {
    if (!step(1)) rollBack();
  }

  // How long the scene on stage may sit idle before autoplay moves on
  const idleFor = useRef(IDLE_BEFORE_AUTO);
  const lastInput = useRef(0);
  const onFuture = scenes[scene]?.id === "future";
  const eventCount = marks.length;
  useEffect(() => {
    idleFor.current = onFuture
      ? Math.min(FUTURE_IDLE.max, Math.max(FUTURE_IDLE.min, FUTURE_IDLE.base + eventCount * FUTURE_IDLE.perEvent))
      : IDLE_BEFORE_AUTO;
  }, [onFuture, eventCount]);

  // Left idle on a stop, move on to the next one; any input starts the wait again
  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const stops = stopsKey.split(",").map(Number);
    // Kept across re-runs of this effect, so late-arriving data does not restart the wait
    if (!lastInput.current) lastInput.current = performance.now();
    const touch = () => { lastInput.current = performance.now(); };
    const events = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;
    events.forEach(name => window.addEventListener(name, touch, { passive: true }));
    const timer = setInterval(() => {
      if (document.hidden) return touch();
      const idle = performance.now() - lastInput.current;
      if (scrollAnim.current) return;
      const { timeNow, yOf } = measure();
      const under = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
      // Higher up the home page: after a longer wait, come down to the Standing, and autoplay
      // carries on from there (not while a dialog is open, which sits outside <main>)
      if (timeNow < stops[0] - 1) {
        if (idle < IDLE_BEFORE_ARRIVING || !under?.closest("main")) return;
        scrollToY(yOf(stops[0]), true);
        return touch();
      }
      // Only while resting on the stops, and not while a dialog covers the stage
      if (idle < idleFor.current || timeNow > stops[stops.length - 1] + 1) return;
      if (!under || !el.contains(under)) return;
      // After the last stop it starts again from the Standing
      if (!step(1)) rollBack();
      touch();
    }, 1000);
    return () => {
      clearInterval(timer);
      events.forEach(name => window.removeEventListener(name, touch));
    };
  }, [stopsKey, measure, step, rollBack, scrollToY]);

  // Wheel, swipe and arrow keys each move one stop while the saga is on screen, and anything else
  // that scrolls it (a flick from above, the scrollbar) settles on the nearest stop
  useEffect(() => {
    const el = root.current;
    const stage = el?.firstElementChild as HTMLElement | null;
    if (!el || !stage || prefersReducedMotion()) return;
    const stops = stopsKey.split(",").map(Number);

    let lastWheel = 0;
    let passThrough = false;
    const onWheel = (e: WheelEvent) => {
      if (!(e.target instanceof Node) || !el.contains(e.target) || e.ctrlKey || !measure().engaged) return;
      const fresh = e.timeStamp - lastWheel > WHEEL_GAP;
      lastWheel = e.timeStamp;
      // The rest of a gesture, inertia included, does whatever its first event did
      if (fresh && !scrollAnim.current) passThrough = !step(Math.sign(e.deltaY));
      if (!passThrough) e.preventDefault();
    };

    let touchY: number | null = null;
    const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0].clientY; };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchY === null) return;
      const moved = touchY - e.changedTouches[0].clientY;
      touchY = null;
      if (Math.abs(moved) < SWIPE_MIN) return;
      // Past either end the stage still takes the touch, so carry the page on by hand
      if (!step(Math.sign(moved))) scrollToY(window.scrollY + Math.sign(moved) * window.innerHeight * 0.85, true);
    };

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (target && target !== document.body && (!el.contains(target) || target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      const direction = ["ArrowRight", "ArrowDown", "PageDown"].includes(e.key) ? 1 : ["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key) ? -1 : 0;
      if (!direction || !measure().engaged) return;
      // Left and right belong to the saga; up and down fall back to the page at either end
      if (step(direction) || e.key === "ArrowLeft" || e.key === "ArrowRight") e.preventDefault();
    };

    // While the stage is pinned, hold it with position: fixed rather than sticky. Mobile Safari
    // lays sticky elements out a frame behind a scroll driven from script, which shows as the
    // whole stage trembling up and down during a step; a fixed element is never moved at all.
    const pin = () => {
      const box = el.getBoundingClientRect();
      const pinned = box.top <= 0 && box.bottom >= window.innerHeight;
      ["position", "left", "right"].forEach(prop => stage.style.setProperty(prop, pinned ? (prop === "position" ? "fixed" : "0") : ""));
    };
    pin();

    let settle: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      pin();
      clearTimeout(settle);
      settle = setTimeout(() => {
        if (scrollAnim.current || touchY !== null) return;
        const { timeNow, yOf } = measure();
        if (timeNow <= stops[0] || timeNow >= stops[stops.length - 1]) return;
        const nearest = stops.reduce((a, b) => (Math.abs(b - timeNow) < Math.abs(a - timeNow) ? b : a));
        if (Math.abs(yOf(nearest) - window.scrollY) > 4) scrollToY(yOf(nearest));
      }, SETTLE_AFTER);
    };

    window.addEventListener("resize", pin);
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    stage.addEventListener("touchstart", onTouchStart, { passive: true });
    stage.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      clearTimeout(settle);
      cancelAnimationFrame(scrollAnim.current);
      scrollAnim.current = 0;
      ["position", "left", "right"].forEach(prop => stage.style.removeProperty(prop));
      window.removeEventListener("resize", pin);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
      stage.removeEventListener("touchstart", onTouchStart);
      stage.removeEventListener("touchend", onTouchEnd);
    };
  }, [stopsKey, measure, step, scrollToY]);

  return (
    <section
      ref={root}
      aria-label="Growth analytics"
      className="relative w-full motion-reduce:!h-auto"
      style={{ height: `${100 + length - APPROACH}svh` }}
    >
      <div className="sticky top-0 h-svh motion-safe:touch-none motion-reduce:static motion-reduce:h-auto flex flex-col motion-reduce:gap-8 px-4 md:px-6 pt-20 pb-32 lg:pb-16">
        {/* Three rows, the outer two equal, so the orbit's centre is the centre of the screen and
            lines up with the rank crest behind the page */}
        <div data-saga="layer" className="absolute inset-0 motion-reduce:static grid grid-cols-1 grid-rows-[1fr_auto_1fr] justify-items-center px-4 pointer-events-none">
          {/* Each scene's title sits above the orbit and its details below; every scene shares the two cells */}
          <div className="row-start-1 self-end grid grid-cols-1 text-center w-full pb-12 motion-reduce:pb-6">
            <p data-saga="standing" aria-label={rank} className={cn(TITLE, "col-start-1 row-start-1 self-end text-4xl sm:text-5xl")}>
              {rank.split("").map((letter, i) => (
                <span key={i} aria-hidden data-saga="letter" className="inline-block">{letter}</span>
              ))}
            </p>

            <div data-saga="era" className="col-start-1 row-start-1 self-end motion-reduce:hidden">
              <p data-saga="era-text" className={cn(TITLE, "text-3xl sm:text-4xl")}>Era Status</p>
            </div>

            <div data-saga="pace-title" className="col-start-1 row-start-1 self-end motion-reduce:hidden">
              <div data-saga="pace-text" className="space-y-1">
                <p className={cn(TITLE, "text-3xl sm:text-4xl")}>Season Pace</p>
                {pace && (
                  <p className={cn("text-sm font-semibold", !hasRival ? "text-tm-blue-gray" : delta > 0 ? "text-tm-yellow" : delta < 0 ? "text-tm-orange-dark" : "text-tm-blue-gray")}>
                    {!hasRival
                      ? `No XP on record for ${pace.lastMonthName}, so this season sets the bar`
                      : delta === 0
                        ? `Level with ${pace.lastMonthName}'s pace`
                        : `${Math.abs(delta).toLocaleString()} ${delta > 0 ? "ahead of" : "behind"} ${pace.lastMonthName}'s pace`}
                  </p>
                )}
              </div>
            </div>

            <div data-saga="stats-title" className="col-start-1 row-start-1 self-end flex flex-col items-center gap-1 motion-reduce:hidden">
              <p className={cn(TITLE, "text-3xl sm:text-4xl")}>Character Stats</p>
              <p className={CAPTION}>Total <span ref={totalRef} className="tabular-nums text-foreground" /> XP</p>
            </div>

            <div data-saga="mood-title" className="col-start-1 row-start-1 self-end flex flex-col items-center gap-1 motion-reduce:hidden">
              <p className={cn(TITLE, "text-3xl sm:text-4xl")}>Stress Metrics</p>
              <p className={CAPTION}>{moodData.length > 0 ? "30-day emotional signature" : "Awaiting pulse"}</p>
            </div>

            {yearCount > 0 && <ChronicleTitle todayStr={todayStr} />}
            <FutureTitle count={marks.length} />
            <TavernTitle relief={tavern.relief} />
            <MapTitle info={mapInfo} />
            <AskTitle />
          </div>

          <div data-saga="emblem" className="row-start-2 relative w-[min(62vw,40svh)] max-w-[400px] aspect-square">
            {/* The dotted circle is the radar's circumcircle */}
            {/* The wrapper is the script's (the dial fades out for the pace scene); the turning is the loop's */}
            <div data-saga="dial-wrap" className="absolute inset-0">
              <svg ref={dialRef} aria-hidden viewBox="0 0 400 400" className="absolute inset-0 w-full h-full text-tm-blue-gray/40">
                <circle cx={C} cy={C} r={RADAR} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2 14" strokeLinecap="round" />
                <circle data-saga="dial-inner" cx={C} cy={C} r="128" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="40 22" style={{ opacity: 0.5 }} />
              </svg>
            </div>

            {/* The rank path: ten ranks round the ring, filled as far as the player has climbed */}
            <svg data-saga="rings" aria-hidden viewBox="0 0 400 400" className="absolute inset-0 w-full h-full overflow-visible">
              <circle className="text-tm-blue-gray/15" cx={C} cy={C} r={R} fill="none" stroke="currentColor" strokeWidth="3" />
              <circle
                data-saga="arc"
                className="text-tm-yellow"
                cx={C} cy={C} r={R}
                fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"
                pathLength={1} strokeDasharray="1"
                transform={`rotate(-90 ${C} ${C})`}
                style={{ strokeDashoffset: 1 - progress }}
              />
              {NODES.map((node, i) => (
                <g key={node.title}>
                  <circle className="fill-background text-tm-blue-gray/40" cx={node.x} cy={node.y} r="6" stroke="currentColor" strokeWidth="2" />
                  {i <= rankIndex && (
                    <g data-saga="reached" className="text-tm-yellow">
                      {i === rankIndex && <circle cx={node.x} cy={node.y} r="15" fill="currentColor" opacity="0.2" />}
                      <circle cx={node.x} cy={node.y} r={i === rankIndex ? 8 : 6} fill="currentColor" />
                    </g>
                  )}
                </g>
              ))}
              {/* The next rank on the path, named at its node */}
              {nextRank && (
                <g data-saga="next">
                  <g
                    data-saga="reached"
                    fill="currentColor"
                    textAnchor={anchorAt(nextRank.label.x)}
                    dominantBaseline="middle"
                    className="font-mono font-semibold uppercase"
                  >
                    <text x={nextRank.label.x} y={nextRank.label.y - 9} fontSize="15" className="text-foreground">{nextRank.title}</text>
                    <text x={nextRank.label.x} y={nextRank.label.y + 9} fontSize="13" className="text-tm-blue-gray">Lv {nextRank.minLevel}</text>
                  </g>
                </g>
              )}
            </svg>

            {/* Progress through the current level, inside the rank path */}
            <TiltRing group="saturn" arc="level" r={166} progress={levelProgress} color={RACE_COLOR} />
            <div className="motion-reduce:hidden">
              <TiltRing group="pace" arc="race-arc" r={RACE_RING} progress={raceProgress} color={RACE_COLOR} track={0.2} />
              <TiltRing group="pace" arc="time-arc" r={TIME_RING} progress={timeProgress} color={TIME_COLOR} track={0.2} />
            </div>

            <div data-saga="core" className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={CAPTION}>Level</span>
              <span className="text-7xl sm:text-8xl font-display font-bold leading-none tabular-nums text-tm-purple-dark dark:text-tm-yellow">{level}</span>
              {profile && (
                <span className={cn(CAPTION, "mt-2")}>
                  <span className="text-tm-orange-dark">{profile.levelProgress}</span>/{profile.nextLevelXP} XP
                </span>
              )}
            </div>

            <div data-saga="era-core" className="absolute inset-0 flex flex-col items-center justify-center motion-reduce:hidden">
              <span className={CAPTION}>Era</span>
              <span className="text-7xl sm:text-8xl font-display font-bold leading-none text-tm-purple-dark dark:text-tm-yellow">{era.numeral}</span>
              <span className={cn(CAPTION, "mt-2")}>{era.name}</span>
            </div>

            <div data-saga="pace-core" className="absolute inset-0 flex flex-col items-center justify-center motion-reduce:hidden">
              <span className={CAPTION}>Season XP</span>
              <span ref={paceXpRef} className="text-6xl sm:text-7xl font-display font-bold leading-none tabular-nums text-tm-purple-dark dark:text-tm-yellow" />
            </div>

            <TiltRing group="saturn" arc="level" r={166} progress={levelProgress} color={RACE_COLOR} front />
            <div className="motion-reduce:hidden">
              <TiltRing group="pace" arc="race-arc" r={RACE_RING} progress={raceProgress} color={RACE_COLOR} track={0.2} front />
              <TiltRing group="pace" arc="time-arc" r={TIME_RING} progress={timeProgress} color={TIME_COLOR} track={0.2} front />
            </div>

            {yearCount > 0 && <ChronicleEmblem years={years} />}
            <FutureEmblem marks={marks} />
            <TavernEmblem relief={tavern.relief} loading={tavern.loading} onRegenerate={tavern.onRegenerate} active={onTavern} />
            <AskEmblem onAsk={onAsk} active={onAskScene} />
            {!reduced && (
              <MapEmblem profile={profile} moodData={moodData} completionScore={completionScore} onInfo={setMapInfo} active={scenes[scene]?.id === "map"} />
            )}

            {/* The season XP meter: a circle broken open at the bottom */}
            <svg data-saga="gauge" aria-hidden viewBox="0 0 400 400" className="absolute inset-0 w-full h-full overflow-visible motion-reduce:hidden">
              <path className="text-tm-blue-gray/30" d={GAUGE_PATH} fill="none" stroke="currentColor" strokeWidth="5" pathLength={1} strokeDasharray="0.014 0.006" />
              <path
                data-saga="gauge-fill"
                className={overflowing ? "text-tm-orange-dark" : "text-tm-yellow"}
                d={GAUGE_PATH}
                fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round"
                pathLength={1} strokeDasharray="1"
                style={{ strokeDashoffset: 1 - meterFill }}
              />
              {/* Past the final rank's XP the fill shimmers, like the old meter's overflow */}
              {overflowing && (
                <path
                  className="tm-gauge-shimmer text-white"
                  d={GAUGE_PATH}
                  fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round"
                  pathLength={1} strokeDasharray="0.12 2"
                  style={{ "--fill": meterFill } as React.CSSProperties}
                />
              )}
              {ticks.map(tick => {
                const angle = gaugeAngle(tick.at);
                const inner = polar(angle, GAUGE - 13);
                const outer = polar(angle, GAUGE + 13);
                const label = polar(angle, R + 28);
                return (
                  <g key={tick.label} data-saga="tick" className={tick.className}>
                    <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray={tick.dashed ? "3 5" : undefined} />
                    <text
                      x={label.x} y={label.y}
                      textAnchor={anchorAt(label.x)}
                      dominantBaseline="middle" fontSize="13" fill="currentColor"
                      className="font-mono font-semibold uppercase"
                    >
                      {tick.label}
                    </text>
                  </g>
                );
              })}
              <g data-saga="tick" fill="currentColor" textAnchor="middle" fontSize="13" className="font-mono font-semibold uppercase text-tm-blue-gray">
                <text x={GAUGE_START.x} y={GAUGE_START.y + 28}>0</text>
                <text x={GAUGE_END.x} y={GAUGE_END.y + 28}>{meter.max.toLocaleString()} XP</text>
              </g>
            </svg>

            {/* One radar for two scenes: the character stats, then the 30-day moods */}
            <div data-saga="radar" aria-hidden className="absolute inset-0 motion-reduce:hidden">
              <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full overflow-visible">
                {STAT_GRID.map((points, i) => (
                  <polygon key={i} data-saga="grid" className="text-tm-blue-gray/40" points={points} fill="none" stroke="currentColor" strokeWidth="1" pathLength={1} strokeDasharray="1" />
                ))}
                {STATS.map((s, i) => {
                  const end = polar(STAT_ANGLES[i], RADAR);
                  const at = polar(STAT_ANGLES[i], LABELS);
                  return (
                    <g key={s.key}>
                      <line data-saga="axis" className="text-tm-blue-gray/60" x1={C} y1={C} x2={end.x} y2={end.y} stroke="currentColor" strokeWidth="1" pathLength={1} strokeDasharray="1" />
                      <g data-saga="stat" fill="currentColor" textAnchor="middle" dominantBaseline="middle">
                        <text x={at.x} y={at.y - 9} fontSize="17" fontWeight="800" className={cn("uppercase tracking-widest", s.className)}>{s.label}</text>
                        <text x={at.x} y={at.y + 11} fontSize="15" fontWeight="700" className="font-mono text-tm-blue-gray">{values[i].toLocaleString()} XP</text>
                      </g>
                    </g>
                  );
                })}
                {MOODS.map((m, i) => {
                  const at = polar(i * 120, LABELS);
                  return (
                    <g key={m.mood} data-saga="mood" fill="currentColor" textAnchor="middle" dominantBaseline="middle">
                      <text x={at.x} y={at.y - 9} fontSize="17" fontWeight="800" className={cn("uppercase tracking-widest", m.className)}>{m.label}</text>
                      <text x={at.x} y={at.y + 11} fontSize="15" fontWeight="700" className="font-mono text-tm-blue-gray">{moods[i]} {moods[i] === 1 ? "day" : "days"}</text>
                    </g>
                  );
                })}
              </svg>
              <svg data-saga="shape" viewBox="0 0 400 400" className="absolute inset-0 w-full h-full overflow-visible text-tm-yellow">
                <defs>
                  <linearGradient id="sagaRadarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--tm-yellow)" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="var(--tm-orange-dark)" stopOpacity="0.6" />
                  </linearGradient>
                </defs>
                <polygon data-saga="polygon" points={statShape} fill="url(#sagaRadarGradient)" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
                {statRadii.map((r, i) => {
                  const p = polar(STAT_ANGLES[i], r);
                  return <circle key={i} data-saga="point" cx={p.x} cy={p.y} r="5" fill="currentColor" />;
                })}
              </svg>
            </div>
          </div>

          <div className="row-start-3 self-start grid grid-cols-1 text-center w-full pt-8 [@media(max-height:720px)]:pt-3 motion-reduce:pt-6">
            <div data-saga="standing" className="col-start-1 row-start-1">
              <p data-saga="caption" className={cn(CAPTION, "flex flex-col items-center gap-1")}>
                <span className={nextRank ? "text-foreground" : "text-tm-orange-dark"}>
                  {nextRank
                    ? `${nextRank.minLevel - level} ${nextRank.minLevel - level === 1 ? "level" : "levels"} to ${nextRank.title}`
                    : "Ultimate rank achieved"}
                </span>
                {topStat && <span>Top stat <span className="text-foreground">{topStat}</span></span>}
              </p>
            </div>

            <div data-saga="era" className="col-start-1 row-start-1 flex flex-col items-center gap-2 motion-reduce:hidden">
              <div data-saga="era-text" className="flex items-center gap-2">
                {ERAS.map(e => (
                  <span key={e.id} className={cn("tm-era-badge text-sm", e.id !== era.id && "opacity-30")}>{e.numeral}</span>
                ))}
              </div>
              <div data-saga="era-text">
                {standing && profile && <EraHint standing={standing} xp={profile.xp} />}
              </div>
            </div>

            {yearCount > 0 && <ChronicleDetails years={years} active={scenes[scene]?.id === "chronicle" ? chronStep : null} />}
            <FutureDetails marks={marks} active={onFuture} />
            <MapDetails info={mapInfo} />
            <AskDetails onAsk={onAsk} active={onAskScene} />
            <TavernDetails relief={tavern.relief} loading={tavern.loading} updating={tavern.updating} onToggle={tavern.onToggle} active={onTavern} />

            {/* One label for each of the two rings */}
            <div data-saga="pace-title" className="col-start-1 row-start-1 flex justify-center motion-reduce:hidden">
              {pace && goal && (
                <div className="grid grid-cols-2 gap-x-4 sm:gap-x-6 text-left">
                  <div data-saga="pace-text" className="flex items-start gap-2">
                    <span className="mt-1 w-2.5 h-2.5 shrink-0 rounded-full border-2" style={{ borderColor: RACE_COLOR }} />
                    <p className={CAPTION}>
                      {goal.label}
                      <span className="block text-sm font-sans font-semibold normal-case tracking-normal text-foreground">
                        {!today ? goal.detail ?? goal.value : today.target === 0 ? goal.value : today.left === 0 ? "Today's target met" : `${today.left.toLocaleString()} XP left today`}
                      </span>
                      {today && today.target > 0 && (
                        <span className="block normal-case tracking-normal">{today.earned.toLocaleString()} of {today.target.toLocaleString()} XP today</span>
                      )}
                    </p>
                  </div>
                  <div data-saga="pace-text" className="flex items-start gap-2">
                    <span className="mt-1 w-2.5 h-2.5 shrink-0 rounded-full border-2" style={{ borderColor: TIME_COLOR }} />
                    <p className={CAPTION}>
                      Season ends
                      <span className="block text-sm font-sans font-semibold normal-case tracking-normal text-foreground">
                        {daysLeft === 0 ? "Today" : `In ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}
                      </span>
                      <span className="block normal-case tracking-normal">Day {pace.dayOfMonth} of {pace.daysInMonth}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* With reduced motion the scenes are not drawn: the plain cards stand in for them. They are
            mounted only then, since some are costly to render (the map). */}
        {reduced && <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">{fallback}</div>}

        {/* ...and the way to the Taskmaster is a plain button */}
        {reduced && <div className="flex justify-center"><AskTaskmasterButton onAsk={onAsk} /></div>}

        {/* Where you are in the sequence: step with the arrows or tap a dot to jump */}
        <div className="absolute inset-x-0 bottom-[5.5rem] lg:bottom-4 flex flex-col items-center motion-reduce:hidden">
          <div className="flex items-center">
            <button type="button" aria-label="Previous" onClick={() => step(-1)} className="p-2 text-tm-blue-gray hover:text-tm-yellow active:scale-90 transition">
              <ChevronLeft size={18} />
            </button>
            {scenes.map((s, i) => (
              <button key={s.id} type="button" aria-label={`Go to ${s.label}`} onClick={() => jumpTo(i)} className="px-1 py-2">
                <span className={cn("block h-1.5 rounded-full transition-all duration-300", i === scene ? "w-5 bg-tm-yellow" : "w-1.5 bg-tm-blue-gray/30")} />
              </button>
            ))}
            <button type="button" aria-label="Next" onClick={nextOrRestart} className="p-2 text-tm-blue-gray hover:text-tm-yellow active:scale-90 transition">
              <ChevronRight size={18} />
            </button>
          </div>
          <span className={cn(CAPTION, "-mt-1 [@media(max-height:720px)]:hidden")}>{scenes[scene]?.label}</span>
        </div>

        {/* The quick way out, at the right edge of the screen */}
        <button
          type="button"
          aria-label="Back to top"
          title="Back to top"
          onClick={() => scrollToY(0, true)}
          className="absolute right-4 md:right-8 bottom-24 lg:bottom-6 p-2.5 rounded-full border border-tm-blue-gray/25 bg-background/60 text-tm-blue-gray hover:text-tm-yellow hover:border-tm-yellow/50 active:scale-90 transition motion-reduce:hidden"
        >
          <ArrowUp size={16} />
        </button>
      </div>
    </section>
  );
}
