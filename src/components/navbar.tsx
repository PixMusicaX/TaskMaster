"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useAnimationControls } from "framer-motion";
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
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10 shadow-[0_0_10px_rgba(242,79,19,0.3)]">
            <img src="/logo.png" alt="TaskMaster Logo" className="w-full h-full object-cover dark:invert-0 dark:hue-rotate-0 invert hue-rotate-180 transition-all" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xl hidden sm:inline-block text-tm-purple-dark dark:text-tm-yellow leading-none">
              TaskMaster
            </span>
            <div className="hidden md:flex items-center gap-1.5 leading-none mt-1">
              <span className="text-tm-orange-dark text-caption font-black uppercase tracking-widest">[{rank}]</span>
              <EraBadge className="text-caption" />
              <span className="text-tiny text-tm-blue-gray font-bold uppercase tracking-tighter border-l border-white/10 pl-1.5 ml-0.5">
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
                <item.icon size={20} />
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
                <item.icon size={20} />
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
                <span className="text-caption font-black uppercase text-tm-yellow leading-none tracking-widest">Level {profile.level}</span>
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

      {/* Mobile Bottom Ribbon */}
      <div className="flex lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[200]">
        <motion.div
          animate={pulseControls}
          className="relative pl-4 pr-1.5 py-1.5 bg-white/90 dark:bg-tm-purple-dark/90 backdrop-blur-xl border border-tm-blue-gray/10 dark:border-white/10 rounded-full shadow-2xl flex items-center gap-3 overflow-hidden"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-tm-orange-dark dark:text-tm-yellow text-caption font-black uppercase tracking-widest">{rank}</span>
            <EraBadge className="text-caption" />
            <span className="text-tiny text-tm-blue-gray dark:text-white/60 font-bold uppercase tracking-tighter border-l border-tm-blue-gray/20 dark:border-white/20 pl-2">
              {daysLeft} DAYS LEFT
            </span>
          </div>
          {profile && (
            <div data-xp-target className="flex items-center gap-2 border-l border-tm-blue-gray/20 dark:border-white/20 pl-3">
              <span className="text-caption font-black uppercase text-tm-orange-dark dark:text-tm-yellow leading-none tracking-widest">Lvl {profile.level}</span>
            </div>
          )}
          <div className="-my-1">{muteButton}</div>
          {/* Level progress along the ribbon's bottom edge */}
          {profile && (
            <motion.div
              className="tm-xp-fill absolute bottom-0 left-0 h-[2px] bg-tm-yellow"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={SPRING.soft}
            />
          )}
        </motion.div>
      </div>

      <div className="relative h-px w-full overflow-visible">
        <GaseousDivider
          hoveredSide={null}
          variant="artpaint"
          align="top"
        />
      </div>
    </div>
  );
}
