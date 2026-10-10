import { CloudSun, MapPin, RotateCw, Sparkles } from "lucide-react";
import CompletionCheck from "@/components/ui/completion-check";
import StrikeText from "@/components/ui/strike-text";
import { formatReliefTemp } from "@/lib/weather";
import { cn } from "@/lib/utils";
import type { Relief, ReliefAlternative } from "@/lib/types";
import { ReliefTypeIcon } from "./icons";
import { C, CAPTION, TITLE, polar } from "./saga-kit";

// The growth saga's Tavern scene: today's relief suggestions. They come from the AI, so they can
// arrive well after the page (and again on "new suggestions"). The scroll script therefore only
// moves a fixed set of wrappers (its data-saga names) and everything that depends on the data
// changes inside them with plain CSS transitions, so a late answer never rebuilds the script.

const RING = 166;
// The ring is three arcs, one per suggestion, each lit once that suggestion is done
const SEATS = 3;
const GAP = 14;
const ARC = 360 / SEATS - GAP;
const SEAT_PATHS = Array.from({ length: SEATS }, (_, i) => {
  const from = polar(i * (360 / SEATS) + GAP / 2, RING);
  const to = polar(i * (360 / SEATS) + GAP / 2 + ARC, RING);
  return `M ${from.x} ${from.y} A ${RING} ${RING} 0 0 1 ${to.x} ${to.y}`;
});

export interface TavernProps {
  relief: Relief | null;
  // A fresh set of suggestions has been asked for
  loading: boolean;
  updating: Set<string>;
  onToggle: (index: number) => void;
  onRegenerate: () => void;
}

// The suggestions as three seats: the primary one, then the two alternatives
function seats(relief: Relief | null) {
  if (!relief) return [];
  const alternatives = Array.isArray(relief.alternatives) ? (relief.alternatives as ReliefAlternative[]) : [];
  return [
    { title: relief.title, type: relief.type, done: relief.completed },
    ...alternatives.slice(0, SEATS - 1).map((alt, i) => ({ title: alt.title, type: alt.type ?? null, done: i === 0 ? relief.alt1Completed : relief.alt2Completed })),
  ];
}

export function TavernTitle({ relief }: Pick<TavernProps, "relief">) {
  return (
    <div data-saga="tavern-title" className="col-start-1 row-start-1 self-end flex flex-col items-center gap-1 motion-reduce:hidden">
      <p className={cn(TITLE, "text-3xl sm:text-4xl")}>Tavern</p>
      <p className={cn(CAPTION, "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 min-h-4")}>
        {relief ? (
          <>
            <span className={cn("flex items-center gap-1.5", relief.isCached && "text-tm-orange-light")}><MapPin size={12} /> {relief.location}</span>
            <span className="flex items-center gap-1.5"><CloudSun size={12} /> {formatReliefTemp(relief.temp)}°C {relief.weather}</span>
          </>
        ) : "Rest and relief"}
      </p>
    </div>
  );
}

