import { useEffect, useState } from "react";
import Link from "next/link";
import { addDays, format, parseISO } from "date-fns";
import { CalendarDays, CheckSquare, Repeat, type LucideIcon } from "lucide-react";
import type { HistoryDay } from "@/app/actions/history";
import { GOOGLE } from "@/components/google-mark";
import { multiDayLabel, upcomingDays } from "@/lib/multi-day";
import { noteTextLines, type EventRow } from "@/lib/types";
import { cn, moodEmoji } from "@/lib/utils";
import { C, CAPTION, R, TITLE, anchorAt, polar } from "./saga-kit";

// The growth saga's two scenes about time: the Chronicle (today's date in years past) and Future
// Sight (the next two weeks). Each is three pieces the saga places above, inside and below its
// orbit; the saga's scroll script animates them through their data-saga names.

const RING = 166;

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

// ---------------------------------------------------------------------------------------------
// Chronicle
// ---------------------------------------------------------------------------------------------

export const MAX_YEARS = 4;
// Each year back sits one step further anticlockwise round the ring
const YEAR_TURN = 45;
// What was done that day fans out down the right of the ring (the years take the upper left)
const MAX_ITEMS = 8;
const ITEMS_FROM = 22;
const ITEMS_TURN = 19;

const ITEM_KINDS: Record<"task" | "habit" | "event", { icon: LucideIcon; className: string }> = {
  task: { icon: CheckSquare, className: "text-tm-orange-dark" },
  habit: { icon: Repeat, className: "text-tm-red" },
  event: { icon: CalendarDays, className: "text-tm-yellow" },
};

export interface ChronicleYear {
  date: string;
  year: number;
  yearsAgo: number;
  mood: string | null;
  text: string;
  summary: string;
  items: { kind: keyof typeof ITEM_KINDS; label: string }[];
  href: string;
}

export function chronicleYears(days: HistoryDay[], todayStr: string): ChronicleYear[] {
  const thisYear = Number(todayStr.slice(0, 4));
  return days.slice(0, MAX_YEARS).map(day => {
    const date = parseISO(day.date);
    const note = day.notes[0];
    return {
      date: day.date,
      year: date.getFullYear(),
      yearsAgo: thisYear - date.getFullYear(),
      mood: note ? note.mood : null,
      text: note ? noteTextLines(note.content).join(" · ") : "",
      summary: [
        day.tasks.length > 0 && `${plural(day.tasks.length, "task")} done`,
        day.habits.length > 0 && plural(day.habits.length, "habit"),
        ...day.events.slice(0, 2).map(e => e.title),
      ].filter(Boolean).join(" · "),
      items: [
        ...day.events.map(e => ({ kind: "event" as const, label: e.title })),
        ...day.tasks.map(t => ({ kind: "task" as const, label: t.title })),
        ...day.habits.map(h => ({ kind: "habit" as const, label: h.habitName ?? "Habit" })),
      ],
      href: `/history?q=${encodeURIComponent(format(date, "MMMM d yyyy"))}`,
    };
  });
}

// How far round the ring (0 to 1) the sweep has to run to reach a year's node
export const yearSweep = (index: number) => (index * YEAR_TURN) / 360;

// Inside the ring, the growth rings of a tree cut across: never quite round, each drawn by its
// radius and a seed that sets its wobble. One ring belongs to each year, further in the further
// back, and the rest fill in between.
const treeRing = (r: number, seed: number) => Array.from({ length: 60 }, (_, i) => {
  const angle = i * 6;
  const turn = (angle * Math.PI) / 180;
  const p = polar(angle, r + 2.6 * Math.sin(3 * turn + seed) + 1.4 * Math.sin(7 * turn + seed * 2));
  return `${p.x},${p.y}`;
}).join(" ");
const YEAR_RINGS = Array.from({ length: MAX_YEARS }, (_, i) => treeRing(136 - i * 22, i * 1.7));
const FILLER_RINGS = [147, 125, 103, 81, 59, 44, 30].map((r, i) => treeRing(r, i * 2.3 + 0.8));

