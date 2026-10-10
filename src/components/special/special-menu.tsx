"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun, Volume2, VolumeX, X } from "lucide-react";
import { format } from "date-fns";
import { SPECIAL_DAYS, SPECIAL_FORCED_THEME, type SpecialId } from "@/lib/special-days";
import { ROUTES } from "@/lib/routes";
import { isMuted, setMuted, sfx, subscribeMuted } from "@/lib/sfx";
import { useTheme } from "@/components/theme-provider";
import { useProgress } from "@/components/progress/progress-provider";
import { cn } from "@/lib/utils";
import { PERSONA_MENU_ITEMS } from "@/components/persona/persona-menu-items";
import { SPECIAL_LOOKS, type MenuLayout } from "./special-themes";

const LABEL = "text-caption font-mono font-semibold uppercase tracking-[0.12em]";
const SPRING = { type: "spring", stiffness: 420, damping: 28 } as const;

// The day's menu, which on a special day is the only menu: a full screen in the day's colours
// with the six pages under names that suit the theme. Its layout depends on the theme: a tall
// list of words, a contents page with dotted leaders, a sheet of cards, or a ring.
// Arrow keys move, Enter opens, Escape closes.
export default function SpecialMenu({ id, open, onClose }: { id: SpecialId; open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { profile } = useProgress();
  const muted = useSyncExternalStore(subscribeMuted, isMuted, () => false);
  const current = Math.max(0, ROUTES.indexOf(pathname));
  const [selected, setSelected] = useState(current);

  // Each opening starts on the current page
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSelected(current);
  }

  const selectedRef = useRef(selected);
  useEffect(() => { selectedRef.current = selected; });

  const select = useCallback((index: number) => {
    if (selectedRef.current === index) return;
    selectedRef.current = index;
    setSelected(index);
    if (!isMuted()) sfx.complete();
  }, []);

  useEffect(() => {
    if (!open) return;
    sfx.swoosh();
    const count = ROUTES.length;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      else if (["ArrowDown", "ArrowRight", "s", "d"].includes(e.key)) { e.preventDefault(); select((selectedRef.current + 1) % count); }
      else if (["ArrowUp", "ArrowLeft", "w", "a"].includes(e.key)) { e.preventDefault(); select((selectedRef.current - 1 + count) % count); }
      else if (e.key === "Enter") { router.push(ROUTES[selectedRef.current]); onClose(); }
    };
    // Capture phase, so the menu claims the arrow keys before the page under it
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose, select, router]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="special-menu"
          className="fixed inset-0 z-[420] overflow-hidden select-none bg-background text-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <SpecialMenuBody
            id={id}
            selected={selected}
            current={current}
            select={select}
            onClose={onClose}
            date={new Date()}
            level={profile?.level}
            footer={<p className={cn(LABEL, "shrink-0 mt-6 hidden md:block text-tm-blue-gray/70")}>↵ Open · Esc Close · M Menu</p>}
          />

          {/* Sound, light or dark (unless the day pins one), and close */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 [&>button]:p-2.5 [&>button]:rounded-full [&>button]:bg-tm-purple-dark [&>button]:text-tm-yellow [&>button]:active:scale-90 [&>button]:transition-transform">
            <button onClick={() => setMuted(!muted)} aria-label={muted ? "Unmute sounds" : "Mute sounds"} aria-pressed={muted}>
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            {!SPECIAL_FORCED_THEME[id] && (
              <button onClick={toggleTheme} aria-label="Toggle theme">
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            )}
            <button onClick={onClose} aria-label="Close menu">
              <X size={20} strokeWidth={2.6} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface BodyProps {
  id: SpecialId;
  selected: number;
  // The page you are on (-1 for none)
  current: number;
  select: (index: number) => void;
  onClose: () => void;
  date: Date;
  level?: number;
  // Drawn over the wash and under the words
  backdrop?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

// The menu's screen itself, without the dialog around it: the day's wash and emblem, its name,
// and the six pages. The landing page shows this as a preview of the day (inert, with a backdrop).
export function SpecialMenuBody({ id, selected, current, select, onClose, date, level, backdrop, footer, className }: BodyProps) {
  const day = SPECIAL_DAYS[id];
  const look = SPECIAL_LOOKS[id];
  const Icon = look.icon;
  const items = ROUTES.map((href, i) => ({ href, label: day.labels[i], icon: PERSONA_MENU_ITEMS[i].icon }));

  return (
    <>
      {/* The day's wash, and its emblem, huge and faint, in the corner */}
      <div className="absolute inset-0" style={{ background: look.wash }} aria-hidden />
      {backdrop}
      <motion.div
        className="absolute -right-[12vmin] -bottom-[14vmin] text-tm-yellow opacity-[0.09] pointer-events-none"
        initial={{ scale: 0.7, rotate: -30 }}
        animate={{ scale: 1, rotate: -12 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        aria-hidden
      >
        <Icon style={{ width: "70vmin", height: "70vmin" }} strokeWidth={1} />
      </motion.div>

      <div className={cn("relative h-full flex flex-col px-6 pt-[max(4.5rem,env(safe-area-inset-top))] pb-8 md:px-16 md:pt-20 overflow-y-auto", className)}>
        <motion.header
          className="shrink-0 mb-6 md:mb-10"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.05 }}
        >
          <p className={cn(LABEL, "flex items-center gap-2 text-tm-blue-gray")}>
            <Icon size={14} className="text-tm-yellow" />
            {format(date, "EEEE, MMMM d")}
            {level !== undefined && <span className="text-tm-yellow">· LV {level}</span>}
          </p>
          <h2 className="special-title mt-2 text-5xl md:text-7xl font-bold leading-none text-tm-purple-dark dark:text-tm-yellow" style={{ fontFamily: "var(--special-font)" }}>
            {day.name}
          </h2>
          <p className="mt-2 text-sm md:text-base font-medium italic text-tm-blue-gray">{day.tagline}</p>
        </motion.header>

        <nav aria-label="Menu" className="flex-1 min-h-0">
          <MenuItems layout={look.menu} items={items} selected={selected} current={current} select={select} onClose={onClose} />
        </nav>

        {footer}
      </div>
    </>
  );
}

interface ItemsProps {
  layout: MenuLayout;
  items: { href: string; label: string; icon: typeof X }[];
  selected: number;
  current: number;
  select: (index: number) => void;
  onClose: () => void;
}

function MenuItems({ layout, items, selected, current, select, onClose }: ItemsProps) {
  const link = (i: number) => ({
    href: items[i].href,
    onClick: onClose,
    onMouseEnter: () => select(i),
    onFocus: () => select(i),
    "aria-current": current === i ? ("page" as const) : undefined,
  });
  const font = { fontFamily: "var(--special-font)" };

  // The pages around a ring, with the chosen one named in the middle
  if (layout === "orbit") {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="relative w-[min(78vw,58vh)] aspect-square">
          <motion.div
            className="absolute inset-[9%] rounded-full border border-dashed border-tm-yellow/40"
            animate={{ rotate: 360 }}
            transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
            aria-hidden
          />
          <div className="absolute inset-[27%] rounded-full border border-tm-blue-gray/20" aria-hidden />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-[26%] pointer-events-none">
            <span className={cn(LABEL, "text-tm-blue-gray")}>0{selected + 1}</span>
            <span className="text-2xl md:text-4xl font-bold leading-tight text-tm-purple-dark dark:text-tm-yellow" style={font}>{items[selected].label}</span>
          </div>
          {items.map((item, i) => {
            const angle = (i / items.length) * Math.PI * 2 - Math.PI / 2;
            const Icon = item.icon;
            const on = selected === i;
            return (
              <motion.div
                key={item.href}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${50 + Math.cos(angle) * 41}%`, top: `${50 + Math.sin(angle) * 41}%` }}
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: 1, scale: on ? 1.2 : 1 }}
                transition={{ ...SPRING, delay: 0.1 + i * 0.04 }}
              >
                <Link {...link(i)} aria-label={item.label} className={cn(
                  "flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full border-2 outline-none transition-colors",
                  on ? "bg-tm-yellow border-tm-yellow text-tm-purple-dark shadow-[0_0_24px_-4px_var(--tm-yellow)]" : "bg-background border-tm-blue-gray/30 text-tm-blue-gray"
                )}>
                  <Icon size={22} />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  // A sheet of cards, each a little askew
  if (layout === "cards") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5 max-w-3xl">
        {items.map((item, i) => {
          const Icon = item.icon;
          const on = selected === i;
          const tilt = [-2, 1.5, -1, 2, -1.5, 1][i];
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, y: 30, rotate: tilt * 3 }}
              animate={{ opacity: 1, y: on ? -6 : 0, rotate: on ? 0 : tilt, scale: on ? 1.04 : 1 }}
              transition={{ ...SPRING, delay: 0.08 + i * 0.05 }}
            >
              <Link {...link(i)} className={cn(
                "block p-4 md:p-6 rounded-2xl border-2 outline-none transition-colors min-h-[6.5rem] md:min-h-[9rem]",
                on ? "bg-tm-yellow border-tm-yellow text-tm-purple-dark shadow-xl" : "bg-background/70 border-tm-blue-gray/20 text-foreground"
              )}>
                <Icon size={22} className={on ? "" : "text-tm-yellow"} />
                <span className="block mt-3 md:mt-5 text-xl md:text-3xl font-bold leading-none" style={font}>{item.label}</span>
                <span className={cn(LABEL, "block mt-1.5", on ? "opacity-70" : "text-tm-blue-gray")}>0{i + 1}</span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    );
  }

  // A tall list of words; with "leaders" it reads like a menu board or a contents page
  const leaders = layout === "leaders";
  return (
    <ul className={cn("flex flex-col", leaders ? "gap-2 md:gap-3 max-w-2xl" : "gap-1 md:gap-2")}>
      {items.map((item, i) => {
        const on = selected === i;
        return (
          <motion.li
            key={item.href}
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: on ? 14 : 0 }}
            transition={{ ...SPRING, delay: 0.08 + i * 0.045 }}
          >
            <Link {...link(i)} className="group flex items-baseline gap-3 outline-none">
              {!leaders && <span className={cn(LABEL, "w-6", on ? "text-tm-yellow" : "text-tm-blue-gray/50")}>0{i + 1}</span>}
              <span
                className={cn(
                  "font-bold leading-[1.05] transition-colors",
                  leaders ? "text-3xl md:text-5xl" : "text-4xl md:text-6xl",
                  on ? "text-tm-yellow" : "text-tm-purple-dark/80 dark:text-foreground/80"
                )}
                style={font}
              >
                {item.label}
              </span>
              {leaders && (
                <>
                  <span className={cn("flex-1 border-b-2 border-dotted translate-y-[-0.3em]", on ? "border-tm-yellow" : "border-tm-blue-gray/30")} aria-hidden />
                  <span className={cn(LABEL, "text-sm", on ? "text-tm-yellow" : "text-tm-blue-gray")}>0{i + 1}</span>
                </>
              )}
            </Link>
          </motion.li>
        );
      })}
    </ul>
  );
}
