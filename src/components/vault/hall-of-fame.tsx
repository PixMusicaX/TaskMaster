"use client";

import { Search, Trophy } from "lucide-react";
import GlassCard from "@/components/glass-card";
import { RankCrest } from "@/lib/rank-icons";
import { eraAt, seasonEraLabel } from "@/lib/eras";
import { cn } from "@/lib/utils";
import AnimatedNumber from "@/components/progress/animated-number";
import type { TimelineSeason } from "@/lib/types";
import VaultSection from "./vault-section";

interface HallOfFameProps {
  seasons: TimelineSeason[];
  loading: boolean;
  onViewAll: () => void;
}

// Most recent seasons, each with its crest and era ("III+" when it earned the next era up)
export default function HallOfFame({ seasons, loading, onViewAll }: HallOfFameProps) {
  const best = seasons.reduce((max, s) => Math.max(max, s.xp), 0);

  return (
    <VaultSection icon={Trophy} iconClassName="text-tm-yellow" title="Hall of Fame">
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="tm-skeleton h-48 rounded-3xl" />)}
        </div>
      ) : seasons.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {seasons.slice(0, 3).map((season, idx) => {
              const era = eraAt(season.eraStart);
              const isBest = season.xp === best;
              return (
                <GlassCard key={`${season.year}-${season.monthName}`} delay={idx * 0.1} className={cn("p-6 group", isBest && "border-tm-yellow/40")}>
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h4 className="text-xl font-bold text-foreground leading-tight">{season.monthName}</h4>
                      <p className="text-xs font-mono font-semibold text-tm-blue-gray uppercase tracking-[0.12em]">{season.year}</p>
                    </div>
                    <div className="relative w-12 h-12 rounded-2xl bg-tm-purple-dark text-tm-yellow flex items-center justify-center group-hover:scale-110 transition-transform">
                      <RankCrest rank={season.title} size={22} strokeWidth={1.75} />
                      {isBest && (
                        <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-tm-yellow text-tm-purple-dark text-micro font-mono font-semibold uppercase tracking-[0.12em]">Best</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <span className="text-caption font-mono font-semibold uppercase text-tm-blue-gray tracking-[0.12em]">Final score</span>
                    <span className="text-2xl font-display font-bold text-foreground">
                      <AnimatedNumber value={season.xp} /> <span className="text-xs text-tm-blue-gray">XP</span>
                    </span>
                  </div>
                  <div className="h-1 mt-2 rounded-full bg-tm-blue-gray/10 overflow-hidden">
                    <div className="h-full bg-tm-yellow rounded-full" style={{ width: `${best ? (season.xp / best) * 100 : 0}%` }} />
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <span className="px-2 py-1 bg-tm-yellow/10 rounded text-micro font-mono font-semibold uppercase tracking-[0.12em] text-tm-yellow border border-tm-yellow/20">
                      Lvl {season.level}
                    </span>
                    <span className="px-2 py-1 bg-tm-blue-gray/10 rounded text-micro font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray border border-tm-blue-gray/20">
                      {season.title}
                    </span>
                    <span
                      className={cn("ml-auto font-serif font-bold text-sm", season.eraUp ? "text-tm-yellow" : "text-tm-blue-gray")}
                      title={season.eraUp ? `Era of ${era.name}, with the next era earned` : `Era of ${era.name}`}
                    >
                      {seasonEraLabel(season)}
                    </span>
                  </div>
                </GlassCard>
              );
            })}
          </div>
          <ViewAllButton onClick={onViewAll} label="View Full Hall of Fame" />
        </div>
      ) : (
        <GlassCard className="p-12 text-center">
          <Trophy size={48} className="mx-auto text-tm-blue-gray/20 mb-4" />
          <p className="text-tm-blue-gray font-medium">Your legacy begins today. Complete your first season to enter the Hall of Fame.</p>
        </GlassCard>
      )}
    </VaultSection>
  );
}

export function ViewAllButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div className="flex justify-center">
      <button
        onClick={onClick}
        className="px-6 py-3 bg-white/5 border border-tm-blue-gray/20 rounded-2xl text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray hover:bg-tm-yellow/10 hover:text-tm-yellow active:scale-95 transition-all flex items-center gap-3 group"
      >
        <Search size={16} className="group-hover:scale-110 transition-transform" />
        {label}
      </button>
    </div>
  );
}
