import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { RPG_TITLES } from "@/lib/constants";
import InsightCard, { Pill } from "./insight-card";

export default function ClassStatusCard({ profile }: { profile: any }) {
  const currentLevel = profile?.level || 1;
  const currentTitle = [...RPG_TITLES].reverse().find(t => currentLevel >= t.minLevel)?.title || "Novice";
  const nextTitle = RPG_TITLES.find(t => t.minLevel > currentLevel);
  const levelsToNext = nextTitle ? nextTitle.minLevel - currentLevel : 0;

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
              whileInView={{ strokeDashoffset: 263.8 * (1 - (profile?.levelProgress / profile?.nextLevelXP || 0)) }}
              fill="transparent"
              r="42" cx="50" cy="50"
              strokeLinecap="round"
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-black text-tm-purple-dark dark:text-tm-yellow">{currentLevel}</span>
            <span className="text-caption uppercase font-black text-tm-blue-gray tracking-widest">Level</span>
          </div>
        </div>
        <div className="text-center space-y-2">
          <div className="space-y-1">
            <p className="text-sm font-black text-tm-purple-dark dark:text-tm-yellow">
              Class: {currentTitle}
            </p>
            {nextTitle ? (
              <p className="text-caption font-black uppercase text-tm-blue-gray/60 tracking-widest">
                {levelsToNext} {levelsToNext === 1 ? 'level' : 'levels'} to reach {nextTitle.title}
              </p>
            ) : (
              <p className="text-caption font-black uppercase text-tm-orange-dark tracking-widest animate-pulse">
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
