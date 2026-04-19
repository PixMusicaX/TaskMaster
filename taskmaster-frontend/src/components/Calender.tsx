"use client";
import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, CheckCircle2, Calendar as CalendarIcon, NotebookPen } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DaySummary {
  target_date: string;
  task_count: number;
  event_count: number;
  has_diary: boolean;
}

interface CalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export default function Calendar({ selectedDate, onDateSelect }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [summaries, setSummaries] = useState<Record<string, DaySummary>>({});

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  useEffect(() => {
    fetchSummaries();
  }, [currentMonth]);

  const fetchSummaries = async () => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const res = await fetch(`http://localhost:5059/calendar/${year}/${month}`);
      const data = await res.json();
      const summaryMap: Record<string, DaySummary> = {};
      data.days.forEach((day: DaySummary) => {
        summaryMap[day.target_date] = day;
      });
      setSummaries(summaryMap);
    } catch (err) {
      console.error("Failed to fetch summaries", err);
    }
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <div className="w-full glass rounded-3xl p-6 shadow-2xl">
      <div className="flex justify-between items-center mb-8 px-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground/90">
          {format(monthStart, "MMMM yyyy")}
        </h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-95">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-95">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="h-10 flex items-center justify-center text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
            {d}
          </div>
        ))}

        {calendarDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const summary = summaries[dateStr];
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, monthStart);

          return (
            <div 
              key={day.toString()} 
              onClick={() => onDateSelect(day)}
              className={cn(
                "relative group h-16 sm:h-20 p-2 rounded-2xl transition-all cursor-pointer border border-transparent",
                isSelected ? "bg-primary text-primary-foreground shadow-lg scale-105 z-10" : "hover:bg-white/5 hover:border-white/10",
                !isCurrentMonth && "opacity-20 pointer-events-none"
              )}
            >
              <span className={cn(
                "text-sm font-medium",
                isSelected ? "text-primary-foreground" : "text-foreground/70"
              )}>
                {format(day, "d")}
              </span>

              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                {summary && summary.task_count > 0 && (
                  <div className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-primary-foreground" : "bg-emerald-400")} />
                )}
                {summary && summary.event_count > 0 && (
                  <div className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-primary-foreground" : "bg-rose-400")} />
                )}
                {summary && summary.has_diary && (
                  <div className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-primary-foreground" : "bg-indigo-400")} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}