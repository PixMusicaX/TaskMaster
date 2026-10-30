import { useEffect, useState } from "react";
import { differenceInMinutes, endOfDay, format, getISOWeek } from "date-fns";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";
import { C, CAPTION, TITLE } from "./saga-kit";
import { RING, SEAT_PATHS } from "./saga-tavern-scene";

// The growth saga's Clock scene: a watch telling the real time. A dark dial carries an hour ring,
// four meters (the seconds, the date, the day and the month) of different sizes, a train of gears
// wandering between them and three orbits (two tilted ones round the hub for the minutes and the
// hours, and a dotted one round the month meter for the seconds), with the two big hands over all
// of it from the centre. The dial stays dark in both themes, so everything on it
// reads the same on a light page as on a dark one. The case is the Tavern's three-part ring, so
// that ring carries straight through into the next scene. The script moves the case, the parts and
// the hands (data-saga clock, clock-case, clock-part, clock-hands); everything else is set from the
// time once a second, and nothing moves in between.

const CENTRE = { x: C, y: C };
export const DIAL = RING - 7;
// The meters are deliberately uneven, in size and in place
const SECONDS = { x: 262, y: 118, r: 34 };
const DATE = { x: 126, y: 148, r: 42 };
const MONTH = { x: 134, y: 262, r: 38 };
const DAY = { x: 268, y: 258, r: 48 };
// How much of a meter's radius its scale takes up
const BAND = 0.38;
// The orbits, in the dial's box: their radii, how far they tilt, and how far off the hub they sit.
// The upper half of each is the far side, which passes behind the meters.
const ORBITS = [
  { rx: 120, ry: 50, tilt: -30, dx: 0, dy: 0 },
  { rx: 84, ry: 36, tilt: 52, dx: 8, dy: -6 },
];
// The dotted orbit's bead goes round once a minute, for the seconds
const SECONDS_ORBIT = MONTH.r + 7;
const TENS = ["60", "10", "20", "30", "40", "50"];
const WEEK = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MONTHS = ["JAN", "MAR", "MAY", "JUL", "SEP", "NOV"];
const DATES = ["1", "6", "11", "16", "21", "26"];
const HOURS = ["12", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];

// A point round a centre, by clock angle
const round = (n: number) => Number(n.toFixed(1));
const around = (centre: { x: number; y: number }, degrees: number, r: number) => {
  const angle = (degrees * Math.PI) / 180;
  return { x: round(centre.x + r * Math.sin(angle)), y: round(centre.y - r * Math.cos(angle)) };
};

// The train: the hub wheel drives two short chains of wheels out to one side, leaving the rest of
// the dial open for the orbits. Each wheel turns the other way from the one it meshes with.
const TRAIN = [
  { x: C, y: C, r: 30, teeth: 24 },
  { x: 247, y: 190, r: 16, teeth: 12, reverse: true },
  { x: 286, y: 180, r: 24, teeth: 18 },
  { x: 192, y: 247, r: 18, teeth: 14, reverse: true },
  { x: 194, y: 287, r: 22, teeth: 18 },
];
const SCREWS = [{ x: 150, y: 78 }, { x: 238, y: 78 }, { x: 326, y: 232 }, { x: 90, y: 262 }, { x: 250, y: 322 }, { x: 70, y: 200 }];

// The dial's finish: fine lines fanning out from the centre
const SUNBURST = Array.from({ length: 90 }, (_, i) => {
  const from = around(CENTRE, i * 4, 40);
  const to = around(CENTRE, i * 4, DIAL - 22);
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}).join(" ");

function gear(teeth: number, outer: number, inner: number) {
  const step = 360 / teeth;
  return Array.from({ length: teeth }, (_, i) => [
    [i * step, inner], [(i + 0.2) * step, outer], [(i + 0.5) * step, outer], [(i + 0.7) * step, inner],
  ]).flat().map(([angle, r]) => {
    const p = around({ x: 0, y: 0 }, angle, r);
    return `${p.x},${p.y}`;
  }).join(" ");
}

