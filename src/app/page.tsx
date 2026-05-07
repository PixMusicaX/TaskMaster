"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Clock from "@/components/clock";
import GlassCard from "@/components/glass-card";
import { CheckCircle2, TrendingUp, AlertCircle, Plus, Check, Swords, Brain, Coins, HeartPulse, Users, Clock as ClockIcon } from "lucide-react";
import { format, subDays, isSameDay } from "date-fns";
import { getHabits, toggleHabitLog } from "@/app/actions/habits";
import { getEventsByDateRange, toggleEventCompletion } from "@/app/actions/events";
import { getProfile } from "@/app/actions/gamification";
import { getNoteByDate } from "@/app/actions/notes";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function Home() {
  const [habits, setHabits] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
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
      const profileData = await getProfile();
      
      setHabits(habitData);
      setTasks(taskData.filter(t => isSameDay(new Date(t.startTime || t.date), today)));
      setProfile(profileData);

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
              <h2 className="text-xl font-bold">Daily Missions</h2>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-tm-yellow/10 rounded-lg">
                <CheckCircle2 size={14} className="text-tm-yellow" />
                <span className="text-[10px] font-black text-tm-yellow uppercase tracking-tighter">+10 XP</span>
              </div>
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
                    <div className="flex-1 overflow-hidden">
                      <span className={cn("text-sm font-bold truncate block", isDone ? "text-tm-purple-dark dark:text-tm-yellow" : "text-tm-blue-gray")}>
                        {habit.name}
                      </span>
                      {habit.stat && (
                        <span className="text-[8px] font-black uppercase text-tm-blue-gray/60 tracking-widest">{habit.stat}</span>
                      )}
                    </div>
                  </button>
                );
              })}
              {habits.filter(h => !h.frequency || h.frequency.includes(today.getDay())).length === 0 && !loading && (
                <p className="text-xs text-tm-blue-gray italic py-4">No missions active today.</p>
              )}
            </div>
            <Link href="/habits" className="mt-auto flex items-center gap-2 text-tm-yellow font-black text-xs uppercase tracking-widest hover:underline">
              <Plus size={14} /> Configure Skills
            </Link>
          </GlassCard>

          <GlassCard delay={0.4} className="flex flex-col gap-4 border-tm-orange-light/20">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Active Quests</h2>
              <AlertCircle className="text-tm-orange-light" />
            </div>
            <div className="space-y-3 min-h-[100px]">
              {tasks
                .filter(task => {
                  if (tasks.length >= 3 && task.completed && task.type === "task") return false;
                  return true;
                })
                .map(task => {
                  const isEvent = task.type === "event";
                  const xp = isEvent ? 30 : 40;
                  
                  return (
                    <button 
                      key={task.id}
                      onClick={() => !isEvent && handleTaskToggle(task.id, task.completed)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                        task.completed && !isEvent
                          ? "bg-tm-blue-gray/5 border-transparent opacity-50" 
                          : "bg-tm-orange-light/5 border-tm-orange-light/20 hover:border-tm-orange-light shadow-sm",
                        isEvent && "cursor-default"
                      )}
                    >
                      {!isEvent && (
                        <div className={cn(
                          "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                          task.completed ? "bg-tm-blue-gray border-tm-blue-gray" : "border-tm-orange-light/40"
                        )}>
                          {task.completed && <Check size={12} className="text-white" />}
                        </div>
                      )}
                      {isEvent && <ClockIcon size={16} className="text-tm-orange-light ml-1" />}
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <p className={cn("text-sm font-bold truncate", task.completed && !isEvent && "line-through text-tm-blue-gray")}>{task.title}</p>
                          <span className="text-[8px] font-black text-tm-orange-light">+{xp} XP</span>
                        </div>
                        <p className="text-[10px] text-tm-blue-gray font-black uppercase tracking-widest">{task.tier} Quest • {task.type}</p>
                      </div>
                    </button>
                  );
                })}
              {tasks.length === 0 && !loading && (
                <p className="text-xs text-tm-blue-gray italic py-4">No quests accepted today.</p>
              )}
            </div>
            <Link href="/calendar" className="mt-auto flex items-center gap-2 text-tm-orange-light font-black text-xs uppercase tracking-widest hover:underline">
              <Plus size={14} /> Quest Board
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
          <GlassCard className="p-8 border-tm-purple-dark/20 flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black flex items-center gap-3">
                <Swords className="text-tm-yellow" /> Character Stats
              </h3>
              {profile && (
                <span className="text-xs font-black uppercase tracking-widest text-tm-blue-gray bg-white/5 px-3 py-1 rounded-full">
                  Level {profile.level} Master
                </span>
              )}
            </div>
            
            <div className="space-y-6">
              {[
                { label: "Strength", stat: "strength", icon: Swords, color: "tm-orange-dark" },
                { label: "Intelligence", stat: "intelligence", icon: Brain, color: "tm-yellow" },
                { label: "Wealth", stat: "wealth", icon: Coins, color: "tm-orange-light" },
                { label: "Vitality", stat: "vitality", icon: HeartPulse, color: "red-500" },
                { label: "Charisma", stat: "charisma", icon: Users, color: "tm-blue-gray" },
              ].map((s) => {
                const val = profile ? (profile as any)[s.stat] : 0;
                const max = (profile?.level || 1) * 500;
                const pct = Math.min((val / max) * 100, 100);
                
                return (
                  <div key={s.label} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <s.icon size={16} className={`text-${s.color}`} />
                        <span className="text-xs font-black uppercase tracking-widest text-tm-blue-gray">{s.label}</span>
                      </div>
                      <span className="text-xs font-bold">{val} XP</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: `${pct}%` }}
                        className={`h-full bg-${s.color} shadow-[0_0_15px_rgba(255,255,255,0.2)]`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          <GlassCard className="h-full flex flex-col justify-center items-center gap-8 border-tm-orange-dark/20">
            <div className="relative w-44 h-44">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle className="text-tm-blue-gray/10" stroke="currentColor" strokeWidth="8" fill="transparent" r="42" cx="50" cy="50" />
                <motion.circle 
                  className="text-tm-orange-dark" 
                  stroke="currentColor" 
                  strokeWidth="8" 
                  strokeDasharray="263.8" 
                  initial={{ strokeDashoffset: 263.8 }}
                  whileInView={{ strokeDashoffset: 263.8 * (1 - (profile?.xp % (profile?.level * 100) / (profile?.level * 100) || 0)) }}
                  fill="transparent" 
                  r="42" cx="50" cy="50" 
                  strokeLinecap="round"
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-tm-purple-dark dark:text-tm-yellow">{profile?.level || 1}</span>
                <span className="text-[10px] uppercase font-black text-tm-blue-gray tracking-widest">Level</span>
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-bold">Class: {profile?.level > 10 ? "Arch-Mage" : profile?.level > 5 ? "Vanguard" : "Novice"}</p>
              <p className="text-xs text-tm-blue-gray font-medium">Earn { (profile?.level * 100) - (profile?.xp % (profile?.level * 100)) } more XP to level up.</p>
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
