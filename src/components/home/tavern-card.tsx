import { CloudSun, Coffee, MapPin, RotateCw, Sparkles } from "lucide-react";
import CompletionCheck from "@/components/ui/completion-check";
import StrikeText from "@/components/ui/strike-text";
import { SkeletonRows } from "@/components/loader";
import { formatReliefTemp } from "@/lib/weather";
import { cn } from "@/lib/utils";
import type { Relief, ReliefAlternative } from "@/lib/types";
import InsightCard from "./insight-card";
import { ReliefTypeIcon } from "./icons";

interface TavernCardProps {
  relief: Relief | null;
  loading: boolean;
  updating: Set<string>;
  onToggle: (index: number) => void;
  onRegenerate: () => void;
}

export default function TavernCard({ relief, loading, updating, onToggle, onRegenerate }: TavernCardProps) {
  const reward = relief?.xpReward === 5 ? 10 : relief?.xpReward;
  const canRegenerate = !!relief && !relief.completed;

  return (
    <InsightCard
      icon={Coffee}
      iconClassName="text-tm-blue-gray"
      title="Tavern"
      subtitle={relief && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption font-mono font-semibold uppercase text-tm-blue-gray/60 tracking-[0.12em]">
          <span className={cn("flex items-center gap-1.5", relief.isCached ? "text-tm-orange-light/80" : "")}><MapPin size={12} className={relief.isCached ? "text-tm-orange-light" : "text-tm-yellow/40"} /> {relief.location}</span>
          <span className="w-1 h-1 rounded-full bg-white/10" />
          <span className="flex items-center gap-1.5"><CloudSun size={12} className="text-tm-yellow/40" /> {formatReliefTemp(relief.temp)}°C {relief.weather}</span>
        </div>
      )}
      aside={canRegenerate && (
        // Phones get a full-width button at the bottom instead (below)
        <button
          onClick={onRegenerate}
          className="hidden sm:flex w-10 h-10 shrink-0 items-center justify-center bg-white/5 rounded-2xl border border-white/10 text-tm-blue-gray hover:text-tm-yellow hover:border-tm-yellow/50 transition-all shadow-lg active:scale-95"
          title="Regenerate Hub"
        >
          <RotateCw size={18} className={cn(loading && "animate-spin")} />
        </button>
      )}
      delay={0.8}
      className="border-tm-blue-gray/10 bg-white/5"
    >
      <div className={cn("flex-1 flex flex-col justify-center relative z-10", loading && "items-center")}>
        {loading ? (
          <SkeletonRows rows={3} caption="Scanning for relief..." />
        ) : relief ? (
          <div className="flex flex-col gap-6">
            {/* Primary Suggestion */}
            <div className="relative">
              <div className="absolute -top-3 left-4 px-2 bg-tm-purple-dark border border-tm-yellow/20 rounded text-micro font-mono font-semibold uppercase text-tm-yellow tracking-[0.12em] z-20">
                Primary Path
              </div>
              <button
                onClick={updating.has(`${relief.id}-0`) ? undefined : () => onToggle(0)}
                disabled={updating.has(`${relief.id}-0`)}
                className={cn(
                  "w-full text-left p-6 rounded-[2rem] border transition-all relative overflow-hidden group/card shadow-2xl",
                  updating.has(`${relief.id}-0`) && "opacity-50 pointer-events-none",
                  relief.completed
                    ? "bg-tm-yellow/10 border-tm-yellow/40 shadow-inner opacity-50 grayscale-[0.5]"
                    : "bg-white/5 border-white/10 hover:border-tm-yellow/30 hover:bg-white/10"
                )}
              >
                <div className="flex items-start gap-5">
                  <CompletionCheck
                    done={relief.completed}
                    className={cn(
                      "w-8 h-8 rounded-2xl border-2 transition-colors mt-1 shadow-lg",
                      relief.completed ? "bg-tm-yellow border-tm-yellow" : "bg-white/5 border-tm-blue-gray/30 group-hover/card:border-tm-yellow/50"
                    )}
                    checkSize={18}
                    checkClassName="text-tm-purple-dark"
                    idle={<Sparkles size={14} className="text-tm-yellow" />}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-caption font-mono font-semibold uppercase text-tm-yellow tracking-[0.12em] flex items-center gap-2">
                        <ReliefTypeIcon type={relief.type} size={12} />
                        {relief.type || 'Suggestion'}
                      </span>
                      <span className="text-xs font-black text-tm-yellow bg-tm-yellow/10 px-2 py-0.5 rounded-lg border border-tm-yellow/20">+{reward} XP</span>
                    </div>
                    <h4 className="text-xl font-bold leading-tight tracking-tight">
                      <StrikeText done={relief.completed}>{relief.title}</StrikeText>
                    </h4>
                  </div>
                </div>
              </button>
            </div>

            {/* Alternatives Section */}
            {Array.isArray(relief.alternatives) && relief.alternatives.length > 0 && (
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-4">
                  <p className="text-caption font-mono font-semibold uppercase text-tm-blue-gray/60 tracking-[0.12em] shrink-0">Alternative Channels</p>
                  <div className="h-px flex-1 bg-white/[0.03]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(relief.alternatives as ReliefAlternative[]).map((alt, i) => {
                    const key = `${relief.id}-${i + 1}`;
                    const isAltCompleted = i === 0 ? relief.alt1Completed : relief.alt2Completed;
                    return (
                      <button
                        key={i}
                        onClick={updating.has(key) ? undefined : () => onToggle(i + 1)}
                        disabled={updating.has(key)}
                        className={cn(
                          "flex flex-col gap-3 p-5 rounded-[1.5rem] border transition-all text-left group/alt relative overflow-hidden",
                          updating.has(key) && "opacity-50 pointer-events-none",
                          isAltCompleted
                            ? "bg-tm-yellow/5 border-tm-yellow/10 opacity-40 grayscale"
                            : "bg-white/[0.02] border-white/5 hover:border-tm-yellow/20 hover:bg-white/[0.05] shadow-lg"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3 relative z-10">
                          <CompletionCheck
                            done={isAltCompleted}
                            className={cn(
                              "w-8 h-8 rounded-xl border transition-colors",
                              isAltCompleted ? "bg-tm-yellow border-tm-yellow" : "bg-white/5 border-tm-blue-gray/20 group-hover/alt:border-tm-yellow/40"
                            )}
                            checkClassName="text-tm-purple-dark"
                            idle={<ReliefTypeIcon type={alt.type} size={14} className="text-tm-blue-gray group-hover/alt:text-tm-yellow" />}
                          />
                          <span className="text-tiny font-mono font-semibold text-tm-yellow bg-tm-yellow/10 px-2 py-0.5 rounded-lg border border-tm-yellow/10">+{reward} XP</span>
                        </div>
                        <div className="relative z-10">
                          <span className="text-micro font-mono font-semibold uppercase text-tm-blue-gray/70 tracking-[0.12em] block mb-0.5">{alt.type}</span>
                          <h5 className="text-sm font-semibold leading-snug line-clamp-2"><StrikeText done={isAltCompleted}>{alt.title}</StrikeText></h5>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 opacity-50">
            <p className="text-caption font-mono font-semibold uppercase text-tm-blue-gray animate-pulse tracking-[0.12em]">Syncing Hub...</p>
          </div>
        )}
      </div>

      {canRegenerate && (
        <button
          onClick={onRegenerate}
          disabled={loading}
          className="sm:hidden relative z-10 w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-tm-blue-gray/5 border border-tm-blue-gray/15 text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray active:scale-[0.98] transition disabled:opacity-50"
        >
          <RotateCw size={14} className={cn(loading && "animate-spin")} />
          {loading ? "Finding new suggestions..." : "New suggestions"}
        </button>
      )}
    </InsightCard>
  );
}
