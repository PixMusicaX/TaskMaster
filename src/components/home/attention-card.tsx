import Link from "next/link";
import { AlertCircle, Brain, Plus, RotateCw, TrendingUp, Users, Zap } from "lucide-react";
import CompletionCheck from "@/components/ui/completion-check";
import StrikeText from "@/components/ui/strike-text";
import { SkeletonRows } from "@/components/loader";
import { cn } from "@/lib/utils";
import type { PrepTipRow, Relief, SmartMissionRow } from "@/lib/types";
import WidgetCard from "./widget-card";
import { ReliefTypeIcon } from "./icons";

interface AttentionCardProps {
  charisma?: number;
  aiLoading: boolean;
  missingInfo: string[];
  prepTip: PrepTipRow | null;
  prepLoading: boolean;
  updatingPrep: boolean;
  onPrepToggle: () => void;
  onRegeneratePrep: () => void;
  smartMission: SmartMissionRow | null;
  updatingSmart: boolean;
  onSmartToggle: () => void;
  onRegenerateSmart: () => void;
  relief: Relief | null;
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
          <span className="text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray">Charisma: <span className="text-tm-yellow">{charisma} XP</span></span>
        </div>
      )}
      aside={
        <div className="flex flex-col items-end">
          <TrendingUp className="text-tm-yellow opacity-50 mb-1" size={24} />
          <span className="text-micro font-mono font-semibold text-tm-yellow/40 uppercase tracking-[0.12em]">Active Focus</span>
        </div>
      }
      loading={aiLoading}
      loadingMinHeight="min-h-[250px]"
      loadingContent={<SkeletonRows rows={3} caption="Syncing Intelligence..." />}
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
              <span key={item} className="px-3 py-1 bg-tm-orange-dark/80 text-white text-tiny font-mono font-semibold uppercase rounded-lg shadow-lg tracking-[0.12em]">
                {item}
              </span>
            ))}
          </div>
          <Link
            href={missingInfo[0] === "Note" ? "/notes" : "/habits"}
            className="flex items-center justify-center gap-2 w-full py-3 bg-foreground/10 hover:bg-tm-yellow text-foreground hover:text-tm-purple-dark text-caption font-mono font-semibold uppercase rounded-xl transition-all border border-foreground/10 tracking-[0.12em]"
          >
            Mend History <Plus size={14} />
          </Link>
        </div>
      )}

      {/* Preparation Tip Card */}
      {prepLoading ? (
        <SkeletonRows rows={1} caption="Calculating Strategy..." />
      ) : !prepTip ? (
        <div className="p-5 rounded-[1.25rem] bg-tm-orange-dark/10 border border-tm-orange-dark/30 flex flex-col items-center text-center gap-3 animate-in fade-in zoom-in duration-300">
          <AlertCircle className="text-tm-orange-dark" size={24} />
          <div className="space-y-1">
            <p className="text-xs font-bold text-foreground">Strategic Tip Offline</p>
            <p className="text-caption text-tm-blue-gray">AI was unable to formulate a strategy for today.</p>
          </div>
          <button
            onClick={onRegeneratePrep}
            className="px-6 py-2 bg-tm-orange-dark/20 hover:bg-tm-orange-dark/40 text-tm-orange-dark text-tiny font-mono font-semibold uppercase rounded-xl transition-all border border-tm-orange-dark/20 flex items-center gap-2 tracking-[0.12em]"
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
            <CompletionCheck
              done={prepTip.completed}
              className={cn(
                "w-9 h-9 rounded-xl border-2 transition-colors mt-0.5",
                prepTip.completed ? "bg-tm-purple-dark border-tm-purple-dark dark:bg-tm-yellow dark:border-tm-yellow shadow-[0_0_10px_rgba(45,27,51,0.4)] dark:shadow-[0_0_10px_rgba(242,194,48,0.4)]" : "bg-white/5 border-tm-purple-dark/20 dark:border-tm-yellow/20 group-hover/prep:border-tm-purple-dark/50 dark:group-hover/prep:border-tm-yellow/50"
              )}
              checkSize={18}
              checkClassName="text-white dark:text-tm-purple-dark"
              idle={<Brain size={16} className="text-tm-purple-dark dark:text-tm-yellow" />}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-micro font-mono font-semibold uppercase text-tm-purple-dark dark:text-tm-yellow tracking-[0.12em]">Preparation Tip</span>
                <span className="px-1.5 py-0.5 bg-tm-yellow/10 rounded-lg text-micro font-mono font-semibold text-tm-yellow border border-tm-yellow/20 whitespace-nowrap">+{prepTip.xpReward} XP</span>
              </div>
              <h3 className="text-base font-semibold text-foreground/90 leading-tight">
                <StrikeText done={prepTip.completed}>{prepTip.title}</StrikeText>
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
            <CompletionCheck
              done={smartMission.completed}
              className={cn(
                "w-9 h-9 rounded-xl border-2 transition-colors mt-0.5",
                smartMission.completed ? "bg-tm-yellow border-tm-yellow shadow-[0_0_10px_rgba(242,194,48,0.4)]" : "bg-white/5 border-tm-yellow/20 group-hover/mission:border-tm-yellow/50"
              )}
              checkSize={18}
              checkClassName="text-tm-purple-dark"
              idle={<Zap size={16} className="text-tm-yellow" />}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-micro font-mono font-semibold uppercase text-tm-yellow tracking-[0.12em]">Smart Mission</span>
                <div className="flex items-center gap-2">
                  {!smartMission.completed && (
                    <button
                      onClick={onRegenerateSmart}
                      className="text-micro font-mono font-semibold text-tm-yellow/50 hover:text-tm-yellow uppercase tracking-[0.12em] flex items-center gap-1 transition-all"
                    >
                      <RotateCw size={8} className={cn(aiLoading && "animate-spin")} /> Reload
                    </button>
                  )}
                  <span className="px-1.5 py-0.5 bg-tm-yellow/10 rounded-lg text-micro font-mono font-semibold text-tm-yellow border border-tm-yellow/20 whitespace-nowrap">
                    +{smartMission.xpReward} XP
                  </span>
                </div>
              </div>

              <h3 className="text-base font-semibold text-foreground/90 leading-tight">
                <StrikeText done={smartMission.completed}>{smartMission.title}</StrikeText>
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
            <CompletionCheck
              done={relief.completed}
              className={cn(
                "w-9 h-9 rounded-xl border-2 transition-colors mt-0.5",
                relief.completed ? "bg-tm-blue-gray border-tm-blue-gray shadow-[0_0_10px_rgba(148,163,184,0.4)]" : "bg-white/5 border-tm-blue-gray/20 group-hover/relief:border-tm-blue-gray/50"
              )}
              checkSize={18}
              checkClassName="text-white"
              idle={<ReliefTypeIcon type={relief.type} size={16} className="text-tm-blue-gray" fallback />}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-micro font-mono font-semibold uppercase text-tm-blue-gray tracking-[0.12em]">Relief Recommendation</span>
                <span className="px-1.5 py-0.5 bg-tm-yellow/10 rounded-lg text-micro font-mono font-semibold text-tm-yellow border border-tm-yellow/20 whitespace-nowrap">
                  +{relief.xpReward} XP
                </span>
              </div>

              <h3 className="text-base font-semibold text-foreground/90 leading-tight">
                <StrikeText done={relief.completed}>{relief.title}</StrikeText>
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
