"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { Home, CheckSquare, FileText, Calendar, Moon, Sun, Info, Shield, History, Volume2, VolumeX } from "lucide-react";
import { differenceInDays, endOfMonth } from "date-fns";
import { useTheme, type Rank } from "./theme-provider";
import { useProgress } from "./progress/progress-provider";
import AnimatedNumber from "./progress/animated-number";
import { GaseousDivider } from "./GaseousDivider";
import { cn } from "@/lib/utils";
import { SPRING } from "@/lib/motion";
import { RPG_TITLES } from "@/lib/constants";
import { isMuted, setMuted, subscribeMuted } from "@/lib/sfx";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/habits", label: "Habits", icon: CheckSquare },
  { href: "/history", label: "History", icon: History },
  { href: "/about", label: "About", icon: Info },
];

function EraBadge({ className }: { className?: string }) {
  const { era } = useTheme();
  return (
    <span className={cn("tm-era-badge", className)} title={`Era ${era.numeral} · ${era.name}`} aria-label={`Era ${era.numeral}, ${era.name}`}>
      {era.numeral}
    </span>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme, rank, setRank } = useTheme();
  const { profile, pulse, isManual, setManual } = useProgress();
  const muted = useSyncExternalStore(subscribeMuted, isMuted, () => false);
  const pulseControls = useAnimationControls();
  const [ribbonOpen, setRibbonOpen] = useState(false);
  const [ribbonPath, setRibbonPath] = useState(pathname);

  // Close the season panel when navigating
  if (pathname !== ribbonPath) {
    setRibbonPath(pathname);
    setRibbonOpen(false);
  }

  // Bump the XP readouts when motes land
  useEffect(() => {
    if (pulse) pulseControls.start({ scale: [1, 1.08, 1], transition: { duration: 0.4, ease: "easeOut" } });
  }, [pulse, pulseControls]);

  const today = new Date();
  const daysLeft = differenceInDays(endOfMonth(today), today);
  const progress = profile ? (profile.levelProgress / profile.nextLevelXP) * 100 : 0;

  const cycleRank = () => {
    const ranks = RPG_TITLES.map(t => t.title) as Rank[];
    setRank(ranks[(ranks.indexOf(rank) + 1) % ranks.length]);
    setManual(true);
  };

  const muteButton = (
    <button
      onClick={() => setMuted(!muted)}
      className="p-2 rounded-full hover:bg-tm-blue-gray/10 text-tm-blue-gray transition-colors"
      aria-label={muted ? "Unmute sounds" : "Mute sounds"}
      aria-pressed={muted}
    >
      {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
    </button>
  );

  return (
    <div className="sticky top-0 z-[100] w-full">
      <nav className="w-full bg-background/80 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between relative z-40">
        <div className="flex items-center gap-2">
          <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
            {/* Level progress ring */}
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40" aria-hidden>
              <circle cx="20" cy="20" r="18" fill="none" strokeWidth="2" className="stroke-tm-blue-gray/15" />
              <motion.circle
                cx="20" cy="20" r="18" fill="none" strokeWidth="2" strokeLinecap="round"
                className="stroke-tm-yellow"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: progress / 100 }}
                transition={SPRING.soft}
              />
            </svg>
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shadow-[0_0_10px_rgba(242,79,19,0.3)]">
              <Image src="/logo.png" alt="TaskMaster Logo" width={32} height={32} priority className="w-full h-full object-cover dark:invert-0 dark:hue-rotate-0 invert hue-rotate-180 transition-all" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xl hidden sm:inline-block text-tm-purple-dark dark:text-tm-yellow leading-none">
              TaskMaster
            </span>
            <div className="hidden md:flex items-center gap-1.5 leading-none mt-1">
              <span className="text-tm-orange-dark text-caption font-mono font-semibold uppercase tracking-[0.12em]">[{rank}]</span>
              <EraBadge className="text-caption" />
              <span className="text-tiny text-tm-blue-gray font-mono font-semibold uppercase tracking-[0.12em] border-l border-white/10 pl-1.5 ml-0.5">
                {daysLeft === 1 ? "1 DAY LEFT" : `${daysLeft} DAYS LEFT`}
              </span>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative px-3 py-2 rounded-full flex items-center gap-2 transition-colors",
                  isActive
                    ? "text-tm-orange-dark font-medium"
                    : "text-tm-blue-gray hover:text-tm-orange-light"
                )}
              >
                <motion.span
                  className="inline-flex"
                  whileHover={{ scale: 1.2, y: -2 }}
                  transition={SPRING.snappy}
                >
                  <item.icon size={20} />
                </motion.span>
                <span className="hidden md:inline">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="bubble"
                    className="absolute inset-0 bg-tm-yellow/20 dark:bg-tm-yellow/10 rounded-full -z-10"
                    transition={SPRING.bubble}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Mobile Nav Items */}
        <div className="flex lg:hidden absolute left-1/2 -translate-x-1/2 items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative p-2 rounded-full flex items-center transition-colors",
                  isActive ? "text-tm-orange-dark" : "text-tm-blue-gray"
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="bubble-mobile"
                    className="absolute inset-0 bg-tm-yellow/20 dark:bg-tm-yellow/10 rounded-full -z-10"
                    transition={SPRING.bubble}
                  />
                )}
                <motion.span className="inline-flex" whileTap={{ scale: 0.85 }}>
                  <item.icon size={20} />
                </motion.span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {profile && (
            <motion.div
              data-xp-target
              className="hidden lg:flex items-center gap-3 px-4 py-1.5 bg-tm-yellow/10 rounded-full border border-tm-yellow/20"
              animate={pulseControls}
            >
              <div className="flex flex-col items-end">
                <span className="text-caption font-mono font-semibold uppercase text-tm-yellow leading-none tracking-[0.12em]">Level {profile.level}</span>
                <span className="text-tiny font-bold text-tm-blue-gray mt-0.5"><AnimatedNumber value={profile.xp} /> XP Total</span>
              </div>
              <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={SPRING.soft}
                  className="tm-xp-fill absolute inset-y-0 left-0 bg-tm-yellow shadow-[0_0_10px_rgba(242,194,48,0.5)]"
                />
              </div>
            </motion.div>
          )}

          <div className="flex items-center gap-1 md:bg-white/5 md:p-1 rounded-full md:border border-white/10">
            {process.env.NODE_ENV === "development" && (
              <>
                <button
                  onClick={cycleRank}
                  onContextMenu={(e) => { e.preventDefault(); setManual(false); }}
                  className="hidden md:block p-2 rounded-full hover:bg-tm-blue-gray/10 text-tm-blue-gray transition-colors"
                  title="Cycle Class Scheme (Left Click) | Reset to Auto (Right Click)"
                >
                  <Shield size={20} className={cn("transition-colors", isManual ? "text-tm-yellow" : "text-tm-orange-light")} />
                </button>
                <div className="hidden md:block w-px h-4 bg-white/10 mx-1" />
              </>
            )}

            <div className="hidden md:block">{muteButton}</div>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-tm-blue-gray/10 text-tm-blue-gray transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon size={22} /> : <Sun size={22} className="text-tm-yellow" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Tap outside closes the season panel (kept outside the transformed ribbon so it covers the viewport) */}
      {ribbonOpen && <div className="lg:hidden fixed inset-0 z-[199]" onClick={() => setRibbonOpen(false)} aria-hidden />}

      {/* Mobile Bottom Ribbon: rank + level at a glance, tap for season details */}
      <div className="flex lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex-col items-center">
        <AnimatePresence>
          {ribbonOpen && (
              <motion.div
                key="panel"
                id="season-panel"
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.95 }}
                transition={SPRING.snappy}
                className="mb-2 w-[min(88vw,300px)] p-4 rounded-3xl bg-white/95 dark:bg-tm-purple-dark/95 backdrop-blur-xl border border-tm-blue-gray/10 dark:border-white/10 shadow-2xl origin-bottom space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray">Season ends</span>
                  <span className="text-sm font-semibold text-foreground">{daysLeft === 1 ? "in 1 day" : `in ${daysLeft} days`}</span>
                </div>
                {profile && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray">Next level</span>
                      <span className="text-sm font-semibold text-foreground">{profile.nextLevelXP - profile.levelProgress} XP to go</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-tm-blue-gray/15 overflow-hidden">
                      <div className="tm-xp-fill h-full bg-tm-yellow rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setMuted(!muted)}
                  className="w-full flex items-center justify-between pt-3 border-t border-tm-blue-gray/10"
                  aria-pressed={muted}
                >
                  <span className="text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray">Sound</span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    {muted ? <VolumeX size={16} /> : <Volume2 size={16} />} {muted ? "Off" : "On"}
                  </span>
                </button>
              </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          animate={pulseControls}
          whileTap={{ scale: 0.95 }}
          onClick={() => setRibbonOpen(o => !o)}
          aria-expanded={ribbonOpen}
          aria-controls="season-panel"
          className="px-5 py-2.5 bg-white/90 dark:bg-tm-purple-dark/90 backdrop-blur-xl border border-tm-blue-gray/10 dark:border-white/10 rounded-full shadow-2xl flex items-center gap-2.5 overflow-hidden whitespace-nowrap"
        >
          <span className="text-tm-orange-dark dark:text-tm-yellow text-caption font-mono font-semibold uppercase tracking-[0.12em]">{rank}</span>
          <EraBadge className="text-caption" />
          {profile && (
            <>
              <span className="w-1 h-1 rounded-full bg-tm-blue-gray/40" aria-hidden />
              <span data-xp-target className="text-caption font-mono font-semibold uppercase text-tm-blue-gray dark:text-white/70 tracking-[0.12em]">Lvl {profile.level}</span>
            </>
          )}
          <span className="w-1 h-1 rounded-full bg-tm-blue-gray/40" aria-hidden />
          <span className="text-caption font-black text-tm-blue-gray dark:text-white/70 tracking-widest" aria-label={`${daysLeft} days left in the season`}>
            {daysLeft}d
          </span>
        </motion.button>
      </div>

      {/* Half height on phones so the gas doesn't cover content while scrolling */}
      <div className="relative h-px w-full overflow-visible origin-top scale-y-50 opacity-80 lg:scale-y-100 lg:opacity-100">
        <GaseousDivider
          hoveredSide={null}
          variant="artpaint"
          align="top"
        />
      </div>
    </div>
  );
}
