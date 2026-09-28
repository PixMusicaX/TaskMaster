"use client";

import { useEffect } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  X, Swords, Brain, Coins, HeartPulse, Users, CalendarCheck, Repeat, CheckSquare, Sparkles,
  Flame, Zap, NotebookPen, Smile, Crown, Target, TrendingUp, TrendingDown, type LucideIcon,
} from "lucide-react";
import AnimatedNumber from "@/components/progress/animated-number";
import { eraForRank } from "@/lib/eras";
import { nextSeasonGoal, recapHeadline, recapInsights, type InsightKind } from "@/lib/recap";
import { cn } from "@/lib/utils";
import type { SeasonRecap, StatName } from "@/lib/types";

const STAT_ICONS: Record<StatName, LucideIcon> = {
  strength: Swords,
  intelligence: Brain,
  wealth: Coins,
  vitality: HeartPulse,
  charisma: Users,
};

const INSIGHT_ICONS: Record<InsightKind, LucideIcon> = {
  days: CalendarCheck,
  habit: Flame,
  busiest: Zap,
  notes: NotebookPen,
  mood: Smile,
  quests: Crown,
};

// Sections rise in one after another (transform + opacity only)
const list: Variants = { show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

interface RecapModalProps {
  recap: SeasonRecap | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function RecapModal({ recap, isOpen, onClose }: RecapModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && recap && (
        <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${recap.monthName} season recap`}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto custom-scrollbar rounded-t-3xl sm:rounded-3xl border border-tm-yellow/20 bg-white/95 dark:bg-tm-purple-dark/95 backdrop-blur-xl shadow-2xl"
          >
            <button
              onClick={onClose}
              aria-label="Close recap"
              className="absolute top-4 right-4 z-10 p-2 rounded-full text-tm-blue-gray hover:text-tm-yellow hover:bg-tm-blue-gray/10 transition-colors"
            >
              <X size={20} />
            </button>
            <RecapBody recap={recap} onClose={onClose} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function RecapBody({ recap, onClose }: { recap: SeasonRecap; onClose: () => void }) {
  const era = eraForRank(recap.title);
  const insights = recapInsights(recap);
  const goal = nextSeasonGoal(recap);
  const change = recap.previous && recap.previous.xp > 0 ? recap.xp - recap.previous.xp : null;
  const stats = Object.entries(recap.stats) as [StatName, number][];
  const maxStat = Math.max(1, ...stats.map(([, v]) => v));

  const tiles = [
    { icon: CalendarCheck, label: "Active days", value: `${recap.activeDays}/${recap.daysInMonth}` },
    { icon: Repeat, label: "Habit checks", value: recap.habits.checks },
    { icon: CheckSquare, label: "Tasks done", value: recap.tasksDone },
    { icon: Sparkles, label: "Missions", value: recap.missionsDone },
  ];

  return (
    <motion.div variants={list} initial="hidden" animate="show" className="p-6 sm:p-8 space-y-6">
      {/* Verdict */}
      <motion.div variants={item} className="space-y-2 pr-8">
        <p className="text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-orange-dark dark:text-tm-yellow">
          {recap.monthName} {recap.year} · Season recap
        </p>
        <h2 className="text-3xl font-display font-bold leading-tight text-foreground">{recapHeadline(recap)}</h2>
        <div className="flex items-center gap-2 text-sm font-semibold text-tm-blue-gray">
          <span className="tm-era-badge text-sm">{era.numeral}</span>
          <span>Reached <span className="text-foreground">{recap.title}</span> · Level {recap.level}</span>
        </div>
      </motion.div>

      {/* Final XP */}
      <motion.div variants={item} className="flex items-end justify-between gap-4 p-5 rounded-2xl bg-tm-yellow/10 border border-tm-yellow/20">
        <div>
          <p className="text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray">Final XP</p>
          <p className="text-4xl font-display font-bold text-tm-purple-dark dark:text-tm-yellow leading-none mt-1">
            <AnimatedNumber value={recap.xp} />
          </p>
        </div>
        <div className="text-right space-y-1">
          {change !== null && (
            <p className={cn("flex items-center justify-end gap-1 text-sm font-semibold", change >= 0 ? "text-tm-yellow" : "text-tm-orange-dark")}>
              {change >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
              {change >= 0 ? "+" : "−"}{Math.abs(change).toLocaleString()} vs {recap.previous!.monthName}
            </p>
          )}
          {recap.seasonRank && recap.seasonsCompared > 1 && (
            <p className="text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray">
              #{recap.seasonRank} of {recap.seasonsCompared} seasons
            </p>
          )}
        </div>
      </motion.div>

      {/* Counts */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3">
        {tiles.map(({ icon: Icon, label, value }) => (
          <div key={label} className="p-4 rounded-2xl bg-tm-blue-gray/5 border border-tm-blue-gray/10">
            <Icon size={16} className="text-tm-orange-dark dark:text-tm-yellow" />
            <p className="text-2xl font-display font-bold text-foreground mt-2 leading-none">{value}</p>
            <p className="text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray mt-1">{label}</p>
          </div>
        ))}
      </motion.div>

      {/* Highlights */}
      {insights.length > 0 && (
        <motion.div variants={item} className="space-y-2">
          <p className="text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray">Highlights</p>
          <ul className="space-y-2">
            {insights.map(({ kind, text }) => {
              const Icon = INSIGHT_ICONS[kind];
              return (
                <li key={kind} className="flex items-start gap-3 text-sm text-foreground/90">
                  <Icon size={16} className="shrink-0 mt-0.5 text-tm-orange-dark dark:text-tm-yellow" />
                  <span>{text}</span>
                </li>
              );
            })}
          </ul>
        </motion.div>
      )}

      {/* Stat balance */}
      <motion.div variants={item} className="space-y-2">
        <p className="text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray">Stat balance</p>
        <div className="space-y-2">
          {stats.map(([name, value]) => {
            const Icon = STAT_ICONS[name];
            const isTop = name === recap.topStat && value > 0;
            const isWeak = name === recap.weakStat && !isTop;
            return (
              <div key={name} className="flex items-center gap-3">
                <Icon size={15} className={cn("shrink-0", isTop ? "text-tm-yellow" : isWeak ? "text-tm-orange-dark" : "text-tm-blue-gray")} />
                <span className="w-24 text-xs font-semibold uppercase text-foreground/80">{name}</span>
                <div className="relative flex-1 h-2 rounded-full bg-tm-blue-gray/10 overflow-hidden">
                  <motion.div
                    className={cn("absolute inset-0 rounded-full origin-left", isWeak ? "bg-tm-orange-dark" : "bg-tm-yellow")}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: value / maxStat }}
                    transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
                  />
                </div>
                <span className="w-14 text-right text-xs font-mono font-semibold text-tm-blue-gray">{value.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Next season */}
      {recap.xp > 0 && (
        <motion.div variants={item} className="flex items-start gap-3 p-4 rounded-2xl bg-tm-orange-dark/10 border border-tm-orange-dark/20">
          <Target size={18} className="shrink-0 mt-0.5 text-tm-orange-dark" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">
              To top {recap.monthName} in {recap.nextSeason.monthName}: {goal.target.toLocaleString()} XP
            </p>
            <p className="text-tm-blue-gray mt-0.5">
              About {goal.perDay.toLocaleString()} XP/day. {recap.weakStat !== recap.topStat && (
                <>Your weakest stat, <span className="font-semibold uppercase">{recap.weakStat}</span>, is the easiest place to gain.</>
              )}
            </p>
          </div>
        </motion.div>
      )}

      <motion.div variants={item}>
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl bg-tm-yellow text-tm-purple-dark font-bold uppercase tracking-wide hover:brightness-110 active:scale-[0.98] transition"
        >
          Begin {recap.nextSeason.monthName}
        </button>
      </motion.div>
    </motion.div>
  );
}
