import { motion, useReducedMotion } from "framer-motion";
import { Flag, TrendingDown, TrendingUp } from "lucide-react";
import { SkeletonRows } from "@/components/loader";
import { XP_VALUES, RPG_TITLES, LEVEL_UP_XP } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Profile, SeasonPace, StatName } from "@/lib/types";
import InsightCard, { Pill } from "./insight-card";

// The quickest way to feed each stat, from the XP rules in getStatsForPeriod
const STAT_BOOSTS: Record<StatName, string> = {
  vitality: `check off a habit (+${XP_VALUES.HABIT_CHECK} XP)`,
  strength: `finish a task (+${XP_VALUES.TASK} XP)`,
  wealth: `complete a quest (+${XP_VALUES.QUEST_SIDE}–${XP_VALUES.QUEST_EPIC} XP)`,
  intelligence: `write in today's note (+${XP_VALUES.NOTE_ENTRY} XP a line)`,
  charisma: "do today's smart mission (+50 XP)",
};

const pct = (value: number, max: number) => `${Math.min(100, (value / max) * 100)}%`;

// The meter runs from 0 to the XP that reaches the final rank (Hero, level 45); beyond it, it overflows
const FINAL_RANK = RPG_TITLES[RPG_TITLES.length - 1];
export const METER_MAX_XP = (FINAL_RANK.minLevel - 1) * LEVEL_UP_XP;

// What it takes to finish above last month's final total, spread over the days left (today included)
export function raceGoal(current: number, pace: SeasonPace, daysLeft: number) {
  const perDay = (xp: number) => Math.ceil(xp / (daysLeft + 1)).toLocaleString();
  if (pace.lastMonthTotalXP <= 0) {
    return { label: "Daily average", value: `${Math.round(current / pace.dayOfMonth).toLocaleString()} XP a day` };
  }
  const needed = pace.lastMonthTotalXP - current + 1;
  if (needed <= 0) {
    return { label: `${pace.lastMonthName} beaten`, value: `By ${(1 - needed).toLocaleString()} XP` };
  }
  return {
    label: `To beat ${pace.lastMonthName}`,
    value: daysLeft === 0 ? `${needed.toLocaleString()} XP today` : `${needed.toLocaleString()} XP · ${perDay(needed)} XP/day`,
  };
}

export default function SeasonPaceCard({ profile, pace, className }: { profile: Profile | null; pace: SeasonPace | null; className?: string }) {
  const loading = !profile || !pace;

  return (
    <InsightCard
      icon={Flag}
      iconClassName="text-tm-yellow"
      title="Season Pace"
      subtitle={pace ? `Racing ${pace.lastMonthName}` : "Racing last month"}
      aside={pace && <Pill className="hidden sm:block">Day {pace.dayOfMonth}</Pill>}
      delay={0.3}
      className={cn("border-tm-yellow/20", className)}
    >
      {loading ? (
        <SkeletonRows rows={3} caption="Loading season pace" />
      ) : (
        <PaceBody profile={profile} pace={pace} />
      )}
    </InsightCard>
  );
}

