import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { RPG_TITLES } from "@/lib/constants";
import { ERAS, eraForRank } from "@/lib/eras";
import type { Profile } from "@/lib/types";
import InsightCard, { Pill } from "./insight-card";

export default function ClassStatusCard({ profile }: { profile: Profile | null }) {
  const currentLevel = profile?.level || 1;
  const currentTitle = [...RPG_TITLES].reverse().find(t => currentLevel >= t.minLevel)?.title || "Novice";
  const nextTitle = RPG_TITLES.find(t => t.minLevel > currentLevel);
  const levelsToNext = nextTitle ? nextTitle.minLevel - currentLevel : 0;

  // Era this rank belongs to, and the level where the next era's first rank unlocks
  const era = eraForRank(currentTitle);
  const nextEra = ERAS[ERAS.findIndex(e => e.id === era.id) + 1];
  const nextEraLevel = nextEra ? RPG_TITLES.find(t => t.title === nextEra.ranks[0])?.minLevel : undefined;

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
      <div className="flex-1 flex flex-col justify-center items-center gap-8 relative z-10">
        <div className="relative w-44 h-44">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle className="text-tm-blue-gray/10" stroke="currentColor" strokeWidth="8" fill="transparent" r="42" cx="50" cy="50" />
            <motion.circle
              className="text-tm-orange-dark"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray="263.8"
              initial={{ strokeDashoffset: 263.8 }}
              whileInView={{ strokeDashoffset: 263.8 * (1 - (profile ? profile.levelProgress / profile.nextLevelXP : 0)) }}
              fill="transparent"
              r="42" cx="50" cy="50"
              strokeLinecap="round"
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-display font-bold text-tm-purple-dark dark:text-tm-yellow">{currentLevel}</span>
            <span className="text-caption uppercase font-mono font-semibold text-tm-blue-gray tracking-[0.12em]">Level</span>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-tm-blue-gray/5 border border-tm-blue-gray/10">
          <span className="tm-era-badge text-base">{era.numeral}</span>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground leading-tight">Era of {era.name}</p>
            <p className="text-caption font-bold text-tm-blue-gray">
              {nextEra && nextEraLevel
                ? `Era ${nextEra.numeral} · ${nextEra.name} at level ${nextEraLevel}`
                : "Final era reached"}
            </p>
          </div>
        </div>
        <div className="text-center space-y-2">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-tm-purple-dark dark:text-tm-yellow">
              Class: {currentTitle}
            </p>
            {nextTitle ? (
              <p className="text-caption font-mono font-semibold uppercase text-tm-blue-gray/60 tracking-[0.12em]">
                {levelsToNext} {levelsToNext === 1 ? 'level' : 'levels'} to reach {nextTitle.title}
              </p>
            ) : (
              <p className="text-caption font-mono font-semibold uppercase text-tm-orange-dark tracking-[0.12em] animate-pulse">
                Ultimate Rank Achieved
              </p>
            )}
          </div>
          <p className="text-xs text-tm-blue-gray font-medium">
            Earn {(profile?.nextLevelXP || 70) - (profile?.levelProgress || 0)} more XP to reach Level {currentLevel + 1}.
          </p>
        </div>
      </div>
    </InsightCard>
  );
}