// Every wheel moves on by one tooth a second, so meshing wheels stay meshed whatever their size,
// and the transition's overshoot gives each step a mechanical snap
function Gear({ x, y, teeth, r, reverse, tick }: { x: number; y: number; teeth: number; r: number; reverse?: boolean; tick: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g style={{ transform: `rotate(${((reverse ? -1 : 1) * tick * 360) / teeth}deg)`, transition: "transform 0.22s cubic-bezier(0.3, 1.8, 0.5, 1)" }}>
        <polygon points={gear(teeth, r, r * 0.82)} fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <circle r={r * 0.54} fill="none" stroke="currentColor" strokeWidth="1.4" />
        {[0, 60, 120].map(angle => {
          const a = around({ x: 0, y: 0 }, angle, r * 0.68);
          const b = around({ x: 0, y: 0 }, angle + 180, r * 0.68);
          return <line key={angle} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="currentColor" strokeWidth="1.6" />;
        })}
      </g>
      <circle className="text-tm-red" r={Math.max(2.5, r * 0.14)} fill="currentColor" />
      <circle cx={-0.8} cy={-0.8} r="0.8" fill="white" />
    </g>
  );
}

// A meter: a bright scale round the outside with its labels running along it `step` degrees apart,
// and one pointer over the window in the middle. Pass `tick` for a wheel of the movement to show
// through the window.
function Meter({ dial, labels, step, reading, tick }: { dial: { x: number; y: number; r: number }; labels: string[]; step: number; reading: number | null; tick?: number }) {
  const band = dial.r * BAND;
  const pointer = reading === null ? null : around(dial, reading * 360, dial.r - band - 3);
  return (
    <g data-saga="clock-part" className="[transform-box:fill-box] origin-center">
      <circle className="text-black" cx={dial.x} cy={dial.y} r={dial.r - band} fill="currentColor" />
      {tick !== undefined && (
        <g className="text-white/70">
          <Gear x={dial.x} y={dial.y} teeth={14} r={(dial.r - band) * 0.68} reverse tick={tick} />
        </g>
      )}
      <circle className="text-white" cx={dial.x} cy={dial.y} r={dial.r - band / 2} fill="none" stroke="currentColor" strokeWidth={band} />
      {labels.map((label, i) => {
        const angle = i * step;
        const at = around(dial, angle, dial.r - band / 2);
        const upright = angle > 90 && angle < 270 ? angle + 180 : angle;
        return (
          <text key={label} x={at.x} y={at.y} transform={`rotate(${round(upright)} ${at.x} ${at.y})`} textAnchor="middle" dominantBaseline="central" fontSize={round(band * 0.56)} fontWeight="800" className="font-mono fill-black">
            {label}
          </text>
        );
      })}
      {pointer && (
        <g className="text-tm-orange-light">
          <line x1={dial.x} y1={dial.y} x2={pointer.x} y2={pointer.y} stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <circle cx={dial.x} cy={dial.y} r="4.5" fill="currentColor" />
        </g>
      )}
    </g>
  );
}

