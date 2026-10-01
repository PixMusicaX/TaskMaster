import { WorldMapWidget, type MapInfo } from "@/components/map-generator";
import { cn } from "@/lib/utils";
import type { NoteRow, Profile } from "@/lib/types";
import { C, CAPTION, R, TITLE, polar } from "./saga-kit";

// The growth saga's last scene: a compass whose needle swings and settles, then the realm's map
// warps in where the needle was. The scroll script animates the pieces through their data-saga
// names; the map itself (and its full-screen preview) is the same widget the card used.

const ROSE = 166;
const POINTS = ["N", "E", "S", "W"];
// Where the map sits inside the compass, as a share of the emblem's box
const DISC_INSET = `${((C - (ROSE - 14)) / (C * 2)) * 100}%`;

export function MapTitle({ info }: { info: MapInfo | null }) {
  return (
    <div data-saga="map-title" className="col-start-1 row-start-1 self-end flex flex-col items-center gap-1 motion-reduce:hidden">
      <p className={cn(TITLE, "text-3xl sm:text-4xl")}>The Map</p>
      <p className={cn(CAPTION, "min-h-4")}>
        {info ? <><span className="text-foreground">{info.name}</span> · {info.icon} {info.realm} Realm</> : "Feel the journey"}
      </p>
    </div>
  );
}

interface MapEmblemProps {
  profile: Profile | null;
  moodData: Pick<NoteRow, "mood">[];
  completionScore: number;
  onInfo: (info: MapInfo | null) => void;
  // The scene is on stage, so the map can be tapped
  active: boolean;
}

export function MapEmblem({ active, ...map }: MapEmblemProps) {
  return (
    <div data-saga="map" className="absolute inset-0 motion-reduce:hidden">
      <svg data-saga="map-rose" aria-hidden viewBox="0 0 400 400" className="absolute inset-0 w-full h-full overflow-visible text-tm-blue-gray">
        <circle cx={C} cy={C} r={ROSE} fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4" />
        {Array.from({ length: 32 }, (_, i) => {
          const major = i % 8 === 0;
          const from = polar(i * 11.25, ROSE - (major ? 12 : i % 4 === 0 ? 8 : 4));
          const to = polar(i * 11.25, ROSE + (major ? 12 : 4));
          return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="currentColor" strokeWidth={major ? 3 : 1.5} strokeLinecap="round" opacity={major ? 0.9 : 0.5} />;
        })}
        {POINTS.map((point, i) => {
          const at = polar(i * 90, R + 22);
          return (
            <text key={point} x={at.x} y={at.y} textAnchor="middle" dominantBaseline="central" fontSize="18" fill="currentColor" className={cn("font-display font-bold", i === 0 && "text-tm-orange-dark")}>
              {point}
            </text>
          );
        })}
      </svg>

      <svg data-saga="map-needle" aria-hidden viewBox="0 0 400 400" className="absolute inset-0 w-full h-full overflow-visible">
        <polygon className="text-tm-orange-dark" points={`${C},${C - 132} ${C + 16},${C} ${C - 16},${C}`} fill="currentColor" />
        <polygon className="text-tm-blue-gray" points={`${C},${C + 132} ${C + 16},${C} ${C - 16},${C}`} fill="currentColor" opacity="0.6" />
        <circle className="fill-background text-tm-yellow" cx={C} cy={C} r="9" stroke="currentColor" strokeWidth="4" />
      </svg>

      {/* Rings that rush outward as the map arrives */}
      {[0, 1, 2].map(i => (
        <div key={i} data-saga="map-warp" aria-hidden className="absolute rounded-full border-2 border-tm-yellow" style={{ inset: DISC_INSET }} />
      ))}

      <div data-saga="map-disc" className="absolute" style={{ inset: DISC_INSET }}>
        <WorldMapWidget variant="orbit" interactive={active} {...map} />
      </div>
    </div>
  );
}

export function MapDetails({ info }: { info: MapInfo | null }) {
  return (
    <div data-saga="map-details" className="col-start-1 row-start-1 flex flex-col items-center gap-2 motion-reduce:hidden">
      <p data-saga="map-row" className={CAPTION}>
        {info ? (
          <>
            Status{" "}
            <span className={info.status === "peak" ? "text-tm-yellow" : info.status === "low" ? "text-tm-orange-dark" : "text-foreground"}>
              {info.status} / {info.score}
            </span>
            {" "}· Tap to unroll
          </>
        ) : "Charting the realm"}
      </p>
      {/* Always present, so the scroll script finds it even before the map has been charted */}
      <div data-saga="map-row" className="flex flex-wrap justify-center gap-1.5 max-w-2xl">
        {info && <span className={cn(CAPTION, "w-full max-sm:hidden")}>Adjacent areas</span>}
        {info?.stops.map((stop, i) => (
          <span key={stop.name} className={cn("px-2.5 py-1 rounded-full border border-tm-blue-gray/20 text-tiny font-mono font-semibold uppercase tracking-[0.08em] text-foreground/90", i > 2 && "max-sm:hidden", i > 1 && "[@media(max-height:720px)]:max-sm:hidden")}>
            {stop.icon} {stop.name}
          </span>
        ))}
      </div>
    </div>
  );
}
