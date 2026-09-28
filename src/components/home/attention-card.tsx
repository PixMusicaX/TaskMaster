import Link from "next/link";
import { AlertCircle, Brain, Check, Plus, RotateCw, TrendingUp, Users, Zap } from "lucide-react";
import { PremiumLoader } from "@/components/loader";
import { cn } from "@/lib/utils";
import WidgetCard from "./widget-card";
import { ReliefTypeIcon } from "./icons";

interface AttentionCardProps {
  charisma?: number;
  aiLoading: boolean;
  missingInfo: string[];
  prepTip: any;
  prepLoading: boolean;
  updatingPrep: boolean;
  onPrepToggle: () => void;
  onRegeneratePrep: () => void;
  smartMission: any;
  updatingSmart: boolean;
  onSmartToggle: () => void;
  onRegenerateSmart: () => void;
  relief: any;
  updatingRelief: Set<string>;
  onReliefToggle: (index: number) => void;
}

export default function AttentionCard(props: AttentionCardProps) {
  const { charisma, aiLoading, missingInfo, prepTip, prepLoading, updatingPrep, onPrepToggle, onRegeneratePrep, smartMission, updatingSmart, onSmartToggle, onRegenerateSmart, relief, updatingRelief, onReliefToggle } = props;

  return (
    <WidgetCard
      accent="yellow"
      title="Attention"
      subtitle={charisma !== undefined && (
        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 w-fit backdrop-blur-md">
          <Users size={12} className="text-tm-blue-gray" />
          <span className="text-caption font-black uppercase tracking-[0.15em] text-tm-blue-gray">Charisma: <span className="text-tm-yellow">{charisma} XP</span></span>
        </div>
      )}
      aside={
        <div className="flex flex-col items-end">
          <TrendingUp className="text-tm-yellow opacity-50 mb-1" size={24} />
          <span className="text-micro font-black text-tm-yellow/40 uppercase tracking-widest">Active Focus</span>
        </div>
      }
      loading={aiLoading}
      loadingMinHeight="min-h-[250px]"
      loadingContent={
        <div className="flex flex-col items-center gap-4">
          <PremiumLoader />
          <p className="text-caption font-black uppercase text-tm-yellow animate-pulse tracking-[0.2em]">Syncing Intelligence...</p>
        </div>
      }
      footerHref="/about"
      footerLabel="Visit Logs"
      delay={0.6}
      className="overflow-visible"
    >
      {missingInfo.length > 0 && (
        <div className="p-5 rounded-[1.5rem] bg-tm-orange-dark/10 border border-tm-orange-dark/30 space-y-4 relative overflow-hidden group/missing">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <AlertCircle size={40} className="text-tm-orange-dark" />
          </div>
          <p className="text-sm font-bold text-foreground/90">Temporal Anomaly Detected</p>
          <p className="text-xs text-tm-blue-gray leading-relaxed">You left some gaps in your journey <span className="text-tm-yellow">yesterday</span>. Mend them to restore flow:</p>
          <div className="flex flex-wrap gap-2">
            {missingInfo.map(item => (
              <span key={item} className="px-3 py-1 bg-tm-orange-dark/80 text-white text-tiny font-black uppercase rounded-lg shadow-lg">
                {item}
              </span>
            ))}
          </div>
          <Link
            href={missingInfo[0] === "Note" ? "/notes" : "/habits"}
            className="flex items-center justify-center gap-2 w-full py-3 bg-foreground/10 hover:bg-tm-yellow text-foreground hover:text-tm-purple-dark text-caption font-black uppercase rounded-xl transition-all border border-foreground/10"
          >
            Mend History <Plus size={14} />
          </Link>
        </div>
      )}

      {/* Preparation Tip Card */}
      {prepLoading ? (
        <div className="p-8 rounded-[1.25rem] bg-tm-purple-dark/5 border border-tm-purple-dark/10 flex flex-col items-center gap-3">
          <PremiumLoader />
          <p className="text-micro font-black uppercase text-tm-purple-dark tracking-widest animate-pulse">Calculating Strategy...</p>
        </div>
      ) : !prepTip ? (
        <div className="p-5 rounded-[1.25rem] bg-tm-orange-dark/10 border border-tm-orange-dark/30 flex flex-col items-center text-center gap-3 animate-in fade-in zoom-in duration-300">
          <AlertCircle className="text-tm-orange-dark" size={24} />
          <div className="space-y-1">
            <p className="text-xs font-bold text-foreground">Strategic Tip Offline</p>
            <p className="text-caption text-tm-blue-gray">AI was unable to formulate a strategy for today.</p>
          </div>
          <button
            onClick={onRegeneratePrep}
            className="px-6 py-2 bg-tm-orange-dark/20 hover:bg-tm-orange-dark/40 text-tm-orange-dark text-tiny font-black uppercase rounded-xl transition-all border border-tm-orange-dark/20 flex items-center gap-2"
          >
            <RotateCw size={12} /> Try Again
          </button>
        </div>
      ) : (
        <div
          onClick={updatingPrep ? undefined : onPrepToggle}
          className={cn(
            "group/prep p-4 rounded-[1.25rem] border transition-all cursor-pointer relative overflow-hidden",
            updatingPrep && "opacity-50 pointer-events-none",
            prepTip.completed
              ? "bg-tm-purple-dark/20 border-tm-purple-dark/30 dark:bg-tm-yellow/10 dark:border-tm-yellow/20 opacity-50 grayscale-[0.5]"
              : "bg-white/5 border-white/10 hover:border-tm-purple-dark/40 hover:bg-tm-purple-dark/[0.03] dark:hover:border-tm-yellow/40 dark:hover:bg-tm-yellow/[0.03] shadow-xl dark:hover:shadow-[0_0_20px_rgba(242,194,48,0.15)]"
          )}
        >
          <div className="absolute top-0 right-0 p-5 opacity-[0.03] group-hover/prep:opacity-[0.07] transition-opacity pointer-events-none">
            <Brain size={70} />
          </div>

          <div className="flex items-start gap-3 relative z-10">
            <div className={cn(
              "w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-all mt-0.5",
              prepTip.completed ? "bg-tm-purple-dark border-tm-purple-dark dark:bg-tm-yellow dark:border-tm-yellow shadow-[0_0_10px_rgba(45,27,51,0.4)] dark:shadow-[0_0_10px_rgba(242,194,48,0.4)]" : "bg-white/5 border-tm-purple-dark/20 dark:border-tm-yellow/20 group-hover/prep:border-tm-purple-dark/50 dark:group-hover/prep:border-tm-yellow/50"
            )}>
              {prepTip.completed ? <Check size={18} className="text-white dark:text-tm-purple-dark" /> : <Brain size={16} className="text-tm-purple-dark dark:text-tm-yellow" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-micro font-black uppercase text-tm-purple-dark dark:text-tm-yellow tracking-[0.2em]">Preparation Tip</span>
                <span className="px-1.5 py-0.5 bg-tm-yellow/10 rounded-lg text-micro font-black text-tm-yellow border border-tm-yellow/20 whitespace-nowrap">+{prepTip.xpReward} XP</span>
              </div>
              <h3 className={cn("text-base font-black text-foreground/90 leading-tight", prepTip.completed && "line-through opacity-50")}>
                {prepTip.title}
              </h3>
              {!prepTip.completed && prepTip.description && (
                <p className="text-xs text-tm-blue-gray leading-relaxed mt-1.5 italic opacity-80">
                  {prepTip.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Smart Mission Card */}
      {smartMission && (
        <div
          onClick={updatingSmart ? undefined : onSmartToggle}
          className={cn(
            "group/mission p-4 rounded-[1.25rem] border transition-all cursor-pointer relative overflow-hidden",
            updatingSmart && "opacity-50 pointer-events-none",
            smartMission.completed
              ? "bg-tm-yellow/10 border-tm-yellow/20 opacity-50 grayscale-[0.5]"
              : "bg-white/5 border-white/10 hover:border-tm-yellow/40 hover:bg-tm-yellow/[0.03] shadow-xl dark:hover:shadow-[0_0_20px_rgba(242,194,48,0.15)]"
          )}
        >
          <div className="absolute top-0 right-0 p-5 opacity-[0.03] group-hover/mission:opacity-[0.07] transition-opacity pointer-events-none">
            <Users size={70} />
          </div>

          <div className="flex items-start gap-3 relative z-10">
            <div className={cn(
              "w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-all mt-0.5",
              smartMission.completed ? "bg-tm-yellow border-tm-yellow shadow-[0_0_10px_rgba(242,194,48,0.4)]" : "bg-white/5 border-tm-yellow/20 group-hover/mission:border-tm-yellow/50"
            )}>
              {smartMission.completed ? <Check size={18} className="text-tm-purple-dark" /> : <Zap size={16} className="text-tm-yellow" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-micro font-black uppercase text-tm-yellow tracking-[0.2em]">Smart Mission</span>
                <div className="flex items-center gap-2">
                  {!smartMission.completed && (
                    <button
                      onClick={onRegenerateSmart}
                      className="text-micro font-black text-tm-yellow/50 hover:text-tm-yellow uppercase tracking-widest flex items-center gap-1 transition-all"
                    >
                      <RotateCw size={8} className={cn(aiLoading && "animate-spin")} /> Reload
                    </button>
                  )}
                  <span className="px-1.5 py-0.5 bg-tm-yellow/10 rounded-lg text-micro font-black text-tm-yellow border border-tm-yellow/20 whitespace-nowrap">
                    +{smartMission.xpReward} XP
                  </span>
                </div>
              </div>

              <h3 className={cn("text-base font-black text-foreground/90 leading-tight", smartMission.completed && "line-through opacity-50")}>
                {smartMission.title}
              </h3>

              {!smartMission.completed && smartMission.description && (
                <p className="text-xs text-tm-blue-gray leading-relaxed mt-1.5 italic opacity-80">
                  {smartMission.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Relief Primary Path Copy */}
      {relief && (
        <div
          onClick={updatingRelief.has(`${relief.id}-0`) ? undefined : () => onReliefToggle(0)}
          className={cn(
            "group/relief p-4 rounded-[1.25rem] border transition-all cursor-pointer relative overflow-hidden",
            updatingRelief.has(`${relief.id}-0`) && "opacity-50 pointer-events-none",
            relief.completed
              ? "bg-tm-blue-gray/10 border-tm-blue-gray/20 opacity-50 grayscale-[0.5]"
              : "bg-white/5 border-white/10 hover:border-tm-blue-gray/40 hover:bg-tm-blue-gray/[0.03] shadow-xl dark:hover:shadow-[0_0_20px_rgba(148,163,184,0.15)]"
          )}
        >
          <div className="absolute top-0 right-0 p-5 opacity-[0.03] group-hover/relief:opacity-[0.07] transition-opacity pointer-events-none">
            <ReliefTypeIcon type={relief.type} size={70} fallback />
          </div>

          <div className="flex items-start gap-3 relative z-10">
            <div className={cn(
              "w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-all mt-0.5",
              relief.completed ? "bg-tm-blue-gray border-tm-blue-gray shadow-[0_0_10px_rgba(148,163,184,0.4)]" : "bg-white/5 border-tm-blue-gray/20 group-hover/relief:border-tm-blue-gray/50"
            )}>
              {relief.completed
                ? <Check size={18} className="text-white" />
                : <ReliefTypeIcon type={relief.type} size={16} className="text-tm-blue-gray" fallback />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-micro font-black uppercase text-tm-blue-gray tracking-[0.2em]">Relief Recommendation</span>
                <span className="px-1.5 py-0.5 bg-tm-yellow/10 rounded-lg text-micro font-black text-tm-yellow border border-tm-yellow/20 whitespace-nowrap">
                  +{relief.xpReward} XP
                </span>
              </div>

              <h3 className={cn("text-base font-black text-foreground/90 leading-tight", relief.completed && "line-through opacity-50")}>
                {relief.title}
              </h3>

              {!relief.completed && relief.description && (
                <p className="text-xs text-tm-blue-gray leading-relaxed mt-1.5 italic opacity-80">
                  {relief.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
