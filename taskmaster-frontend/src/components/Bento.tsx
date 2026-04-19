"use client";
import { CheckCircle2, Calendar, Smile, AlertCircle, TrendingUp } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Stats {
  pending_tasks: number;
  completed_tasks: number;
  events_today: number;
  todays_mood: number | null;
}

export default function Bento({ stats }: { stats: Stats }) {
  const moodLabels = ["Rough", "Okay", "Great"];
  const moodIcons = [AlertCircle, Smile, Smile]; // Simplified

  return (
    <div className="grid gap-6 lg:grid-cols-3 lg:grid-rows-2 w-full max-w-6xl mx-auto">
      
      {/* CARD 1: Task Productivity */}
      <div className="relative lg:row-span-2 group">
        <div className="absolute inset-px rounded-[2rem] bg-white/5 backdrop-blur-2xl ring-1 ring-white/10 group-hover:ring-white/20 transition-all" />
        <div className="relative p-10 flex flex-col h-full">
          <TrendingUp className="w-10 h-10 text-emerald-400 mb-6" />
          <p className="text-2xl font-bold text-white mb-2">Task Productivity</p>
          <p className="text-muted-foreground text-sm mb-auto">You've completed <span className="text-emerald-400 font-bold">{stats.completed_tasks}</span> tasks so far. Keep the momentum going!</p>
          
          <div className="mt-8 pt-8 border-t border-white/5 flex items-end gap-4">
             <div className="text-6xl font-black text-white/10">{stats.completed_tasks}</div>
             <div className="text-sm font-bold uppercase tracking-widest text-emerald-400/50 pb-2">Done</div>
          </div>
        </div>
      </div>

      {/* CARD 2: Daily Schedule */}
      <div className="relative">
        <div className="absolute inset-px rounded-[2rem] bg-white/5 backdrop-blur-2xl ring-1 ring-white/10 group-hover:ring-white/20 transition-all" />
        <div className="relative p-8 flex items-center gap-6">
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
            <Calendar className="w-8 h-8 text-rose-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-400/60 mb-1">Today's Schedule</p>
            <p className="text-2xl font-bold text-white">{stats.events_today} <span className="text-sm font-medium text-muted-foreground">Events</span></p>
          </div>
        </div>
      </div>

      {/* CARD 3: Current Focus */}
      <div className="relative">
        <div className="absolute inset-px rounded-[2rem] bg-white/5 backdrop-blur-2xl ring-1 ring-white/10 group-hover:ring-white/20 transition-all" />
        <div className="relative p-8 flex items-center gap-6">
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
            <CheckCircle2 className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400/60 mb-1">Active Tasks</p>
            <p className="text-2xl font-bold text-white">{stats.pending_tasks} <span className="text-sm font-medium text-muted-foreground">Left</span></p>
          </div>
        </div>
      </div>

      {/* CARD 4: Mood Analytics */}
      <div className="relative lg:col-span-2 h-full">
        <div className="absolute inset-px rounded-[2rem] bg-white/5 backdrop-blur-2xl ring-1 ring-white/10 group-hover:ring-white/20 transition-all" />
        <div className="relative p-10 flex h-full items-center justify-between">
          <div className="flex flex-col">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400/60 mb-2">Today's Vibe</p>
            <h3 className="text-4xl font-black text-white">
              {stats.todays_mood ? (stats.todays_mood > 3 ? "Feeling Great!" : "Going Okay") : "No entry yet"}
            </h3>
          </div>
          
          <div className="hidden sm:flex gap-4">
            {[1, 3, 5].map((m) => (
              <div 
                key={m}
                className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center border transition-all",
                  stats.todays_mood === m 
                    ? "bg-amber-400/20 border-amber-400/50 scale-110 shadow-lg shadow-amber-400/10" 
                    : "bg-white/5 border-white/10 opacity-30"
                )}
              >
                {m === 1 && <AlertCircle className="w-8 h-8 text-rose-400" />}
                {m === 3 && <Smile className="w-8 h-8 text-amber-400" />}
                {m === 5 && <Smile className="w-8 h-8 text-emerald-400" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