function PaceBody({ profile, pace }: { profile: Profile; pace: SeasonPace }) {
  const current = profile.xp;
  const delta = current - pace.lastMonthPaceXP;
  const hasRival = pace.lastMonthTotalXP > 0;
  const overflow = current - METER_MAX_XP;
  const daysLeft = pace.daysInMonth - pace.dayOfMonth;
  const weakStat = profile.weakStat as StatName;
  const goal = raceGoal(current, pace, daysLeft);

  return (
    <div className="flex-1 flex flex-col gap-6 relative z-10">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <p className="text-4xl font-display font-bold text-tm-purple-dark dark:text-tm-yellow leading-none">
          {current.toLocaleString()} <span className="text-base text-tm-blue-gray">XP</span>
        </p>
        {hasRival && (
          <p className={cn(
            "flex items-center gap-1.5 text-sm font-semibold",
            delta > 0 ? "text-tm-yellow" : delta < 0 ? "text-tm-orange-dark" : "text-tm-blue-gray"
          )}>
            {delta > 0 ? <TrendingUp size={16} /> : delta < 0 ? <TrendingDown size={16} /> : null}
            {delta === 0
              ? `Level with ${pace.lastMonthName}'s pace`
              : `${Math.abs(delta).toLocaleString()} ${delta > 0 ? "ahead of" : "behind"} ${pace.lastMonthName}'s pace`}
          </p>
        )}
      </div>

      <SeasonMeter current={current} pace={hasRival ? pace : null} overflow={overflow} />

      {!hasRival && (
        <p className="text-sm text-tm-blue-gray">
          No XP on record for {pace.lastMonthName}, so this season sets the bar.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-2xl bg-tm-blue-gray/5 border border-tm-blue-gray/10">
          <p className="text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray/70">{goal.label}</p>
          <p className="text-sm font-semibold text-foreground mt-1">{goal.value}</p>
        </div>
        <div className="p-3 rounded-2xl bg-tm-blue-gray/5 border border-tm-blue-gray/10">
          <p className="text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray/70">Season ends</p>
          <p className="text-sm font-semibold text-foreground mt-1">
            {daysLeft === 0 ? "Today" : `In ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      {weakStat in STAT_BOOSTS && (
        <p className="text-xs text-tm-blue-gray font-medium">
          Weakest stat: <span className="font-semibold uppercase text-foreground">{weakStat}</span>. To raise it, {STAT_BOOSTS[weakStat]}.
        </p>
      )}
    </div>
  );
}

// Progress toward the final rank this season, with last month's pace and final total marked.
// The bar normally ends at 4,400 XP (Level 45); when anyone went past that, it stretches to fit
// the highest number, with a tick at 4,400 and a tinted overflow zone after it.
export function meterScale(current: number, pace: SeasonPace | null) {
  const max = Math.max(METER_MAX_XP, current, pace?.lastMonthPaceXP ?? 0, pace?.lastMonthTotalXP ?? 0);
  return { max, stretched: max > METER_MAX_XP };
}

function SeasonMeter({ current, pace, overflow }: { current: number; pace: SeasonPace | null; overflow: number }) {
  const reduceMotion = useReducedMotion();
  const overflowing = overflow >= 0;
  const { max, stretched } = meterScale(current, pace);
  const finalRankAt = pct(METER_MAX_XP, max);

  return (
    <div className="space-y-2">
      <div className="relative h-3 rounded-full bg-tm-blue-gray/10">
        {stretched && (
          <div
            data-testid="meter-overflow-zone"
            className="absolute inset-y-0 right-0 rounded-r-full bg-tm-orange-dark/15"
            style={{ left: finalRankAt }}
          />
        )}
        {/* Scaled with transform (not width) so the fill animates cheaply on phones */}
        <motion.div
          className={cn(
            "absolute inset-y-0 left-0 w-full rounded-full origin-left overflow-hidden",
            overflowing ? "bg-tm-orange-dark shadow-[0_0_12px_var(--tm-orange-dark)]" : "bg-tm-yellow"
          )}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: Math.min(1, current / max) }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          {overflowing && !reduceMotion && (
            <motion.div
              data-testid="meter-overflow"
              className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent"
              initial={{ x: "-100%" }}
              animate={{ x: "300%" }}
              transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.6 }}
            />
          )}
        </motion.div>
        {stretched && (
          <div
            className="absolute -top-1.5 -bottom-1.5 w-0.5 bg-tm-orange-dark rounded-full"
            style={{ left: finalRankAt }}
            title={`${METER_MAX_XP.toLocaleString()} XP · Level 45`}
          />
        )}
        {pace && (
          <>
            <div
              className="absolute -top-1 -bottom-1 w-0.5 bg-tm-purple-dark dark:bg-white rounded-full"
              style={{ left: pct(pace.lastMonthPaceXP, max) }}
              title={`${pace.lastMonthName} on day ${pace.dayOfMonth}: ${pace.lastMonthPaceXP} XP`}
            />
            <div
              className="absolute -top-1 -bottom-1 border-l-2 border-dashed border-tm-blue-gray/60"
              style={{ left: pct(pace.lastMonthTotalXP, max) }}
              title={`${pace.lastMonthName} final: ${pace.lastMonthTotalXP} XP`}
            />
          </>
        )}
      </div>
      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray/70">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {pace && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-0.5 h-3 bg-tm-purple-dark dark:bg-white rounded-full" />
                {pace.lastMonthName} day {pace.dayOfMonth}: {pace.lastMonthPaceXP.toLocaleString()}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 border-l-2 border-dashed border-tm-blue-gray/60" />
                Final: {pace.lastMonthTotalXP.toLocaleString()}
              </span>
            </>
          )}
          {stretched && (
            <span className="flex items-center gap-1.5">
              <span className="w-0.5 h-3 bg-tm-orange-dark rounded-full" />
              {METER_MAX_XP.toLocaleString()} XP
            </span>
          )}
        </span>
        <span className={cn("ml-auto", overflowing && "text-tm-orange-dark")}>
          {overflowing
            ? `+${overflow.toLocaleString()} XP over`
            : `${max.toLocaleString()} XP`}
        </span>
      </div>
    </div>
  );
}
