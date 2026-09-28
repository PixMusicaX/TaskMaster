import { Check, Zap } from "lucide-react";
import HabitIconRender from "@/components/HabitIconRender";
import { XP_VALUES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import WidgetCard from "./widget-card";

function getFrequencyLabel(freq: number[]) {
  if (!freq || freq.length === 0) return "Daily";
  if (freq.length === 7) return "Daily";
  if (freq.length === 6 && !freq.includes(0)) return "Weekdays + Sat";
  if (freq.length === 5 && !freq.includes(0) && !freq.includes(6)) return "Weekdays";
  if (freq.length === 2 && freq.includes(0) && freq.includes(6)) return "Weekends";
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return freq.map(f => labels[f]).join(", ");
}

interface DailyMissionsCardProps {
  habits: any[];
  loading: boolean;
  todayStr: string;
  weekday: number;
  updating: Set<string>;
  onToggle: (habitId: string, currentStatus: boolean) => void;
}

export default function DailyMissionsCard({ habits, loading, todayStr, weekday, updating, onToggle }: DailyMissionsCardProps) {
  return (
    <WidgetCard
      accent="yellow"
      title="Daily Missions"
      subtitle="Skill Development"
      aside={<Zap className="text-tm-yellow opacity-50" size={24} />}
      headerClassName="min-h-[60px]"
      loading={loading}
      footerHref="/habits"
      footerLabel="Configure Skills"
      delay={0.2}
    >
      {habits.filter(h => !h.frequency || h.frequency.includes(weekday)).map(habit => {
        const isDone = habit.logs.some((l: any) => l.date === todayStr && l.completed);
        return (
          <button
            key={habit.id}
            onClick={() => onToggle(habit.id, isDone)}
            disabled={updating.has(habit.id)}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-[1.5rem] border transition-all text-left group/card",
              updating.has(habit.id) && "opacity-50 pointer-events-none",
              isDone
                ? "bg-tm-yellow/10 border-tm-yellow/20 opacity-50"
                : "bg-white/5 border-white/10 hover:border-tm-yellow/40 hover:bg-tm-yellow/[0.03] shadow-lg"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all",
              isDone ? "bg-tm-yellow border-tm-yellow" : "border-tm-blue-gray/30 group-hover/card:border-tm-yellow/50"
            )}>
              {isDone ? <Check size={16} className="text-tm-purple-dark" /> : <HabitIconRender icon={habit.icon} className="text-tm-yellow/50 group-hover/card:text-tm-yellow" size={14} />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <p className={cn("font-black text-sm", isDone ? "text-tm-yellow line-through opacity-50" : "text-foreground/90")}>
                  {habit.name}
                </p>
                <span className="text-tiny font-black text-tm-yellow bg-tm-yellow/10 px-1.5 py-0.5 rounded border border-tm-yellow/20">+{XP_VALUES.HABIT_CHECK} XP</span>
              </div>
              <p className="text-caption font-black text-tm-blue-gray/60 uppercase tracking-widest mt-0.5">{getFrequencyLabel(habit.frequency)}</p>
            </div>
          </button>
        );
      })}
    </WidgetCard>
  );
}
