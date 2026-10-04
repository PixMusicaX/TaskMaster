"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useAnimationControls } from "framer-motion";
import { Home, CheckSquare, FileText, Calendar, Info, History, Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useProgress } from "@/components/progress/progress-provider";
import { isMuted, setMuted, subscribeMuted } from "@/lib/sfx";
import { type PersonaStyle } from "@/lib/persona";
import { cn } from "@/lib/utils";
import PersonaHud from "./persona-hud";
import Ransom from "./ransom";

const ITEMS = [
  { href: "/", icon: Home, labels: { p3: "Dorm", p4: "Home", p5: "Hideout" } },
  { href: "/calendar", icon: Calendar, labels: { p3: "Calendar", p4: "Calendar", p5: "Calendar" } },
  { href: "/notes", icon: FileText, labels: { p3: "Diary", p4: "Notebook", p5: "Notes" } },
  { href: "/habits", icon: CheckSquare, labels: { p3: "Social Link", p4: "S.Link", p5: "Confidant" } },
  { href: "/history", icon: History, labels: { p3: "Records", p4: "Records", p5: "Records" } },
  { href: "/about", icon: Info, labels: { p3: "System", p4: "System", p5: "System" } },
] satisfies { href: string; icon: typeof Home; labels: Record<PersonaStyle, string> }[];

// The game's menu bar on Persona days: brand and level on the left, the in-game calendar on the
// right, the menu across the middle (desktop) or along the bottom (phones)
export default function PersonaNav({ style }: { style: PersonaStyle }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { profile, pulse } = useProgress();
  const muted = useSyncExternalStore(subscribeMuted, isMuted, () => false);
  const pulseControls = useAnimationControls();
  const dark = theme === "dark";

  useEffect(() => {
    if (pulse) pulseControls.start({ scale: [1, 1.15, 1], rotate: style === "p5" ? [0, -6, 0] : 0, transition: { duration: 0.4 } });
  }, [pulse, pulseControls, style]);

  const progress = profile ? Math.round((profile.levelProgress / profile.nextLevelXP) * 100) : 0;

  const iconButton = "p-2 transition-transform active:scale-90";
  const tools = (
    <div className="flex items-center gap-0.5">
      <button onClick={() => setMuted(!muted)} className={cn(iconButton, toolTone(style))} aria-label={muted ? "Unmute sounds" : "Mute sounds"} aria-pressed={muted}>
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
      {/* P4 and P5 have one look for now, so only P3 can switch between day and the Dark Hour */}
      {style === "p3" && (
        <button onClick={toggleTheme} className={cn(iconButton, toolTone(style))} aria-label="Toggle theme">
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      )}
    </div>
  );

  return (
    <div className="sticky top-0 z-[100] w-full">
      <nav className={cn("relative w-full flex items-center justify-between gap-3 px-3 sm:px-6 py-2 sm:py-3", barTone(style))}>
        <motion.div data-xp-target animate={pulseControls} className="flex items-center gap-2 min-w-0">
          <Brand style={style} level={profile?.level} progress={progress} />
        </motion.div>

        <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-1">
          {ITEMS.map((item, i) => (
            <MenuItem key={item.href} style={style} href={item.href} label={item.labels[style]} active={pathname === item.href} index={i} />
          ))}
        </div>

        <div className="flex items-center gap-1 sm:gap-3">
          <div className="hidden md:block">{tools}</div>
          <PersonaHud style={style} dark={dark} />
        </div>
      </nav>

      {/* Phones: the menu runs along the bottom */}
      <div className={cn("lg:hidden fixed bottom-0 inset-x-0 z-[200] pb-[env(safe-area-inset-bottom)]", bottomTone(style))}>
        <div className="flex items-stretch justify-around px-1 pt-1.5 pb-1.5">
          {ITEMS.map((item, i) => (
            <MobileItem key={item.href} style={style} href={item.href} icon={item.icon} label={item.labels[style]} active={pathname === item.href} index={i} />
          ))}
          <div className="md:hidden flex items-center">{tools}</div>
        </div>
      </div>
    </div>
  );
}

function barTone(style: PersonaStyle) {
  switch (style) {
    case "p5": return "bg-black border-b-4 border-[#e5001b]";
    case "p4": return "bg-[#ffe100] border-b-[3px] border-[#181512]";
    default: return "bg-[color-mix(in_srgb,var(--background)_82%,transparent)] border-b border-[color-mix(in_srgb,var(--tm-yellow)_35%,transparent)]";
  }
}

function bottomTone(style: PersonaStyle) {
  switch (style) {
    case "p5": return "bg-black border-t-4 border-[#e5001b]";
    case "p4": return "bg-[#181512] border-t-[3px] border-[#ef5f00]";
    default: return "bg-[color-mix(in_srgb,var(--background)_92%,transparent)] border-t border-[color-mix(in_srgb,var(--tm-yellow)_35%,transparent)]";
  }
}

function toolTone(style: PersonaStyle) {
  switch (style) {
    case "p5": return "text-white hover:text-[#ff1d38]";
    case "p4": return "text-[#181512] lg:text-[#181512] max-md:text-[#ffe100]";
    default: return "text-tm-blue-gray hover:text-tm-yellow";
  }
}

