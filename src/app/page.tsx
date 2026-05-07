"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Clock from "@/components/clock";
import GlassCard from "@/components/glass-card";
import { CheckCircle2, TrendingUp, AlertCircle, Plus, Check } from "lucide-react";
import { format, subDays, isSameDay } from "date-fns";
import { getHabits, toggleHabitLog } from "@/app/actions/habits";
import { getEventsByDateRange, toggleEventCompletion } from "@/app/actions/events";
import { getNoteByDate } from "@/app/actions/notes";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function Home() {
  const [habits, setHabits] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [missingInfo, setMissingInfo] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);
  
  const analyticsOpacity = useTransform(scrollYProgress, [0.3, 0.6], [0, 1]);
  const analyticsY = useTransform(scrollYProgress, [0.3, 0.6], [100, 0]);

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  useEffect(() => {
    async function fetchData() {
      const habitData = await getHabits();
      const taskData = await getEventsByDateRange(subDays(today, 1), addDays(today, 1));
      
      setHabits(habitData);
      setTasks(taskData.filter(t => isSameDay(new Date(t.startTime || t.date), today)));

      // Check for missing info from yesterday
      const yesterday = subDays(today, 1);
      const yesterdayStr = format(yesterday, "yyyy-MM-dd");
      const yesterdayDay = yesterday.getDay();
      const missing: string[] = [];
      
      const yesterdayNote = await getNoteByDate(yesterdayStr);
      if (!yesterdayNote) missing.push("Note");

      // Check if any habits were scheduled for yesterday and were NOT completed
      const habitsScheduledYesterday = habitData.filter(h => !h.frequency || h.frequency.includes(yesterdayDay));
      const anyHabitLoggedYesterday = habitData.some(h => h.logs.some((l:any) => l.date === yesterdayStr));
      
      if (habitsScheduledYesterday.length > 0 && !anyHabitLoggedYesterday) {
        missing.push("Habits");
      }

      setMissingInfo(missing);
      setLoading(false);
    }
    fetchData();
  }, []);

  async function handleHabitToggle(habitId: string, currentStatus: boolean) {
    await toggleHabitLog(habitId, todayStr, !currentStatus);
    const data = await getHabits();
    setHabits(data);
  }

  async function handleTaskToggle(id: string, current: boolean) {
    await toggleEventCompletion(id, !current);
    const taskData = await getEventsByDateRange(subDays(today, 1), addDays(today, 1));
    setTasks(taskData.filter(t => isSameDay(new Date(t.startTime || t.date), today)));
  }

  return (
    <div className="relative min-h-[200vh]">
      {/* Welcome Section */}
      <motion.section 
        style={{ opacity, scale }}
        className="sticky top-0 h-screen flex flex-col items-center justify-center p-6 gap-12"
      >
        <Clock />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
          <GlassCard delay={0.2} className="flex flex-col gap-4 border-tm-yellow/20">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Today's Habits</h2>
              <CheckCircle2 className="text-tm-yellow" />
            </div>
            <div className="space-y-3 min-h-[100px]">
              {habits.filter(h => !h.frequency || h.frequency.includes(today.getDay())).map(habit => {
                const isDone = habit.logs.some((l:any) => l.date === todayStr && l.completed);
                return (
                  <button 
                    key={habit.id}
                    onClick={() => handleHabitToggle(habit.id, isDone)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2 rounded-xl border transition-all text-left",
                      isDone ? "bg-tm-yellow/20 border-tm-yellow/40" : "bg-white/5 border-transparent hover:border-tm-yellow/30"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                      isDone ? "bg-tm-yellow border-tm-yellow" : "border-tm-blue-gray/30"
                    )}>
                      {isDone && <Check size={10} className="text-tm-purple-dark" />}
                    </div>
                    <span className={cn("text-sm font-bold truncate", isDone ? "text-tm-purple-dark dark:text-tm-yellow" : "text-tm-blue-gray")}>
                      {habit.name}
                    </span>
                  </button>
                );
              })}
              {habits.filter(h => !h.frequency || h.frequency.includes(today.getDay())).length === 0 && !loading && (
                <p className="text-xs text-tm-blue-gray italic py-4">No habits scheduled for today.</p>
              )}
            </div>
            <Link href="/habits" className="mt-auto flex items-center gap-2 text-tm-yellow font-black text-xs uppercase tracking-widest hover:underline">
              <Plus size={14} /> Manage Habits
            </Link>
          </GlassCard>

          <GlassCard delay={0.4} className="flex flex-col gap-4 border-tm-orange-light/20">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Priority Items</h2>
              <AlertCircle className="text-tm-orange-light" />
            </div>
            <div className="space-y-3 min-h-[100px]">
              {tasks.map(task => (
                <button 
                  key={task.id}
                  onClick={() => handleTaskToggle(task.id, task.completed)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                    task.completed 
                      ? "bg-tm-blue-gray/5 border-transparent opacity-50" 
                      : "bg-tm-orange-light/5 border-tm-orange-light/20 hover:border-tm-orange-light shadow-sm"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                    task.completed ? "bg-tm-blue-gray border-tm-blue-gray" : "border-tm-orange-light/40"
                  )}>
                    {task.completed && <Check size={12} className="text-white" />}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className={cn("text-sm font-bold truncate", task.completed && "line-through text-tm-blue-gray")}>{task.title}</p>
                    <p className="text-[10px] text-tm-blue-gray font-black uppercase tracking-widest">{task.type}</p>
                  </div>
                </button>
              ))}
              {tasks.length === 0 && !loading && (
                <p className="text-xs text-tm-blue-gray italic py-4">Nothing scheduled for today.</p>
              )}
            </div>
            <Link href="/calendar" className="mt-auto flex items-center gap-2 text-tm-orange-light font-black text-xs uppercase tracking-widest hover:underline">
              <Plus size={14} /> Open Calendar
            </Link>
          </GlassCard>

          <GlassCard delay={0.6} className="bg-tm-purple-dark text-white border-none shadow-2xl shadow-tm-purple-dark/40 overflow-visible">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-tm-yellow">Attention</h2>
              <TrendingUp className="text-tm-yellow" />
            </div>
            <div className="mt-6 space-y-4">
              {missingInfo.length > 0 ? (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <p className="text-sm font-medium">You missed info from <span className="text-tm-yellow font-bold">Yesterday</span>:</p>
                  <div className="flex gap-2">
                    {missingInfo.map(item => (
                      <span key={item} className="px-2 py-1 bg-tm-orange-dark text-[10px] font-black uppercase rounded-lg">
                        {item}
                      </span>
                    ))}
                  </div>
                  <Link 
                    href={missingInfo[0] === "Note" ? "/notes" : "/habits"} 
                    className="block text-center text-xs font-black text-tm-yellow underline mt-2"
                  >
                    COMPLETE NOW
                  </Link>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-tm-yellow/10 border border-tm-yellow/20">
                  <p className="text-sm font-medium text-tm-yellow">You're all caught up!</p>
                  <p className="text-xs text-white/60 mt-1">Consistency is looking great this week.</p>
                </div>
              )}
            </div>
            <p className="mt-auto pt-8 text-[10px] text-tm-blue-gray italic text-center uppercase tracking-widest font-black">
              "Master your day, master your life."
            </p>
          </GlassCard>
        </div>

        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-10 flex flex-col items-center gap-2 text-tm-blue-gray"
        >
          <span className="text-[10px] font-black uppercase tracking-widest">Insights</span>
          <div className="w-1 h-8 bg-tm-blue-gray/20 rounded-full overflow-hidden">
            <motion.div 
              className="w-full bg-tm-yellow h-1/2"
              animate={{ y: [-20, 40] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </motion.section>

      {/* Analytics Section */}
      <motion.section 
        style={{ opacity: analyticsOpacity, y: analyticsY }}
        className="min-h-screen p-6 md:p-12 flex flex-col items-center justify-center gap-12"
      >
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-6xl font-black text-tm-purple-dark dark:text-tm-yellow tracking-tighter">Growth Analytics</h2>
          <p className="text-tm-blue-gray max-w-2xl mx-auto font-medium">
            Visualizing your progress towards becoming the master of your tasks.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl">
          <GlassCard className="h-80 flex flex-col justify-end border-tm-yellow/20">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <TrendingUp size={20} className="text-tm-yellow" />
              Weekly Momentum
            </h3>
            <div className="flex items-end gap-3 h-40 px-2">
              {[60, 85, 45, 95, 75, 55, 90].map((h, i) => (
                <motion.div 
                  key={i}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${h}%` }}
                  className="flex-1 bg-gradient-to-t from-tm-yellow to-tm-orange-light rounded-t-xl relative group"
                >
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-tm-purple-dark text-white text-[10px] px-2 py-1 rounded-lg font-black opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
                    {h}% FLOW
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="flex justify-between mt-4 text-[10px] font-black text-tm-blue-gray uppercase tracking-widest px-1">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
          </GlassCard>

          <GlassCard className="h-80 flex flex-col justify-center items-center gap-8 border-tm-orange-dark/20">
            <div className="relative w-44 h-44">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle className="text-tm-blue-gray/10" stroke="currentColor" strokeWidth="8" fill="transparent" r="42" cx="50" cy="50" />
                <motion.circle 
                  className="text-tm-orange-dark" 
                  stroke="currentColor" 
                  strokeWidth="8" 
                  strokeDasharray="263.8" 
                  initial={{ strokeDashoffset: 263.8 }}
                  whileInView={{ strokeDashoffset: 263.8 * 0.28 }}
                  fill="transparent" 
                  r="42" cx="50" cy="50" 
                  strokeLinecap="round"
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-tm-purple-dark dark:text-tm-yellow">72%</span>
                <span className="text-[10px] uppercase font-black text-tm-blue-gray tracking-widest">Mastery</span>
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-bold">You're in the Top 5%!</p>
              <p className="text-xs text-tm-blue-gray font-medium">Completed 18 tasks more than last week.</p>
            </div>
          </GlassCard>
        </div>
      </motion.section>
    </div>
  );
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
