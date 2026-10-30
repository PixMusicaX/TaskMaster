import Image from "next/image";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_VERSION, CREATOR_URL, CREATOR_URL2 } from "@/lib/version";
import { CAPTION, R, TITLE, anchorAt, polar } from "./saga-kit";

// The growth saga's closing scene: the orbit comes back whole with the way to the Taskmaster at
// its centre, behind the app's own crest. The scroll script animates the pieces through their data-saga names.

// The ring's last job: its stations carry the page's small print, each label running outwards
// from its point on the orbit
const STATIONS: { label: string; angle: number; href?: string; external?: boolean }[] = [
  { label: "Privacy", angle: 45, href: "/privacy" },
  { label: "Terms", angle: 135, href: "/terms" },
  { label: `v${APP_VERSION}`, angle: 180 },
  { label: "By kk36", angle: 225, href: CREATOR_URL2, external: true },
  { label: "By PiX", angle: 315, href: CREATOR_URL, external: true },
];

function Station({ label, angle, href, external, active }: (typeof STATIONS)[number] & { active: boolean }) {
  const at = polar(angle, R);
  const side = anchorAt(at.x);
  const className = cn(
    "group/station absolute flex items-center gap-2 whitespace-nowrap",
    side === "start" && "-translate-y-1/2 -translate-x-[7px]",
    side === "end" && "flex-row-reverse -translate-y-1/2 translate-x-[7px]",
    side === "middle" && "flex-col -translate-x-1/2 -translate-y-[7px]",
    href && active && "pointer-events-auto"
  );
  const style = side === "end"
    ? { right: `${100 - at.x / 4}%`, top: `${at.y / 4}%` }
    : { left: `${at.x / 4}%`, top: `${at.y / 4}%` };
  const inside = (
    <>
      <span className="relative flex w-3.5 h-3.5 shrink-0 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-tm-yellow/20 scale-100 group-hover/station:scale-[1.8] transition-transform duration-300" />
        <span className="relative w-2 h-2 rounded-full bg-tm-yellow shadow-[0_0_8px_var(--tm-yellow)]" />
      </span>
      <span className={cn(CAPTION, "group-hover/station:text-tm-yellow transition-colors")}>{label}</span>
    </>
  );

  if (!href) return <div data-saga="ask-link" className={className} style={style}>{inside}</div>;
  const tabIndex = active ? undefined : -1;
  return external
    ? <a data-saga="ask-link" href={href} target="_blank" rel="noopener noreferrer" tabIndex={tabIndex} className={className} style={style}>{inside}</a>
    : <Link data-saga="ask-link" href={href} tabIndex={tabIndex} className={className} style={style}>{inside}</Link>;
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
      {/* Slow ripples out from the centre */}
      <span aria-hidden className="absolute w-[46%] aspect-square rounded-full border border-tm-yellow/50 animate-ping [animation-duration:2.8s]" />
      <span aria-hidden className="absolute w-[46%] aspect-square rounded-full border border-tm-yellow/30 animate-ping [animation-duration:2.8s] [animation-delay:1.4s]" />
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
      {STATIONS.map(station => <Station key={station.label} {...station} active={active} />)}
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
