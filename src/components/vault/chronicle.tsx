"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { Brain, Heart, ScrollText, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPRING } from "@/lib/motion";
import GlassCard from "@/components/glass-card";
import { SkeletonRows } from "@/components/loader";
import CompletionCheck from "@/components/ui/completion-check";
import { ReliefTypeIcon } from "@/components/home/icons";
import type { PrepTipRow, ReliefRow, SmartMissionRow } from "@/lib/types";
import VaultSection from "./vault-section";
import { ViewAllButton } from "./hall-of-fame";

export type ChronicleKind = "quests" | "prep" | "relief";

interface ChronicleProps {
  missions: SmartMissionRow[];
  preps: PrepTipRow[];
  reliefs: ReliefRow[];
  loading: boolean;
  onToggle: (kind: ChronicleKind, id: string) => void;
  onViewAll: (kind: ChronicleKind) => void;
}

const TABS: { id: ChronicleKind; label: string; icon: typeof Zap; empty: string; viewAll: string }[] = [
  { id: "quests", label: "Quests", icon: Zap, empty: "Your quest history is empty. Check your Attention widget on the home page!", viewAll: "View All Quests" },
  { id: "prep", label: "Prep", icon: Brain, empty: "No strategic preparations logged yet. Check your Attention widget!", viewAll: "View All Strategies" },
  { id: "relief", label: "Relief", icon: Heart, empty: "No relief recommendations logged yet. Take a break today!", viewAll: "View Full Relief Log" },
];

// A log row normalized across the three sources
interface Entry {
  id: string;
  title: string;
  date: string;
  description: string | null;
  done: boolean;
  xp: number;
  idle: React.ReactNode;
  // Relief rows: main + two alternatives
  parts?: boolean[];
  location?: string | null;
}

function toEntries(tab: ChronicleKind, missions: SmartMissionRow[], preps: PrepTipRow[], reliefs: ReliefRow[]): Entry[] {
  if (tab === "quests") {
    return missions.map(m => ({ id: m.id, title: m.title, date: m.date, description: m.description, done: m.completed, xp: m.xpReward, idle: <Zap size={18} /> }));
  }
  if (tab === "prep") {
    return preps.map(p => ({ id: p.id, title: p.title, date: p.date, description: p.description, done: p.completed, xp: p.xpReward, idle: <Brain size={18} /> }));
  }
  return reliefs.map(r => {
    const parts = [r.completed, r.alt1Completed, r.alt2Completed];
    const doneCount = parts.filter(Boolean).length;
    return {
      id: r.id, title: r.title, date: r.date, description: r.description,
      done: doneCount > 0, xp: doneCount * r.xpReward,
      idle: <ReliefTypeIcon type={r.type} size={18} fallback />,
      parts, location: r.location,
    };
  });
}

// Smart quests, prep tips and relief picks from the past year, one tab at a time
export default function Chronicle({ missions, preps, reliefs, loading, onToggle, onViewAll }: ChronicleProps) {
  const [tab, setTab] = useState<ChronicleKind>("quests");
  const current = TABS.find(t => t.id === tab)!;
  const items = toEntries(tab, missions, preps, reliefs);

  return (
    <VaultSection icon={ScrollText} iconClassName="text-tm-orange-light" title="Chronicle">
      <div className="flex p-1 rounded-2xl bg-tm-blue-gray/5 border border-tm-blue-gray/10 w-full sm:w-fit" role="tablist">
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "relative flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-caption font-mono font-semibold uppercase tracking-[0.12em] transition-colors",
              tab === t.id ? "text-tm-purple-dark" : "text-tm-blue-gray hover:text-foreground"
            )}
          >
            {tab === t.id && (
              <motion.span layoutId="chronicle-tab" className="absolute inset-0 rounded-xl bg-tm-yellow shadow-md" transition={SPRING.bubble} />
            )}
            <t.icon size={14} className="relative" />
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonRows rows={3} />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {items.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <current.icon size={48} className="mx-auto text-tm-blue-gray/20 mb-4" />
                <p className="text-tm-blue-gray font-medium">{current.empty}</p>
              </GlassCard>
            ) : (
              <>
                <div className="space-y-3">
                  {items.slice(0, 5).map((item, idx) => {
                    const { done, xp, idle } = item;

                    return (
                      <motion.button
                        key={item.id}
                        onClick={() => onToggle(tab, item.id)}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full text-left flex items-center gap-4 p-4 rounded-2xl border border-tm-blue-gray/10 bg-white/40 dark:bg-white/5 hover:border-tm-yellow/40 transition-colors"
                        aria-pressed={done}
                      >
                        <CompletionCheck
                          done={done}
                          className={cn(
                            "w-10 h-10 rounded-xl transition-colors",
                            done ? "bg-tm-yellow/20 text-tm-yellow" : "bg-tm-blue-gray/10 text-tm-blue-gray"
                          )}
                          checkSize={18}
                          checkClassName="text-tm-yellow"
                          idle={idle}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold text-sm leading-tight text-foreground truncate">{item.title}</h4>
                            <span className="text-caption font-mono font-semibold text-tm-blue-gray uppercase shrink-0 tracking-[0.12em]">{format(new Date(item.date), "MMM d")}</span>
                          </div>
                          {item.parts ? (
                            <div className="flex items-center gap-3 mt-1.5">
                              {item.parts.map((d, i) => (
                                <span key={i} className={cn("flex items-center gap-1.5 text-micro font-mono font-semibold uppercase tracking-[0.12em]", d ? "text-tm-yellow" : "text-tm-blue-gray/50")}>
                                  <span className={cn("w-1.5 h-1.5 rounded-full", d ? "bg-tm-yellow" : "bg-tm-blue-gray/20")} />
                                  {i === 0 ? "Main" : `Alt ${i}`}
                                </span>
                              ))}
                              {item.location && <span className="ml-auto text-micro font-mono font-semibold uppercase text-tm-blue-gray/60 truncate tracking-[0.12em]">{item.location}</span>}
                            </div>
                          ) : (
                            item.description && <p className="text-xs text-tm-blue-gray/90 line-clamp-1 mt-0.5 italic">{item.description}</p>
                          )}
                        </div>
                        <AnimatePresence>
                          {done && xp > 0 && (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.6 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.6 }}
                              className="text-caption font-black text-tm-yellow bg-tm-yellow/10 px-2 py-1 rounded-lg border border-tm-yellow/20 shrink-0"
                            >
                              +{xp} XP
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    );
                  })}
                </div>
                <ViewAllButton onClick={() => onViewAll(tab)} label={current.viewAll} />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </VaultSection>
  );
}
