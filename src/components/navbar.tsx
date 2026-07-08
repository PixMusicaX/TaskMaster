"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, CheckSquare, FileText, Calendar, Moon, Sun, Info, Shield, History } from "lucide-react";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/habits", label: "Habits", icon: CheckSquare },
  { href: "/history", label: "History", icon: History },
  { href: "/about", label: "About", icon: Info },
];

import { GaseousDivider } from "./GaseousDivider";

import { useState, useEffect } from "react";
import { getProfile } from "@/app/actions/gamification";
import { Swords, Brain, Coins, HeartPulse, Users } from "lucide-react";
import { RPG_TITLES } from "@/lib/constants";

import { differenceInDays, endOfMonth, format } from "date-fns";

export default function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme, rank, setRank } = useTheme();
  const [profile, setProfile] = useState<any>(null);
  const [isManuallySet, setIsManuallySet] = useState(false);

  const today = new Date();
  const daysLeft = differenceInDays(endOfMonth(today), today);

  useEffect(() => {
    // Check localStorage on client side only
    const manuallySet = !!localStorage.getItem("rank_manually_set");
    setIsManuallySet(manuallySet);

    fetchProfile(manuallySet);

    const handleUpdate = () => fetchProfile(!!localStorage.getItem("rank_manually_set"));
    window.addEventListener("profile-updated", handleUpdate);
    return () => window.removeEventListener("profile-updated", handleUpdate);
  }, [pathname]); // Refresh when navigating

  async function fetchProfile(manualOverride: boolean) {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const data = await getProfile(todayStr);
    setProfile(data);

    if (data) {
      const profileRank = [...RPG_TITLES].reverse().find(t => data.level >= t.minLevel)?.title;

      // LOGIC: If we are not manually overriding, OR if we are "Novice" but should be higher, sync it.
      // This helps users who got stuck in Novice due to previous manual testing.
      if (profileRank) {
        if (!manualOverride || (rank === "Novice" && profileRank !== "Novice")) {
          setRank(profileRank as any);
          // If we forced a sync because they were stuck in Novice, clear the manual flag
          if (rank === "Novice" && profileRank !== "Novice") {
            localStorage.removeItem("rank_manually_set");
            setIsManuallySet(false);
          }
        }
      }
    }
  }

  const progress = profile ? (profile.levelProgress / profile.nextLevelXP) * 100 : 0;
  const currentClass = rank;

  const cycleRank = () => {
    const ranks: any[] = RPG_TITLES.map(t => t.title);
    const currentIndex = ranks.indexOf(rank);
    const nextIndex = (currentIndex + 1) % ranks.length;
    const newRank = ranks[nextIndex];
    setRank(newRank);

    localStorage.setItem("rank_manually_set", "true");
    setIsManuallySet(true);
  };

  const resetRank = () => {
    localStorage.removeItem("rank_manually_set");
    setIsManuallySet(false);
    fetchProfile(false);
  };

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
              <span className="text-tm-orange-dark text-[10px] font-black uppercase tracking-widest">[{currentClass}]</span>
              <span className="text-[9px] text-tm-blue-gray font-bold uppercase tracking-tighter border-l border-white/10 pl-1.5 ml-0.5">
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
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
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
            <div className="hidden lg:flex items-center gap-3 px-4 py-1.5 bg-tm-yellow/10 rounded-full border border-tm-yellow/20">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black uppercase text-tm-yellow leading-none tracking-widest">Level {profile.level}</span>
                <span className="text-[9px] font-bold text-tm-blue-gray mt-0.5">{profile.xp} XP Total</span>
              </div>
              <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="absolute inset-y-0 left-0 bg-tm-yellow shadow-[0_0_10px_rgba(242,194,48,0.5)]"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 md:bg-white/5 md:p-1 rounded-full md:border border-white/10">
            {process.env.NODE_ENV === "development" && (
              <>
                <button
                  onClick={cycleRank}
                  onContextMenu={(e) => { e.preventDefault(); resetRank(); }}
                  className="hidden md:block p-2 rounded-full hover:bg-tm-blue-gray/10 text-tm-blue-gray transition-colors"
                  title="Cycle Class Scheme (Left Click) | Reset to Auto (Right Click)"
                >
                  <Shield size={20} className={cn("transition-colors", isManuallySet ? "text-tm-yellow" : "text-tm-orange-light")} />
                </button>
                <div className="hidden md:block w-px h-4 bg-white/10 mx-1" />
              </>
            )}

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
        <div className="px-4 py-2 bg-white/90 dark:bg-tm-purple-dark/90 backdrop-blur-xl border border-tm-blue-gray/10 dark:border-white/10 rounded-full shadow-2xl flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-tm-orange-dark dark:text-tm-yellow text-[10px] font-black uppercase tracking-widest">{currentClass}</span>
            <span className="text-[9px] text-tm-blue-gray dark:text-white/60 font-bold uppercase tracking-tighter border-l border-tm-blue-gray/20 dark:border-white/20 pl-2">
              {daysLeft} DAYS REMAINING
            </span>
          </div>
          {profile && (
            <div className="flex items-center gap-2 border-l border-tm-blue-gray/20 dark:border-white/20 pl-3">
              <span className="text-[10px] font-black uppercase text-tm-orange-dark dark:text-tm-yellow leading-none tracking-widest">Lvl {profile.level}</span>
            </div>
          )}
        </div>
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