// The ring's three arcs light as the suggestions are done; the centre counts them and holds the
// "new suggestions" button. While the AI is working the ring pulses and the centre says so.
export function TavernEmblem({ relief, loading, onRegenerate, active }: Pick<TavernProps, "relief" | "loading" | "onRegenerate"> & { active: boolean }) {
  const list = seats(relief);
  const done = list.filter(s => s.done).length;
  const waiting = loading || !relief;
  const canRegenerate = !!relief && !relief.completed;

  return (
    <div data-saga="tavern" className="absolute inset-0 motion-reduce:hidden">
      <svg data-saga="tavern-seats" aria-hidden viewBox="0 0 400 400" className={cn("absolute inset-0 w-full h-full overflow-visible", waiting && "animate-pulse")}>
        {SEAT_PATHS.map((d, i) => (
          <g key={i}>
            <path className="text-tm-blue-gray/25" d={d} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            <path
              className={cn("transition-opacity duration-700", i === 0 ? "text-tm-yellow" : "text-tm-orange-light", list[i]?.done ? "opacity-100" : "opacity-0")}
              d={d} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
            />
          </g>
        ))}
        {waiting && (
          <circle className="text-tm-yellow animate-spin-slow origin-center" cx={C} cy={C} r={RING - 22} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="60 200" strokeLinecap="round" opacity="0.7" />
        )}
      </svg>

      <div data-saga="tavern-core" className="absolute inset-0 flex flex-col items-center justify-center text-center px-10">
        {waiting ? (
          <>
            <span className={CAPTION}>{loading ? "Finding new" : "Scanning for"}</span>
            <span className={cn(TITLE, "text-3xl sm:text-4xl leading-none my-1 animate-pulse")}>{loading ? "Paths" : "Relief"}</span>
            <span className={CAPTION}>The Taskmaster is thinking</span>
          </>
        ) : (
          <>
            <span className={CAPTION}>Relief taken</span>
            <span className="text-6xl sm:text-7xl font-display font-bold leading-none tabular-nums text-tm-purple-dark dark:text-tm-yellow">
              {done}<span className="text-3xl sm:text-4xl text-tm-blue-gray">/{list.length}</span>
            </span>
            {canRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                tabIndex={active ? undefined : -1}
                className={cn(
                  CAPTION,
                  "mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-tm-blue-gray/25 hover:text-tm-yellow hover:border-tm-yellow/50 active:scale-95 transition",
                  active && "pointer-events-auto"
                )}
              >
                <RotateCw size={12} /> New paths
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// The three suggestions as tappable rows. There are always three rows, placeholders until the
// suggestions arrive, and they can only be tapped while the scene is on stage.
export function TavernDetails({ relief, loading, updating, onToggle, active }: Omit<TavernProps, "onRegenerate"> & { active: boolean }) {
  const list = seats(relief);
  const reward = relief?.xpReward === 5 ? 10 : relief?.xpReward;
  const waiting = loading || !relief;

  return (
    <div data-saga="tavern-details" className="col-start-1 row-start-1 flex flex-col items-center gap-0.5 -mt-3 motion-reduce:hidden">
      {Array.from({ length: SEATS }, (_, i) => {
        const seat = list[i];
        const key = relief ? `${relief.id}-${i}` : "";
        const busy = updating.has(key);
        return (
          <div key={i} data-saga="tavern-row" className="w-full max-w-sm">
            {waiting || !seat ? (
              <div className="tm-skeleton h-8 [@media(max-height:720px)]:h-7" />
            ) : (
              <button
                type="button"
                onClick={busy ? undefined : () => onToggle(i)}
                disabled={busy}
                tabIndex={active ? undefined : -1}
                className={cn(
                  "group/seat w-full h-8 [@media(max-height:720px)]:h-7 flex items-center gap-3 px-2 rounded-xl text-left transition hover:bg-tm-blue-gray/10 active:scale-[0.98]",
                  active && "pointer-events-auto",
                  busy && "opacity-50"
                )}
              >
                <CompletionCheck
                  done={seat.done}
                  className={cn(
                    "w-6 h-6 rounded-lg border transition-colors",
                    seat.done ? "bg-tm-yellow border-tm-yellow" : "border-tm-blue-gray/40 group-hover/seat:border-tm-yellow/60"
                  )}
                  checkSize={14}
                  checkClassName="text-tm-purple-dark"
                  idle={i === 0
                    ? <Sparkles size={12} className="text-tm-yellow" />
                    : <ReliefTypeIcon type={seat.type} size={12} className="text-tm-blue-gray" />}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground/90" title={seat.title}>
                  <StrikeText done={seat.done}>{seat.title}</StrikeText>
                </span>
                <span className={cn(CAPTION, "shrink-0", i === 0 && "text-tm-yellow")}>+{reward} XP</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
