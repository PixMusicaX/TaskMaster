import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { RPG_TITLES } from "@/lib/constants";
import { eraAt, MAX_ERA } from "@/lib/eras";
import { useEra } from "@/components/theme-provider";
import { useEraStanding, type EraStanding } from "@/components/progress/era-standing";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import InsightCard, { Pill } from "./insight-card";

const RING = 2 * Math.PI * 42;

export default function ClassStatusCard({ profile }: { profile: Profile | null }) {
  const level = profile?.level || 1;
  const progress = profile ? profile.levelProgress / profile.nextLevelXP : 0;
  const rankIndex = Math.max(0, RPG_TITLES.findLastIndex(t => level >= t.minLevel));
  const rank = RPG_TITLES[rankIndex].title;
  const standing = useEraStanding();
  const themeEra = useEra();
  const era = standing ? eraAt(standing.index) : themeEra;

  return (
    <InsightCard
      icon={Trophy}
      iconClassName="text-tm-orange-dark"
      title="Class Status"
      subtitle="Level & Ranking"
      aside={<Pill className="hidden sm:block">Live Data</Pill>}
      delay={0.4}
      className="h-full border-tm-orange-dark/20"
    >
      <div className="flex-1 flex flex-col justify-center gap-8 relative z-10">
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
          <div className="relative w-40 h-40 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle className="text-tm-blue-gray/10" stroke="currentColor" strokeWidth="7" fill="transparent" r="42" cx="50" cy="50" />
              <motion.circle
                className="text-tm-orange-dark"
                stroke="currentColor"
                strokeWidth="7"
                strokeDasharray={RING}
                initial={{ strokeDashoffset: RING }}
                whileInView={{ strokeDashoffset: RING * (1 - progress) }}
                viewport={{ once: true }}
                fill="transparent"
                r="42" cx="50" cy="50"
                strokeLinecap="round"
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-caption uppercase font-mono font-semibold text-tm-blue-gray tracking-[0.12em]">Level</span>
              <span className="text-5xl font-display font-bold text-tm-purple-dark dark:text-tm-yellow leading-none my-1">{level}</span>
              {profile && (
                <span className="text-caption font-mono font-semibold text-tm-blue-gray/80">
                  {profile.levelProgress}/{profile.nextLevelXP} XP
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-3 min-w-0">
            <div>
              <p className="text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray/70">Current class</p>
              <p className="text-3xl font-display font-bold text-tm-purple-dark dark:text-tm-yellow leading-tight">{rank}</p>
            </div>
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-tm-blue-gray/5 border border-tm-blue-gray/10">
              <span className="tm-era-badge text-sm">{era.numeral}</span>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground leading-tight">Era of {era.name}</p>
                {standing && profile && <EraHint standing={standing} xp={profile.xp} />}
              </div>
            </div>
            {profile && (
              <p className="text-xs text-tm-blue-gray font-medium">
                Top stat: <span className="font-semibold uppercase text-foreground">{profile.topStat}</span>
              </p>
            )}
          </div>
        </div>

        <RankLadder level={level} rankIndex={rankIndex} />
      </div>
    </InsightCard>
  );
}

// How to move in the era system from here (eras follow pace against last month; see lib/eras.ts)
function EraHint({ standing, xp }: { standing: EraStanding; xp: number }) {
  const ahead = standing.index > standing.startIndex;
  const text = ahead
    ? `Ahead of ${standing.lastMonthName}'s pace`
    : standing.startIndex >= MAX_ERA
      ? "Final era"
      : `Pass ${standing.lastMonthName}'s pace for Era ${eraAt(standing.startIndex + 1).numeral} (${Math.max(0, standing.lastMonthPaceXP - xp + 1).toLocaleString()} XP)`;
  return <p className="text-caption font-bold text-tm-blue-gray">{text}</p>;
}

// The current rank and the next two on one track, with the player's level marked on it
function RankLadder({ level, rankIndex }: { level: number; rankIndex: number }) {
  const start = Math.min(rankIndex, RPG_TITLES.length - 3);
  const steps = RPG_TITLES.slice(start, start + 3);
  const min = steps[0].minLevel;
  const max = steps[steps.length - 1].minLevel;
  const at = (lvl: number) => Math.min(1, Math.max(0, (lvl - min) / (max - min)));
  const next = RPG_TITLES[rankIndex + 1];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray/70">
        <span>Rank path</span>
        <span className={next ? undefined : "text-tm-orange-dark"}>
          {next
            ? `${next.minLevel - level} ${next.minLevel - level === 1 ? "level" : "levels"} to ${next.title}`
            : "Ultimate rank achieved"}
        </span>
      </div>

      <div className="relative mx-3">
        <div className="h-1.5 rounded-full bg-tm-blue-gray/10" />
        {/* Scaled with transform so it stays cheap on phones */}
        <motion.div
          className="absolute inset-y-0 left-0 w-full h-1.5 rounded-full bg-tm-orange-dark origin-left"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: at(level) }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        {steps.map((step) => {
          const reached = level >= step.minLevel;
          return (
            <div
              key={step.title}
              className={cn(
                "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2",
                reached ? "bg-tm-orange-dark border-tm-orange-dark" : "bg-background border-tm-blue-gray/40"
              )}
              style={{ left: `${at(step.minLevel) * 100}%` }}
            />
          );
        })}
      </div>

      <div className="relative h-10 mx-3">
        {steps.map((step, i) => {
          return (
            <div
              key={step.title}
              className={cn(
                "absolute top-0 flex flex-col",
                i === 0 ? "items-start -ml-3" : i === steps.length - 1 ? "items-end -mr-3 right-0" : "items-center -translate-x-1/2"
              )}
              style={i === steps.length - 1 ? undefined : { left: `${at(step.minLevel) * 100}%` }}
            >
              <span className={cn("text-sm font-semibold flex items-center gap-1.5", level >= step.minLevel ? "text-foreground" : "text-tm-blue-gray")}>
                {step.title}
              </span>
              <span className="text-caption font-mono font-semibold text-tm-blue-gray/70">Lv {step.minLevel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
