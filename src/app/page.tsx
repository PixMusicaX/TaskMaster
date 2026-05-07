"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Clock from "@/components/clock";
import GlassCard from "@/components/glass-card";
import { Swords, Brain, Coins, HeartPulse, Users, RotateCw, CheckCircle2, History, Zap, Lock, AlertCircle, Plus, Check, Clock as ClockIcon, TrendingUp } from "lucide-react";
import { format, subDays, isSameDay } from "date-fns";
import { getHabits, toggleHabitLog } from "@/app/actions/habits";
import { getEventsByDateRange, toggleEventCompletion, getDashboardTasks } from "@/app/actions/events";
import { getProfile, getSeasonHistory } from "@/app/actions/gamification";
import { getNoteByDate, getRecentNotes } from "@/app/actions/notes";
import { getSmartMission, toggleSmartMission, regenerateSmartMission } from "@/app/actions/smart-missions";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { RPG_TITLES } from "@/lib/constants";
import { PremiumLoader } from "@/components/loader";
import RecapModal from "@/components/RecapModal";
import { addDays, subMonths } from "date-fns";

export default function Home() {
  const [habits, setHabits] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [recapData, setRecapData] = useState<any>(null);
  const [showRecap, setShowRecap] = useState(false);
  const [smartMission, setSmartMission] = useState<any>(null);
  const [moodData, setMoodData] = useState<any[]>([]);
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
      // 1. Habits & Missing Info Check
      getHabits().then(async (habitData) => {
        setHabits(habitData);
        
        // Secondary checks that depend on habits
        const yesterday = subDays(today, 1);
        const yesterdayStr = format(yesterday, "yyyy-MM-dd");
        const yesterdayDay = yesterday.getDay();
        const missing: string[] = [];
        
        const [yesterdayNote] = await Promise.all([getNoteByDate(yesterdayStr)]);
        if (!yesterdayNote) missing.push("Note");

        const habitsScheduledYesterday = habitData.filter(h => !h.frequency || h.frequency.includes(yesterdayDay));
        const anyHabitLoggedYesterday = habitData.some(h => h.logs.some((l:any) => l.date === yesterdayStr));
        
        if (habitsScheduledYesterday.length > 0 && !anyHabitLoggedYesterday) {
          missing.push("Habits");
        }
        setMissingInfo(missing);
      });

      // 2. Tasks (including overdue)
      getDashboardTasks(today).then(setTasks);

      // 3. Profile Stats
      getProfile().then(setProfile);
      getRecentNotes(30).then(setMoodData);
      getSeasonHistory(6).then(historyData => {
        setHistory(historyData);
        
        const lastMonth = subMonths(today, 1);
        const recapKey = `recap_${format(lastMonth, "yyyy_MM")}`;
        const hasSeenRecap = localStorage.getItem(recapKey);
        
        if (!hasSeenRecap) {
          const lastMonthStats = historyData.find(h => h.monthName === format(lastMonth, "MMMM"));
          if (lastMonthStats && lastMonthStats.xp > 0) {
            setRecapData(lastMonthStats);
            setShowRecap(true);
            localStorage.setItem(recapKey, "true");
          }
        }
      });

      // 5. Smart Mission (AI might be slow)
      setLoading(true);
      getSmartMission().then(smartData => {
        setSmartMission(smartData);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
    fetchData();
  }, []);

  async function handleHabitToggle(habitId: string, currentStatus: boolean) {
    await toggleHabitLog(habitId, todayStr, !currentStatus);
    const [data, prof] = await Promise.all([getHabits(), getProfile()]);
    setHabits(data);
    setProfile(prof);
    window.dispatchEvent(new CustomEvent("profile-updated"));
  }

  async function handleTaskToggle(id: string, current: boolean) {
    await toggleEventCompletion(id, !current);
    const [taskData, prof] = await Promise.all([
      getDashboardTasks(today),
      getProfile()
    ]);
    setTasks(taskData);
    setProfile(prof);
    window.dispatchEvent(new CustomEvent("profile-updated"));
  }

  async function handleSmartToggle() {
    if (!smartMission) return;
    const newStatus = !smartMission.completed;
    await toggleSmartMission(smartMission.id, newStatus);
    setSmartMission({ ...smartMission, completed: newStatus });
    const prof = await getProfile();
    setProfile(prof);
    window.dispatchEvent(new CustomEvent("profile-updated"));
  }

  async function handleRegenerate(e: React.MouseEvent) {
    e.stopPropagation();
    setLoading(true);
    const newMission = await regenerateSmartMission();
    setSmartMission(newMission);
    setLoading(false);
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
            <div className="flex items-center justify-between min-h-[60px]">
              <h2 className="text-xl font-bold">Daily Missions</h2>
              <Zap className="text-tm-yellow" size={20} />
            </div>
            <div className={cn("min-h-[200px]", loading && "flex items-center justify-center")}>
              {loading ? (
                <PremiumLoader />
              ) : (
                <div className="space-y-3">
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
                    <div className="flex-1">
                      <p className={cn("font-bold text-sm", isDone ? "text-tm-yellow line-through opacity-50" : "text-foreground")}>
                        {habit.name}
                      </p>
                    </div>
                  </button>
                );
              })}
                </div>
              )}
              {habits.filter(h => !h.frequency || h.frequency.includes(today.getDay())).length === 0 && !loading && (
                <p className="text-xs text-tm-blue-gray italic py-4">No missions active today.</p>
              )}
            </div>
            <Link href="/habits" className="mt-auto flex items-center gap-2 text-tm-yellow font-black text-xs uppercase tracking-widest hover:underline">
              <Plus size={14} /> Configure Skills
            </Link>
          </GlassCard>

          <GlassCard delay={0.4} className="flex flex-col gap-4 border-tm-orange-light/20">
            <div className="flex items-center justify-between min-h-[60px]">
              <h2 className="text-xl font-bold">Active Quests</h2>
              <AlertCircle className="text-tm-orange-light" />
            </div>
            <div className={cn("min-h-[200px]", loading && "flex items-center justify-center")}>
              {loading ? (
                <PremiumLoader />
              ) : (
                <div className="space-y-3">
                  {tasks.map(task => {
                  const isEvent = task.type === "event";
                  const xp = task.tier === "epic" ? 50 : task.tier === "main" ? 30 : 20;
                  
                  return (
                    <button 
                      key={task.id}
                      onClick={() => !isEvent && handleTaskToggle(task.id, task.completed)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                        task.completed && !isEvent
                          ? "bg-tm-blue-gray/5 border-transparent opacity-50" 
                          : cn(
                              "shadow-sm transition-all",
                              task.tier === "epic" ? "bg-tm-orange-dark/5 border-tm-orange-dark/20 hover:border-tm-orange-dark" :
                              task.tier === "main" ? "bg-tm-orange-light/5 border-tm-orange-light/20 hover:border-tm-orange-light" :
                              "bg-tm-yellow/5 border-tm-yellow/20 hover:border-tm-yellow"
                            ),
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
                        <p className={cn(
                          "text-[10px] font-black uppercase tracking-widest",
                          task.type === "task" ? "text-tm-blue-gray" : 
                          task.tier === "epic" ? "text-tm-orange-dark" :
                          task.tier === "main" ? "text-tm-orange-light" :
                          "text-tm-yellow"
                        )}>
                          {task.startTime && (
                            !isSameDay(new Date(task.startTime), today) 
                              ? `${format(new Date(task.startTime), "MMM d, HH:mm")} • `
                              : `${format(new Date(task.startTime), "HH:mm")} • `
                          )}
                          {task.type === "event" ? `${task.tier} Quest • ` : ""}
                          {task.type}
                        </p>
                      </div>
                    </button>
                  );
                })}
                </div>
              )}
              {tasks.length === 0 && !loading && (
                <p className="text-xs text-tm-blue-gray italic py-4">No quests accepted today.</p>
              )}
            </div>
            <Link href="/calendar" className="mt-auto flex items-center gap-2 text-tm-orange-light font-black text-xs uppercase tracking-widest hover:underline">
              <Plus size={14} /> Quest Board
            </Link>
          </GlassCard>

          <GlassCard delay={0.6} className="bg-tm-purple-dark text-white border-none shadow-2xl shadow-tm-purple-dark/40 overflow-visible flex flex-col gap-4">
            <div className="flex items-center justify-between min-h-[60px]">
              <div className="flex flex-col gap-1.5">
                <h2 className="text-xl font-bold text-tm-yellow">Attention</h2>
                {profile && (
                  <div className="flex items-center gap-2 bg-tm-blue-gray/20 px-2.5 py-1 rounded-xl border border-tm-blue-gray/30 w-fit">
                    <Users size={12} className="text-tm-blue-gray" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-tm-blue-gray">Charisma: {profile.charisma} XP</span>
                  </div>
                )}
              </div>
              <TrendingUp className="text-tm-yellow" />
            </div>
            <div className={cn("min-h-[200px]", loading && "flex items-center justify-center")}>
              {loading ? (
                <div className="flex flex-col items-center">
                  <PremiumLoader />
                  <p className="text-[10px] font-black uppercase text-tm-yellow animate-pulse -mt-16 mb-8">Consulting the Game Master...</p>
                </div>
              ) : missingInfo.length > 0 ? (
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
              ) : smartMission ? (
                <div 
                  onClick={handleSmartToggle}
                  className={cn(
                    "p-4 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden",
                    smartMission.completed 
                      ? "bg-tm-yellow/20 border-tm-yellow/40 shadow-inner" 
                      : "bg-white/40 dark:bg-tm-yellow/5 border-tm-yellow/30 dark:border-tm-yellow/20 hover:border-tm-yellow/50 hover:bg-white/60 dark:hover:bg-tm-yellow/10 shadow-sm dark:shadow-none"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                      smartMission.completed ? "bg-tm-yellow border-tm-yellow" : "border-tm-yellow/30"
                    )}>
                      {smartMission.completed && <Check size={12} className="text-tm-purple-dark" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black uppercase text-tm-yellow tracking-widest flex items-center gap-1">
                          <Users size={12} /> Smart Mission
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-tm-yellow/60">+{smartMission.xpReward} XP</span>
                          {!smartMission.completed && (
                            <button 
                              onClick={handleRegenerate}
                              className="p-1 hover:bg-white/10 rounded-md transition-all text-tm-yellow/40 hover:text-tm-yellow"
                              title="Regenerate Quest"
                            >
                              <RotateCw size={10} className={cn(loading && "animate-spin")} />
                            </button>
                          )}
                        </div>
                      </div>
                      <h3 className={cn("text-sm font-bold text-tm-purple-dark dark:text-white", smartMission.completed && "line-through opacity-50")}>
                        {smartMission.title}
                      </h3>
                      <p className="text-[10px] text-tm-blue-gray dark:text-white/60 mt-0.5 italic leading-relaxed">
                        {smartMission.description}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-tm-yellow/10 border border-tm-yellow/20 flex flex-col items-center gap-3 text-center">
                  <div>
                    <p className="text-sm font-medium text-tm-yellow">Mission unavailable</p>
                    <p className="text-xs text-white/60 mt-1">The Game Master is currently brooding in the shadows.</p>
                  </div>
                  <button 
                    onClick={handleRegenerate}
                    className="flex items-center gap-2 px-3 py-1.5 bg-tm-yellow/20 text-tm-yellow text-[10px] font-black uppercase rounded-lg hover:bg-tm-yellow/30 transition-all"
                  >
                    <RotateCw size={12} className={cn(loading && "animate-spin")} />
                    Try Again
                  </button>
                </div>
              )}
            </div>
            <p className="mt-auto pt-8 text-[10px] text-tm-blue-gray italic text-center uppercase tracking-widest font-black px-4">
              {smartMission?.quote ? `"${smartMission.quote}"` : '"Master your day, master your life."'}
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
          <p className="text-[10px] text-tm-blue-gray italic mt-2 uppercase tracking-widest opacity-60">XP and Levels reset on the 1st of every month</p>
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
                { label: "Vitality", stat: "vitality", icon: HeartPulse, color: "tm-red" },
                { label: "Charisma", stat: "charisma", icon: Users, color: "tm-blue-gray" },
              ].map((s) => {
                const val = profile ? (profile as any)[s.stat] : 0;
                const max = (profile?.level || 1) * 500;
                const pct = Math.min((val / max) * 100, 100);
                
                return (
                  <div key={s.label} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <s.icon size={16} style={{ color: `var(--${s.color})` }} />
                        <span className="text-xs font-black uppercase tracking-widest text-tm-blue-gray">{s.label}</span>
                      </div>
                      <span className="text-xs font-bold">{val} XP</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: `${pct}%` }}
                        style={{ backgroundColor: `var(--${s.color})` }}
                        className="h-full shadow-[0_0_15px_rgba(255,255,255,0.2)]"
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
                  whileInView={{ strokeDashoffset: 263.8 * (1 - (profile?.levelProgress / profile?.nextLevelXP || 0)) }}
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
              <p className="text-sm font-bold">
                Class: {
                  [...RPG_TITLES].reverse().find(t => (profile?.level || 1) >= t.minLevel)?.title || "Novice"
                }
              </p>
              <p className="text-xs text-tm-blue-gray font-medium">
                Earn { (profile?.nextLevelXP || 100) - (profile?.levelProgress || 0) } more XP to reach Level { (profile?.level || 1) + 1 }.
              </p>
            </div>
          </GlassCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl">
          <GlassCard className="p-8 border-tm-blue-gray/5 bg-white/5">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
              <Zap className="text-tm-orange-dark" size={20} /> Stress Metrics (30D)
            </h3>
            <div className="space-y-6">
              <div className="flex justify-between items-end gap-1 h-32 px-4">
                {moodData.length > 0 ? moodData.slice().reverse().map((m, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "flex-1 rounded-t-sm transition-all hover:scale-110",
                      m.mood === "good" ? "bg-tm-yellow h-[80%]" : 
                      m.mood === "bad" ? "bg-tm-orange-dark h-[100%]" : 
                      "bg-tm-blue-gray/20 h-[40%]"
                    )}
                    title={format(new Date(m.date), "MMM d") + ": " + m.mood}
                  />
                )) : (
                  <div className="w-full flex items-center justify-center text-[10px] text-tm-blue-gray italic uppercase tracking-widest opacity-40">
                    Journal your mood in Daily Notes to see metrics.
                  </div>
                )}
              </div>
              <div className="flex justify-between px-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-tm-yellow" />
                  <span className="text-[10px] font-bold text-tm-blue-gray uppercase tracking-widest">Joy</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-tm-blue-gray/40" />
                  <span className="text-[10px] font-bold text-tm-blue-gray uppercase tracking-widest">Steady</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-tm-orange-dark" />
                  <span className="text-[10px] font-bold text-tm-blue-gray uppercase tracking-widest">Stress</span>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-8 border-white/5 bg-white/5 flex flex-col items-center justify-center text-center opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all group">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 group-hover:bg-tm-yellow/10 transition-all">
              <Lock className="text-tm-blue-gray group-hover:text-tm-yellow transition-all" size={32} />
            </div>
            <h3 className="text-xl font-black mb-2 uppercase tracking-tighter">New Systems Incoming</h3>
            <p className="text-xs text-tm-blue-gray font-medium max-w-[200px]">
              Mastery takes time. New progression features are being forged in the Game Master's workshop.
            </p>
          </GlassCard>
        </div>
      </motion.section>

      <RecapModal 
        isOpen={showRecap} 
        stats={recapData} 
        onClose={() => setShowRecap(false)} 
      />
    </div>
  );
}