// One side of the orbits, far or near, with the beads that are on that side just now. `turns` are
// how far round each bead is, from the top of its orbit. The far side is drawn under the meters
// and the near side over them, so the orbits pass round them; a bead changes sides as it does.
function Orbits({ side, turns }: { side: "far" | "near"; turns: number[] | null }) {
  const far = side === "far";
  return (
    <g data-saga="clock-part" className="text-tm-on-ink" style={{ transformOrigin: `${C}px ${C}px` }}>
      {ORBITS.map((orbit, i) => {
        const angle = turns ? turns[i] * 2 * Math.PI : 0;
        const bead = { x: round(orbit.rx * Math.sin(angle)), y: round(-orbit.ry * Math.cos(angle)) };
        return (
          <g key={orbit.rx} transform={`translate(${C + orbit.dx} ${C + orbit.dy}) rotate(${orbit.tilt})`}>
            <path
              d={far ? `M ${-orbit.rx} 0 A ${orbit.rx} ${orbit.ry} 0 0 1 ${orbit.rx} 0` : `M ${orbit.rx} 0 A ${orbit.rx} ${orbit.ry} 0 0 1 ${-orbit.rx} 0`}
              fill="none" stroke="currentColor" strokeWidth={far ? 1.6 : 2.4} strokeOpacity={far ? 0.85 : 1}
            />
            {turns && bead.y < 0 === far && (
              <>
                <circle cx={bead.x} cy={bead.y} r={far ? 4 : 5.5} fill="currentColor" stroke="black" strokeWidth="1" />
                <circle cx={bead.x - 1} cy={bead.y - 1} r={far ? 1 : 1.5} fill="white" />
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}

// A big hand, drawn pointing at twelve: a slim lance on a short tail, with a bright tip. White with
// a black edge, it shows on the dark dial and on the bright meters alike.
const TAIL = 20;
const SHOULDER = 24;
const WIDTH = 9;
const TIP_FROM = 0.72;
const lance = (length: number) => {
  const half = (WIDTH * length * (1 - TIP_FROM)) / (length - SHOULDER);
  const tipAt = C - length * TIP_FROM;
  return {
    body: `${C - 3},${C + TAIL} ${C - WIDTH},${C - SHOULDER} ${C},${C - length} ${C + WIDTH},${C - SHOULDER} ${C + 3},${C + TAIL}`,
    tip: `${round(C - half)},${round(tipAt)} ${C},${C - length} ${round(C + half)},${round(tipAt)}`,
  };
};
const HOUR_HAND = lance(88);
const MINUTE_HAND = lance(136);

function Hand({ shape, angle }: { shape: { body: string; tip: string }; angle: number }) {
  const turn = { transform: `rotate(${angle}deg)`, transformOrigin: `${C}px ${C}px` };
  return (
    <>
      {/* A flat shadow, always falling the same way however the hand is turned */}
      <g transform="translate(3 4)">
        <polygon style={turn} points={shape.body} fill="black" opacity="0.4" />
      </g>
      <g style={turn}>
        <polygon className="fill-white stroke-black" points={shape.body} strokeWidth="2" strokeLinejoin="round" />
        <polygon className="fill-tm-orange-light" points={shape.tip} />
      </g>
    </>
  );
}

// The time, kept on the turn of each second
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(new Date());
      timer = setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    timer = setTimeout(tick, 1000 - (Date.now() % 1000));
    return () => clearTimeout(timer);
  }, []);
  return now;
}

// The time left until midnight, in words
export function leftToday(now: Date) {
  const minutes = differenceInMinutes(endOfDay(now), now);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m left today` : `${minutes}m left today`;
}

export function ClockTitle() {
  // The server's clock is not the reader's, so the date is only written in the browser
  const mounted = useMounted();
  return (
    <div data-saga="clock-title" className="col-start-1 row-start-1 self-end flex flex-col items-center gap-1 motion-reduce:hidden">
      <p className={cn(TITLE, "text-3xl sm:text-4xl")}>Time</p>
      <p className={cn(CAPTION, "min-h-4")}>{mounted && format(new Date(), "EEEE · MMMM d")}</p>
    </div>
  );
}

export function ClockEmblem() {
  const mounted = useMounted();
  const now = useNow();
  // Seconds since this mounted: the gears only ever step forward, so they never wind back at midnight
  const [startedAt] = useState(() => now.getTime());
  const tick = mounted ? Math.round((now.getTime() - startedAt) / 1000) : 0;
  const seconds = now.getSeconds();
  const minutes = now.getMinutes() + seconds / 60;
  const hours = now.getHours() % 12 + minutes / 60;
  const secondsBead = around(MONTH, seconds * 6, SECONDS_ORBIT);
  const turns = mounted ? [minutes / 60, hours / 12] : null;

  return (
    <div data-saga="clock" aria-hidden className="absolute inset-0 motion-reduce:hidden">
      <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full overflow-visible">
        {/* The case, the dial, and the hour ring with its minute track */}
        <g data-saga="clock-case">
          {SEAT_PATHS.map(d => <path key={d} className="text-tm-blue-gray/40" d={d} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />)}
          <circle className="text-tm-purple-dark dark:text-black" cx={C} cy={C} r={DIAL} fill="currentColor" stroke="white" strokeOpacity="0.35" strokeWidth="1.5" />
          <path className="text-white/10" d={SUNBURST} fill="none" stroke="currentColor" strokeWidth="1" />
          <circle className="text-white/25" cx={C} cy={C} r={DIAL - 22} fill="none" stroke="currentColor" strokeWidth="1" />
          {Array.from({ length: 60 }, (_, i) => {
            const from = around(CENTRE, i * 6, DIAL - 1);
            const to = around(CENTRE, i * 6, DIAL - (i % 5 ? 5 : 7));
            return <line key={i} className={i % 5 ? "text-white/60" : "text-white"} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="currentColor" strokeWidth={i % 5 ? 1 : 2.5} />;
          })}
          {HOURS.map((hour, i) => {
            const at = around(CENTRE, i * 30, DIAL - 15);
            return <text key={hour} x={at.x} y={at.y} textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="700" className="font-display fill-white">{hour}</text>;
          })}
        </g>

        {/* The train, and the screws that hold the movement down */}
        <g data-saga="clock-part" className="[transform-box:fill-box] origin-center text-white/80">
          {TRAIN.map(wheel => <Gear key={`${wheel.x},${wheel.y}`} {...wheel} tick={tick} />)}
          {SCREWS.map(({ x, y }) => (
            <g key={`${x},${y}`}>
              <circle cx={x} cy={y} r="4" fill="currentColor" />
              <line className="text-black" x1={x - 3} y1={y - 1.5} x2={x + 3} y2={y + 1.5} stroke="currentColor" strokeWidth="1.4" />
            </g>
          ))}
        </g>

        <Orbits side="far" turns={turns} />

        <Meter dial={SECONDS} labels={TENS} step={60} reading={mounted ? seconds / 60 : null} />
        <Meter dial={DATE} labels={DATES} step={1800 / 31} reading={mounted ? (now.getDate() - 1) / 31 : null} />
        <Meter dial={MONTH} labels={MONTHS} step={60} reading={mounted ? now.getMonth() / 12 : null} />
        <Meter dial={DAY} labels={WEEK} step={360 / 7} reading={mounted ? ((now.getDay() + 6) % 7) / 7 : null} tick={tick} />

        <Orbits side="near" turns={turns} />

        {/* The seconds' orbit */}
        <g data-saga="clock-part" className="[transform-box:fill-box] origin-center text-tm-orange-light">
          <circle cx={MONTH.x} cy={MONTH.y} r={SECONDS_ORBIT} fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="1 6" strokeLinecap="round" />
          {mounted && <circle cx={secondsBead.x} cy={secondsBead.y} r="4.5" fill="currentColor" stroke="black" strokeWidth="1" />}
        </g>

        {/* The hands, over everything, with the jewel on their pivot */}
        <g data-saga="clock-hands" style={{ transformOrigin: `${C}px ${C}px` }}>
          {mounted && (
            <>
              <Hand shape={HOUR_HAND} angle={hours * 30} />
              <Hand shape={MINUTE_HAND} angle={minutes * 6} />
            </>
          )}
          <circle className="fill-white stroke-black" cx={C} cy={C} r="8" strokeWidth="2" />
          <circle className="text-tm-red" cx={C} cy={C} r="4" fill="currentColor" />
        </g>
      </svg>
    </div>
  );
}

// The same reading in plain figures, since the dials are small on a phone
export function ClockDetails() {
  const mounted = useMounted();
  const now = useNow();
  return (
    <div data-saga="clock-details" className="col-start-1 row-start-1 flex flex-col items-center gap-1 motion-reduce:hidden">
      <p className="min-h-9 text-3xl font-display font-bold tabular-nums text-tm-purple-dark dark:text-tm-yellow">{mounted && format(now, "h:mm:ss a")}</p>
      <p className={cn(CAPTION, "min-h-4")}>{mounted && `${leftToday(now)} · Week ${getISOWeek(now)}`}</p>
    </div>
  );
}
