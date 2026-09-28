import { motion } from "framer-motion";
import { AlertCircle, Clock as ClockIcon } from "lucide-react";
import CompletionCheck from "@/components/ui/completion-check";
import StrikeText from "@/components/ui/strike-text";
import { format, isSameDay } from "date-fns";
import { XP_VALUES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import WidgetCard from "./widget-card";
import { TaskIcon } from "./icons";

function questXP(task: any) {
  if (task.type === "task") return XP_VALUES.TASK;
  if (task.tier === "epic") return XP_VALUES.QUEST_EPIC;
  if (task.tier === "main") return XP_VALUES.QUEST_MAIN;
  return XP_VALUES.QUEST_SIDE;
}

interface ActiveQuestsCardProps {
  tasks: any[];
  loading: boolean;
  today: Date;
  updating: Set<string>;
  onToggle: (id: string, current: boolean) => void;
}

export default function ActiveQuestsCard({ tasks, loading, today, updating, onToggle }: ActiveQuestsCardProps) {
  return (
    <WidgetCard
      accent="orange"
      title="Active Quests"
      subtitle="Tactical Objectives"
      aside={<AlertCircle className="text-tm-orange-light opacity-50" size={24} />}
      headerClassName="min-h-[60px]"
      loading={loading}
      footerHref="/calendar"
      footerLabel="Quest Board"
      delay={0.4}
    >
      {tasks.filter(t => t.type !== "special_day").map(task => {
        const isEvent = task.type === "event";
        return (
          <motion.button
            key={task.id}
            onClick={() => !isEvent && onToggle(task.id, task.completed)}
            disabled={updating.has(task.id)}
            whileTap={isEvent ? undefined : { scale: 0.97 }}
            className={cn(
              "w-full flex flex-col gap-2 p-4 rounded-[1.5rem] border transition-all duration-500 text-left group/card",
              updating.has(task.id) && "pointer-events-none",
              task.completed && !isEvent
                ? "bg-tm-blue-gray/5 border-transparent opacity-50 grayscale"
                : cn(
                  "shadow-lg transition-all",
                  task.tier === "epic" ? "bg-tm-orange-dark/5 border-tm-orange-dark/20 hover:border-tm-orange-dark/40 hover:bg-tm-orange-dark/[0.03]" :
                    task.tier === "main" ? "bg-tm-orange-light/5 border-tm-orange-light/20 hover:border-tm-orange-light/40 hover:bg-tm-orange-light/[0.03]" :
                      "bg-tm-yellow/5 border-tm-yellow/20 hover:border-tm-yellow/40 hover:bg-tm-yellow/[0.03]"
                ),
              isEvent && "cursor-default"
            )}
          >
            <div className="flex items-start gap-4">
              <CompletionCheck
                done={task.completed}
                className={cn(
                  "w-8 h-8 rounded-xl border-2 transition-colors mt-0.5",
                  task.completed ? "bg-tm-blue-gray border-tm-blue-gray" : "bg-white/5 border-tm-orange-light/20 group-hover/card:border-tm-orange-light/50"
                )}
                checkClassName="text-white"
                idle={isEvent ? <ClockIcon size={14} className="text-tm-orange-light" /> : <TaskIcon title={task.title} className="text-tm-orange-light/50 group-hover/card:text-tm-orange-light" size={14} />}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className={cn(
                    "text-tiny font-black uppercase tracking-widest",
                    task.type === "task" ? "text-tm-blue-gray" :
                      task.tier === "epic" ? "text-tm-orange-dark" :
                        task.tier === "main" ? "text-tm-orange-light" :
                          "text-tm-yellow"
                  )}>
                    {task.type === "event" ? `${task.tier} Quest` : "Objective"}
                  </p>
                  <span className="text-tiny font-black text-tm-orange-light bg-tm-orange-light/10 px-1.5 py-0.5 rounded border border-tm-orange-light/20">+{questXP(task)} XP</span>
                </div>
                <h4 className="text-sm font-black text-foreground/90 truncate"><StrikeText className="truncate align-bottom" done={task.completed && !isEvent}>{task.title}</StrikeText></h4>
                <div className="flex items-center gap-2 mt-1 text-tiny font-bold text-tm-blue-gray uppercase tracking-tighter">
                  {task.startTime && (
                    <>
                      <ClockIcon size={10} />
                      <span>{isSameDay(new Date(task.startTime), today) ? format(new Date(task.startTime), "HH:mm") : format(new Date(task.startTime), "MMM d, HH:mm")}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.button>
        );
      })}
    </WidgetCard>
  );
}