function Brand({ style, level, progress }: { style: PersonaStyle; level?: number; progress: number }) {
  if (style === "p5") {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline-block -rotate-3"><Ransom text="TASKMASTER" size="18px" /></span>
        {level !== undefined && (
          <div className="flex flex-col gap-0.5 -skew-x-12">
            <span className="bg-[#e5001b] text-white font-display text-[15px] px-2 leading-tight border-2 border-white">LV {level}</span>
            <span className="block h-1.5 w-16 bg-white/20 overflow-hidden"><span className="tm-xp-fill block h-full" style={{ width: `${progress}%` }} /></span>
          </div>
        )}
      </div>
    );
  }
  if (style === "p4") {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline font-display text-[20px] text-[#181512] italic tracking-tight">TASKMASTER</span>
        {level !== undefined && (
          <div className="flex items-center gap-1.5 bg-[#181512] rounded-lg pl-2 pr-1.5 py-1 shadow-[3px_3px_0_#ef5f00]">
            <span className="font-display text-[14px] text-[#ffe100] leading-none">Lv{level}</span>
            <span className="block h-2 w-14 rounded-full bg-white/20 overflow-hidden"><span className="tm-xp-fill block h-full rounded-full" style={{ width: `${progress}%` }} /></span>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <span className="hidden sm:inline text-[18px] italic font-medium uppercase tracking-[0.18em] text-tm-yellow">TaskMaster</span>
      {level !== undefined && (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-[0.25em] text-tm-blue-gray leading-none">Lv <span className="text-[16px] text-tm-yellow italic font-medium tracking-normal">{level}</span></span>
          <span className="block h-[3px] w-20 bg-[color-mix(in_srgb,var(--tm-yellow)_18%,transparent)] -skew-x-[30deg] overflow-hidden"><span className="tm-xp-fill block h-full" style={{ width: `${progress}%` }} /></span>
        </div>
      )}
    </div>
  );
}

const P5_SHARD = "polygon(4% 8%, 100% 0, 94% 88%, 0 100%)";

function MenuItem({ style, href, label, active, index }: { style: PersonaStyle; href: string; label: string; active: boolean; index: number }) {
  if (style === "p5") {
    return (
      <motion.div initial={{ opacity: 0, x: -30, skewX: -20 }} animate={{ opacity: 1, x: 0, skewX: 0 }} transition={{ delay: index * 0.04, type: "spring", stiffness: 500, damping: 26 }}>
        <Link href={href} className="relative block px-3 py-1 group">
          {active && <motion.span layoutId="p5-menu" className="absolute inset-0 bg-white" style={{ clipPath: P5_SHARD, rotate: index % 2 ? 3 : -3 }} transition={{ type: "spring", stiffness: 600, damping: 30 }} />}
          <span className={cn("relative block font-display text-[19px] uppercase italic transition-transform group-hover:-translate-y-0.5 group-hover:rotate-[-4deg]", active ? "text-[#e5001b]" : "text-white group-hover:text-[#ff1d38]")}>{label}</span>
        </Link>
      </motion.div>
    );
  }
  if (style === "p4") {
    return (
      <motion.div initial={{ opacity: 0, y: -10, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: index * 0.05, type: "spring", stiffness: 500, damping: 18 }}>
        <Link href={href} className={cn("relative block px-3 py-1 rounded-lg border-2 border-[#181512] font-display text-[14px] uppercase transition-transform hover:-translate-y-0.5", active ? "text-[#181512]" : "bg-[#181512] text-[#ffe100]")}>
          {active && <motion.span layoutId="p4-menu" className="absolute inset-0 rounded-md bg-white shadow-[3px_3px_0_#ef5f00]" transition={{ type: "spring", stiffness: 500, damping: 28 }} />}
          <span className="relative">{label}</span>
        </Link>
      </motion.div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
      <Link href={href} className="relative block px-3 py-1.5 group">
        {active && <motion.span layoutId="p3-menu" className="absolute inset-0 bg-tm-yellow -skew-x-[24deg]" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
        <span className={cn("relative text-[14px] italic font-medium uppercase tracking-[0.16em] transition-colors", active ? "text-[var(--tm-on-accent)]" : "text-tm-blue-gray group-hover:text-tm-yellow")}>{label}</span>
        {!active && <span className="absolute left-3 right-3 bottom-0.5 h-px bg-tm-yellow origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />}
      </Link>
    </motion.div>
  );
}

function MobileItem({ style, href, icon: Icon, label, active, index }: { style: PersonaStyle; href: string; icon: typeof Home; label: string; active: boolean; index: number }) {
  const tone = style === "p5"
    ? (active ? "text-[#e5001b]" : "text-white")
    : style === "p4"
      ? (active ? "text-[#181512]" : "text-[#ffe100]")
      : (active ? "text-[var(--tm-on-accent)]" : "text-tm-blue-gray");
  return (
    <motion.div className="flex-1 min-w-0" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035, type: "spring", stiffness: 500, damping: 26 }}>
      <Link href={href} className="relative flex flex-col items-center justify-center gap-0.5 py-1" aria-label={label} aria-current={active ? "page" : undefined}>
        {active && (
          <motion.span
            layoutId={`${style}-menu-mobile`}
            className={cn(
              "absolute inset-x-1 inset-y-0",
              style === "p5" && "bg-white",
              style === "p4" && "bg-[#ffe100] rounded-lg",
              style === "p3" && "bg-tm-yellow -skew-x-[20deg]"
            )}
            style={style === "p5" ? { clipPath: P5_SHARD } : undefined}
            transition={{ type: "spring", stiffness: 520, damping: 30 }}
          />
        )}
        <motion.span className={cn("relative", tone)} whileTap={{ scale: 0.8, rotate: style === "p5" ? -12 : 0 }}>
          <Icon size={19} strokeWidth={style === "p3" ? 1.6 : 2.4} />
        </motion.span>
        <span className={cn("relative text-[9px] leading-none uppercase truncate max-w-full", tone, style === "p3" ? "italic tracking-wider" : "font-display")}>{label}</span>
      </Link>
    </motion.div>
  );
}
