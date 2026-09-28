"use client";

import { motion } from "framer-motion";
import { differenceInDays, endOfMonth } from "date-fns";
import { ERAS } from "@/lib/eras";
import { RankCrest } from "@/lib/rank-icons";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { useProgress } from "@/components/progress/progress-provider";
import AnimatedNumber from "@/components/progress/animated-number";

// Current rank crest with a level ring, season stats, and the five-era path
export default function VaultHero() {
  const { rank, era } = useTheme();
  const { profile } = useProgress();
  const eraIndex = ERAS.findIndex(e => e.id === era.id);
  const progress = profile ? profile.levelProgress / profile.nextLevelXP : 0;
  const daysLeft = differenceInDays(endOfMonth(new Date()), new Date());

  return (
    <section className="flex flex-col items-center text-center gap-8">
      <div className="relative w-40 h-40">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="46" fill="none" strokeWidth="3" className="stroke-tm-blue-gray/15" />
          <motion.circle
            cx="50" cy="50" r="46" fill="none" strokeWidth="3" strokeLinecap="round"
            className="stroke-tm-yellow"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: progress }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
        <motion.div
          key={rank}
          initial={{ scale: 0.6, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 16 }}
          className="absolute inset-4 rounded-full bg-tm-purple-dark text-tm-yellow flex items-center justify-center shadow-[0_0_40px_-8px_var(--tm-yellow)]"
        >
          <RankCrest rank={rank} size={56} strokeWidth={1.5} />
        </motion.div>
      </div>

      <div className="space-y-2">
        <p className="text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray">The Vault</p>
        <h1 className="text-5xl md:text-6xl font-display font-bold tracking-tight text-tm-purple-dark dark:text-tm-yellow uppercase">{rank}</h1>
        <p className="flex items-center justify-center gap-2 text-sm font-bold text-tm-blue-gray">
          <span className="tm-era-badge">{era.numeral}</span> Era of {era.name}
        </p>
      </div>

      {profile && (
        <div className="grid grid-cols-3 gap-3 w-full max-w-md">
          {[
            { label: "Level", value: profile.level },
            { label: "Season XP", value: profile.xp },
            { label: "Days left", value: daysLeft },
          ].map(stat => (
            <div key={stat.label} className="p-3 rounded-2xl bg-tm-blue-gray/5 border border-tm-blue-gray/10">
              <AnimatedNumber value={stat.value} className="block text-2xl font-display font-bold text-foreground" />
              <span className="text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray">{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Era path: how far this season's climb has reached */}
      <div className="w-full max-w-xl" aria-label={`Era ${era.numeral} of ${ERAS.length} reached this season`}>
        <div className="relative flex justify-between">
          <div className="absolute left-5 right-5 top-5 h-0.5 bg-tm-blue-gray/15" aria-hidden />
          <motion.div
            className="absolute left-5 top-5 h-0.5 bg-tm-yellow origin-left"
            style={{ right: "1.25rem" }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: eraIndex / (ERAS.length - 1) }}
            transition={{ ...SPRING.soft, delay: 0.3 }}
            aria-hidden
          />
          {ERAS.map((e, i) => {
            const reached = i <= eraIndex;
            return (
              <div key={e.id} className="relative flex flex-col items-center gap-2 w-16">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: i === eraIndex ? 1.15 : 1, opacity: 1 }}
                  transition={{ ...SPRING.snappy, delay: 0.2 + i * 0.08 }}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-serif font-bold text-sm border-2 transition-colors",
                    reached
                      ? "bg-tm-yellow border-tm-yellow text-tm-purple-dark"
                      : "bg-background border-tm-blue-gray/20 text-tm-blue-gray/50",
                    i === eraIndex && "shadow-[0_0_20px_-2px_var(--tm-yellow)]"
                  )}
                >
                  {e.numeral}
                </motion.div>
                <span className={cn("text-caption font-mono font-semibold uppercase tracking-[0.12em]", reached ? "text-foreground" : "text-tm-blue-gray/50")}>
                  {e.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
