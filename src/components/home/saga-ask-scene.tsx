import Image from "next/image";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_VERSION, CREATOR_URL, CREATOR_URL2 } from "@/lib/version";
import { C, CAPTION, R, TITLE, polar } from "./saga-kit";

// The growth saga's closing scene: one thin ring with the page's small print set into it, and the
// way to the Taskmaster at its centre, behind the app's own crest. The scroll script animates the pieces through their data-saga names.

// Set into the ring by clock angle: the upper two run over the top, the rest along the bottom
const LABELS: { label: string; angle: number; href?: string; external?: boolean }[] = [
  { label: "Privacy", angle: 320, href: "/privacy" },
  { label: "Terms", angle: 40, href: "/terms" },
  { label: "By PiX", angle: 135, href: CREATOR_URL, external: true },
  { label: `v${APP_VERSION}`, angle: 180 },
  { label: "By kk36", angle: 225, href: CREATOR_URL2, external: true },
];

const INNER_RING = 122;
const COMET_TAIL = 42;

// Half the opening a label needs in the ring, in degrees: wide enough for its size on a phone
const gapFor = (label: string) => label.length * 1.7 + 4;

const arc = (from: number, to: number, r: number) => {
  const start = polar(from, r);
  const end = polar(to, r);
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${end.x} ${end.y}`;
};

// The stretches of ring between the labels
export function ringArcs() {
  return LABELS.map((item, i) => {
    const next = LABELS[(i + 1) % LABELS.length];
    const to = next.angle + (next.angle < item.angle ? 360 : 0);
    return arc(item.angle + gapFor(item.label), to - gapFor(next.label), R);
  });
}

// Full circles for the text to run along. The top one goes clockwise from six o'clock and the
// bottom one anticlockwise from twelve, so every label reads left to right, the right way up.
const ABOVE = R - 4;
const BELOW = R + 8;
const TOP_PATH = `M ${C} ${C + ABOVE} A ${ABOVE} ${ABOVE} 0 1 1 ${C} ${C - ABOVE} A ${ABOVE} ${ABOVE} 0 1 1 ${C} ${C + ABOVE}`;
const BOTTOM_PATH = `M ${C} ${C - BELOW} A ${BELOW} ${BELOW} 0 1 0 ${C} ${C + BELOW} A ${BELOW} ${BELOW} 0 1 0 ${C} ${C - BELOW}`;

function RingLabel({ label, angle, href, external, active }: (typeof LABELS)[number] & { active: boolean }) {
  const onTop = angle > 270 || angle < 90;
  // How far round its path the label's clock angle falls
  const offset = onTop ? (((angle + 180) % 360) / 360) * 100 : ((360 - angle) / 360) * 100;
  const text = (
    <text
      fill="currentColor"
      textAnchor="middle"
      // The clear stroke makes the whole word a target, not just its strokes
      stroke="transparent"
      strokeWidth="16"
      className="text-[15px] sm:text-[12px] font-mono font-semibold uppercase tracking-[0.12em] [paint-order:stroke]"
    >
      <textPath href={onTop ? "#ask-top" : "#ask-bottom"} startOffset={`${offset}%`}>{label}</textPath>
    </text>
  );
  const plain = "text-tm-blue-gray";
  if (!href) return <g data-saga="ask-link" className={plain}>{text}</g>;

  const className = cn(plain, "hover:text-tm-yellow focus-visible:text-tm-yellow transition-colors outline-none", active && "pointer-events-auto");
  const tabIndex = active ? undefined : -1;
  return external
    ? <a data-saga="ask-link" href={href} target="_blank" rel="noopener noreferrer" tabIndex={tabIndex} className={className}>{text}</a>
    : <Link data-saga="ask-link" href={href} tabIndex={tabIndex} className={className}>{text}</Link>;
}

function RingOfLinks({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
      <defs>
        <path id="ask-top" d={TOP_PATH} />
        <path id="ask-bottom" d={BOTTOM_PATH} />
      </defs>
      {ringArcs().map(d => <path key={d} className="text-tm-yellow" d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />)}
      <circle className="text-tm-yellow/15" cx={C} cy={C} r={INNER_RING} fill="none" stroke="currentColor" strokeWidth="1" />
      <g className={cn("tm-ask-comet text-tm-yellow", !active && "[animation-play-state:paused]")}>
        <path d={arc(360 - COMET_TAIL, 360, INNER_RING)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
        <circle cx={C} cy={C - INNER_RING} r="2.5" fill="currentColor" />
      </g>
      {LABELS.map(item => <RingLabel key={item.label} {...item} active={active} />)}
    </svg>
  );
}

export function AskTitle() {
  return (
    <div data-saga="ask-title" className="col-start-1 row-start-1 self-end flex flex-col items-center gap-1 motion-reduce:hidden">
      <p className={cn(TITLE, "text-3xl sm:text-4xl")}>Taskmaster</p>
      <p className={CAPTION}>Need guidance?</p>
    </div>
  );
}

export function AskEmblem({ onAsk, active }: { onAsk: () => void; active: boolean }) {
  return (
    <div data-saga="ask" className="absolute inset-0 flex items-center justify-center motion-reduce:hidden">
      <RingOfLinks active={active} />
      <button
        type="button"
        onClick={onAsk}
        tabIndex={active ? undefined : -1}
        aria-label="Ask The Taskmaster"
        className={cn(
          "group relative w-[46%] aspect-square rounded-full overflow-hidden flex items-center justify-center bg-white dark:bg-tm-purple-dark border border-tm-yellow/40 text-tm-yellow shadow-[0_0_40px_rgba(242,194,48,0.25)] hover:shadow-[0_0_56px_rgba(242,194,48,0.45)] active:scale-95 transition",
          active && "pointer-events-auto"
        )}
      >
        <Image src="/logo.png" alt="" width={240} height={240} className="w-full h-full object-cover invert hue-rotate-180 dark:invert-0 dark:hue-rotate-0 group-hover:scale-105 transition-transform duration-700" />
        <span className="absolute inset-0 bg-gradient-to-r from-tm-yellow/0 via-tm-yellow/20 to-tm-yellow/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </button>
    </div>
  );
}

export function AskDetails({ onAsk, active }: { onAsk: () => void; active: boolean }) {
  return (
    <div data-saga="ask-details" className="col-start-1 row-start-1 flex flex-col items-center gap-3 motion-reduce:hidden">
      <button
        type="button"
        data-saga="ask-row"
        onClick={onAsk}
        tabIndex={active ? undefined : -1}
        className={cn(
          "px-6 py-3 rounded-full bg-tm-purple-dark border border-tm-yellow/30 text-lg font-bold italic tracking-tight text-white hover:border-tm-yellow/60 active:scale-95 transition",
          active && "pointer-events-auto"
        )}
      >
        Ask The Taskmaster
      </button>
      <p data-saga="ask-row" className={CAPTION}>Your day, read back to you</p>
    </div>
  );
}

// The plain button, for when motion is reduced and the scenes are not drawn
export function AskTaskmasterButton({ onAsk }: { onAsk: () => void }) {
  return (
    <button
      onClick={onAsk}
      className="group relative px-8 py-4 bg-tm-purple-dark border border-tm-yellow/30 rounded-[2rem] hover:bg-tm-purple-dark/80 transition-all shadow-[0_0_30px_rgba(242,194,48,0.15)] hover:shadow-[0_0_40px_rgba(242,194,48,0.3)] flex items-center gap-4 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-tm-yellow/0 via-tm-yellow/10 to-tm-yellow/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      <div className="w-10 h-10 rounded-xl bg-tm-yellow/20 flex items-center justify-center relative z-10">
        <MessageSquare className="text-tm-yellow" size={20} />
      </div>
      <div className="text-left relative z-10">
        <p className="text-xs font-mono font-semibold text-tm-yellow tracking-[0.12em] uppercase">Need Guidance?</p>
        <p className="text-lg font-bold text-white italic tracking-tight">Ask The Taskmaster</p>
      </div>
    </button>
  );
}