export function ChronicleTitle({ todayStr }: { todayStr: string }) {
  return (
    <div data-saga="chron-title" className="col-start-1 row-start-1 self-end flex flex-col items-center gap-1 motion-reduce:hidden">
      <p className={cn(TITLE, "text-3xl sm:text-4xl")}>Chronicle</p>
      <p className={CAPTION}>On {format(parseISO(todayStr), "MMMM do")} in years past</p>
    </div>
  );
}

// A ring that runs backwards: the years sit anticlockwise from twelve o'clock, a sweep reaches
// back to the one in focus, its growth ring lights up inside, and the centre shows that year. On
// wide screens that year's events, tasks and habits fan out round the right of the ring.
export function ChronicleEmblem({ years }: { years: ChronicleYear[] }) {
  return (
    <div data-saga="chron" aria-hidden className="absolute inset-0 motion-reduce:hidden">
      <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full overflow-visible text-tm-orange-light">
        <g className="text-tm-blue-gray/25" fill="none" stroke="currentColor" strokeWidth="1">
          {FILLER_RINGS.map(points => <polygon key={points} points={points} />)}
          {YEAR_RINGS.map(points => <polygon key={points} points={points} strokeWidth="2" />)}
        </g>
        <circle className="text-tm-blue-gray/25" cx={C} cy={C} r={RING} fill="none" stroke="currentColor" strokeWidth="2" />
        {/* Mirrored so it draws anticlockwise from the top */}
        <circle
          data-saga="chron-sweep"
          cx={C} cy={C} r={RING}
          fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"
          pathLength={1} strokeDasharray="1"
          transform={`translate(${C * 2} 0) scale(-1 1) rotate(-90 ${C} ${C})`}
          style={{ strokeDashoffset: 1 }}
        />
        {years.map((y, i) => {
          const node = polar(-i * YEAR_TURN, RING);
          const label = polar(-i * YEAR_TURN, R + 26);
          return (
            <g key={y.date}>
              <g data-saga="chron-halo">
                <polygon points={YEAR_RINGS[i]} fill="none" stroke="currentColor" strokeWidth="3" />
                <circle cx={node.x} cy={node.y} r="17" fill="currentColor" opacity="0.25" />
              </g>
              <g data-saga="chron-node">
                <circle cx={node.x} cy={node.y} r="7" fill="currentColor" />
                <text
                  x={label.x} y={label.y}
                  textAnchor={anchorAt(label.x)} dominantBaseline="middle"
                  fontSize="14" fill="currentColor"
                  className="font-mono font-semibold text-tm-blue-gray"
                >
                  {y.year}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {years.map(y => (
        <div key={y.date} data-saga="chron-year" className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={CAPTION}>{y.yearsAgo === 1 ? "1 yr ago" : `${y.yearsAgo} yrs ago`}</span>
          <span className="text-6xl sm:text-7xl font-display font-bold leading-none tabular-nums text-tm-purple-dark dark:text-tm-yellow">{y.year}</span>
          {y.mood && <span className="text-2xl mt-1">{moodEmoji(y.mood)}</span>}
        </div>
      ))}

      {/* One fan per year; the script swings the focused year's into place */}
      {years.map(y => (
        <div key={y.date} data-saga="chron-items" className="absolute inset-0 hidden lg:block">
          {y.items.slice(0, MAX_ITEMS).map((item, i) => {
            const more = i === MAX_ITEMS - 1 && y.items.length > MAX_ITEMS;
            const at = polar(ITEMS_FROM + i * ITEMS_TURN, R + 34);
            const { icon: Icon, className } = ITEM_KINDS[item.kind];
            return (
              <div
                key={i}
                className="absolute -translate-y-1/2 flex items-center gap-2 max-w-[240px] text-sm font-medium text-foreground/90 whitespace-nowrap"
                style={{ left: `${at.x / 4}%`, top: `${at.y / 4}%` }}
              >
                {more ? (
                  <span className={CAPTION}>+{y.items.length - MAX_ITEMS + 1} more</span>
                ) : (
                  <>
                    <Icon size={15} className={cn("shrink-0", className)} />
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// What was written that year; only the year in focus can be opened. The one-line tally of
// tasks, habits and events is for narrow screens, where there is no room for the fan.
export function ChronicleDetails({ years, active }: { years: ChronicleYear[]; active: number | null }) {
  return (
    <div data-saga="chron-details" className="col-start-1 row-start-1 grid justify-items-center motion-reduce:hidden">
      {years.map((y, i) => (
        <Link
          key={y.date}
          href={y.href}
          data-saga="chron-entry"
          tabIndex={i === active ? undefined : -1}
          className={cn("col-start-1 row-start-1 w-full max-w-sm space-y-1", i === active && "pointer-events-auto")}
        >
          <p className="text-sm text-foreground/90 leading-snug line-clamp-2">
            {y.text || <span className="italic text-tm-blue-gray">No note written</span>}
          </p>
          {y.summary && <p className={cn(CAPTION, "truncate lg:hidden")}>{y.summary}</p>}
        </Link>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Future Sight
// ---------------------------------------------------------------------------------------------

// The ring is the next two weeks, tomorrow at twelve o'clock
export const FUTURE_DAYS = 14;

// One colour per kind of event, shared by the dial's nodes and the list's dots
function kindOf(e: EventRow) {
  // Not in TaskMaster yet, so it keeps Google's colours whatever the theme
  if (e.gcalImported) return { label: "Google Event", colors: [GOOGLE.blue, GOOGLE.red, GOOGLE.yellow, GOOGLE.green] };
  if (e.type === "special_day") return { label: "Special Day", colors: ["var(--tm-orange-dark)"] };
  const tier = e.tier?.toLowerCase();
  const color = tier === "epic" ? "var(--tm-red)" : tier === "main" ? "var(--tm-yellow)" : "var(--tm-orange-light)";
  return { label: `${e.tier ?? "Side"} Quest`, colors: [color] };
}

export interface FutureMark {
  id: string;
  title: string;
  date: Date;
  // Takes the date's place in the list for a multi-day event
  when: string | null;
  // The first and last day it covers on the dial. A multi-day event already under way starts at tomorrow.
  day: number;
  lastDay: number;
  kind: string;
  color: string;
  colors: string[];
}

export function futureMarks(events: EventRow[], todayStr: string): FutureMark[] {
  const today = parseISO(todayStr);
  return events.flatMap(e => {
    const days = upcomingDays(e, today, FUTURE_DAYS);
    if (days.length === 0) return [];
    const date = addDays(today, days[0]);
    const { label, colors } = kindOf(e);
    return [{ id: e.id, title: e.title, date, when: multiDayLabel(e, date), day: days[0], lastDay: days[days.length - 1], kind: label, color: colors[0], colors }];
  });
}

const dayAngle = (day: number) => ((day - 1) / FUTURE_DAYS) * 360;

// One node per day on the dial, with the colour of each kind of event that falls on it
export function futureNodes(marks: FutureMark[]) {
  const days = new Map<number, { day: number; count: number; colors: string[] }>();
  marks.forEach(m => {
    for (let day = m.day; day <= m.lastDay; day++) {
      const node = days.get(day) ?? { day, count: 0, colors: [] };
      node.count++;
      m.colors.forEach(color => { if (!node.colors.includes(color)) node.colors.push(color); });
      days.set(day, node);
    }
  });
  return Array.from(days.values()).map(n => ({ ...n, angle: dayAngle(n.day) }));
}

// The stretches of ring that multi-day events cover. Each lists the colours of every event on it,
// so where two overlap the line cycles between them instead of one painting over the other.
export function futureSegments(marks: FutureMark[]) {
  const segments: { from: number; to: number; colors: string[] }[] = [];
  for (let day = 1; day < FUTURE_DAYS; day++) {
    const colors = Array.from(new Set(marks.filter(m => m.day <= day && m.lastDay > day).flatMap(m => m.colors)));
    if (colors.length === 0) continue;
    const previous = segments[segments.length - 1];
    if (previous?.to === day && previous.colors.join() === colors.join()) previous.to = day + 1;
    else segments.push({ from: day, to: day + 1, colors });
  }
  return segments;
}

// Several colours cycle through .tm-node-shimmer, which reads them from these variables
function shimmerProps(colors: string[]) {
  return {
    className: colors.length > 1 ? "tm-node-shimmer" : undefined,
    "data-colors": Math.min(4, colors.length),
    style: {
      color: colors[0],
      ...Object.fromEntries(colors.slice(0, 4).map((color, i) => [`--c${i + 1}`, color])),
    } as React.CSSProperties,
  };
}

// The line joining a multi-day event's days round the ring: a soft glow with a highlight running
// along it (see .tm-gauge-shimmer). No blur: anything filtered would be repainted on every frame.
function FutureArc({ from: fromDay, to: toDay, colors }: { from: number; to: number; colors: string[] }) {
  const fromAngle = dayAngle(fromDay);
  const toAngle = dayAngle(toDay);
  const from = polar(fromAngle, RING);
  const to = polar(toAngle, RING);
  const d = `M ${from.x} ${from.y} A ${RING} ${RING} 0 ${toAngle - fromAngle > 180 ? 1 : 0} 1 ${to.x} ${to.y}`;
  return (
    <g data-saga="future-arc" data-angle={fromAngle} data-sweep={toAngle - fromAngle} {...shimmerProps(colors)}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" opacity="0.2" />
      <path d={d} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path className="tm-gauge-shimmer" d={d} pathLength={1} fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeDasharray="0.12 1" style={{ "--fill": 1 } as React.CSSProperties} />
    </g>
  );
}

export function FutureTitle({ count }: { count: number }) {
  return (
    <div data-saga="future-title" className="col-start-1 row-start-1 self-end flex flex-col items-center gap-1 motion-reduce:hidden">
      <p className={cn(TITLE, "text-3xl sm:text-4xl")}>Precognition</p>
      <p className={CAPTION}>The next {FUTURE_DAYS} days{count > 0 && <> · <span className="text-foreground">{plural(count, "event")}</span></>}</p>
    </div>
  );
}

// Inside the two-week ring, a scrying lens: the fine fibres of an iris round the centre, with
// ripples going out through it (see .tm-lens-ripple) while the scene is on stage
const IRIS_INNER = 92;
const IRIS_FIBRES = Array.from({ length: 72 }, (_, i) => {
  const from = polar(i * 5, IRIS_INNER);
  const to = polar(i * 5 + 3, IRIS_INNER + (i % 2 ? 26 : 42));
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}).join(" ");

// The beam that sweeps the ring: a soft wedge trailing behind its leading edge
const BEAM = [46, 28, 12].map(trail => {
  const from = polar(-trail, RING);
  const to = polar(0, RING);
  return `M ${C} ${C} L ${from.x} ${from.y} A ${RING} ${RING} 0 0 1 ${to.x} ${to.y} Z`;
});

// A two-week dial: a beam sweeps round it once and what lies ahead appears on its day. A day
// holding more than one kind of event shimmers between their colours (see .tm-node-shimmer).
export function FutureEmblem({ marks, active }: { marks: FutureMark[]; active: boolean }) {
  const next = marks.length > 0 ? marks.reduce((a, b) => (b.day < a.day ? b : a)) : null;
  const edge = polar(0, RING);

  return (
    <div data-saga="future" aria-hidden className="absolute inset-0 motion-reduce:hidden">
      <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full overflow-visible">
        <path className="text-tm-blue-gray/30" d={IRIS_FIBRES} fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <circle className="text-tm-blue-gray/30" cx={C} cy={C} r={IRIS_INNER} fill="none" stroke="currentColor" strokeWidth="1.5" />
        {[0, 2, 4].map(delay => (
          <circle
            key={delay}
            className={cn("tm-lens-ripple text-tm-yellow", !active && "[animation-play-state:paused]")}
            cx={C} cy={C} r={148}
            fill="none" stroke="currentColor" strokeWidth="1.5"
            style={{ animationDelay: `${-delay}s` }}
          />
        ))}
        <circle className="text-tm-blue-gray/25" cx={C} cy={C} r={RING} fill="none" stroke="currentColor" strokeWidth="2" />
        {Array.from({ length: FUTURE_DAYS }, (_, i) => {
          const from = polar((i / FUTURE_DAYS) * 360, RING - 7);
          const to = polar((i / FUTURE_DAYS) * 360, RING + 7);
          return <line key={i} className="text-tm-blue-gray/50" x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />;
        })}
        {futureSegments(marks).map(segment => <FutureArc key={segment.from} {...segment} />)}
        {futureNodes(marks).map(node => {
          const at = polar(node.angle, RING);
          const size = Math.min(12, 7 + node.count);
          return (
            <g
              key={node.day}
              data-saga="future-node"
              data-angle={node.angle}
              {...shimmerProps(node.colors)}
            >
              <circle cx={at.x} cy={at.y} r={size + 7} fill="currentColor" opacity="0.2" />
              <circle cx={at.x} cy={at.y} r={size} fill="currentColor" />
            </g>
          );
        })}
      </svg>

      <svg data-saga="future-hand" viewBox="0 0 400 400" className="absolute inset-0 w-full h-full overflow-visible text-tm-yellow">
        {BEAM.map(d => <path key={d} d={d} fill="currentColor" opacity="0.1" />)}
        <circle cx={edge.x} cy={edge.y} r="4" fill="currentColor" />
      </svg>

      <div data-saga="future-core" className="absolute inset-0 flex flex-col items-center justify-center">
        {next ? (
          <>
            <span className={CAPTION}>{next.day === 1 ? "Tomorrow" : `In ${next.day} days`}</span>
            <span className="text-6xl sm:text-7xl font-display font-bold leading-none tabular-nums text-tm-purple-dark dark:text-tm-yellow">{format(next.date, "dd")}</span>
            <span className={cn(CAPTION, "mt-2")}>{format(next.date, "MMM · EEE")}</span>
          </>
        ) : (
          <span className={CAPTION}>Unwritten</span>
        )}
      </div>
    </div>
  );
}

// Row height of the list in px, how many rows show (one fewer on short phones, set in CSS below),
// and how long each step rests
const ROW = 28;
const VISIBLE = 3;
const TICK = 2600;

// Every event in the two weeks as a list that scrolls itself, three rows at a time, round and
// round. It only moves while the scene is on stage, and stays put when everything already fits.
export function FutureDetails({ marks, active }: { marks: FutureMark[]; active: boolean }) {
  const [index, setIndex] = useState(0);
  // Set while the list jumps from the repeated rows at the end back to the start
  const [snapping, setSnapping] = useState(false);
  const scrolls = marks.length > VISIBLE;

  useEffect(() => {
    if (!active || !scrolls) return;
    const timer = setInterval(() => {
      setSnapping(false);
      setIndex(i => i + 1);
    }, TICK);
    return () => clearInterval(timer);
  }, [active, scrolls]);

  // The first rows are repeated after the last so the loop has no seam
  const rows = scrolls ? [...marks, ...marks.slice(0, VISIBLE)] : marks;

  return (
    <div data-saga="future-details" className="col-start-1 row-start-1 flex flex-col items-center motion-reduce:hidden">
      {marks.length === 0 && <p data-saga="future-row" className="text-sm italic text-tm-blue-gray">The future is yet unwritten...</p>}
      <div className="w-full max-w-sm overflow-hidden [@media(max-height:720px)]:!h-14" style={{ height: Math.min(VISIBLE, marks.length) * ROW }}>
        <div
          className={snapping ? undefined : "transition-transform duration-700 ease-in-out"}
          style={{ transform: `translateY(${-(scrolls ? index : 0) * ROW}px)` }}
          onTransitionEnd={() => {
            if (index >= marks.length) {
              setSnapping(true);
              setIndex(0);
            }
          }}
        >
          {rows.map((m, i) => (
            <div key={`${m.id}-${i}`} data-saga="future-row" className="flex items-center gap-3 text-left" style={{ height: ROW }}>
              <span className="w-2 h-2 shrink-0 rounded-full" style={{ background: m.color }} />
              <span className={cn(CAPTION, "shrink-0 text-foreground")}>{m.when ?? format(m.date, "MMM dd")}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground/90" title={m.kind}>{m.title}</span>
              <span className={cn(CAPTION, "shrink-0")}>{m.day === 1 ? "Tomorrow" : format(m.date, "EEE")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
