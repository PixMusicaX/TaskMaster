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
import { getReliefRecommendation, toggleReliefRecommendation, regenerateReliefRecommendation } from "@/app/actions/relief";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { RPG_TITLES, XP_VALUES } from "@/lib/constants";
import { PremiumLoader } from "@/components/loader";
import RecapModal from "@/components/RecapModal";
import { addDays, subMonths } from "date-fns";
import { Music, Film, Coffee, Dumbbell, MapPin, CloudSun, History as HistoryIcon, Sparkles } from "lucide-react";
import MoodRadar from "@/components/mood-radar";

export default function Home() {
  const [habits, setHabits] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [recapData, setRecapData] = useState<any>(null);
  const [showRecap, setShowRecap] = useState(false);
  const [smartMission, setSmartMission] = useState<any>(null);
  const [relief, setRelief] = useState<any>(null);
  const [moodData, setMoodData] = useState<any[]>([]);
  const [missingInfo, setMissingInfo] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [reliefLoading, setReliefLoading] = useState(false);

  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);
  
  const analyticsOpacity = useTransform(scrollYProgress, [0.3, 0.6], [0, 1]);
  const analyticsY = useTransform(scrollYProgress, [0.3, 0.6], [100, 0]);

  const processedMoodData = {
    joy: moodData.filter(m => m.mood === 'good').length,
    steady: moodData.filter(m => m.mood === 'neutral').length,
    stress: moodData.filter(m => m.mood === 'bad').length,
  };

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

      // 5. Smart Mission & Relief (Sequentialized to avoid rate limits)
      setLoading(true);
      try {
        const smartData = await getSmartMission();
        setSmartMission(smartData);
        
        const finishRelief = async (lat?: number, lon?: number) => {
          const reliefData = await getReliefRecommendation(lat, lon);
          setRelief(reliefData);
          setLoading(false);
        };

        if (typeof window !== "undefined" && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => finishRelief(pos.coords.latitude, pos.coords.longitude),
            () => finishRelief()
          );
        } else {
          await finishRelief();
        }
      } catch (err) {
        console.error("AI Fetch error:", err);
        setLoading(false);
      }
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

  // Midnight Reload Logic
  useEffect(() => {
    const checkMidnight = setInterval(() => {
      const now = new Date();
      const currentDayStr = format(now, "yyyy-MM-dd");
      if (currentDayStr !== todayStr) {
        console.log("Day change detected. Reloading for the new quest...");
        window.location.reload();
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkMidnight);
  }, [todayStr]);

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

  async function handleRegenerate(e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setLoading(true);
    const newMission = await regenerateSmartMission();
    setSmartMission(newMission);
    window.dispatchEvent(new CustomEvent("profile-updated"));
  }

  async function handleReliefToggle(index: number = 0) {
    if (!relief) return;
    const isCompleted = index === 0 ? relief.completed : index === 1 ? relief.alt1Completed : relief.alt2Completed;
    const newStatus = !isCompleted;
    await toggleReliefRecommendation(relief.id, newStatus, index);
    
    const updatedRelief = { ...relief };
    if (index === 0) updatedRelief.completed = newStatus;
    else if (index === 1) updatedRelief.alt1Completed = newStatus;
    else if (index === 2) updatedRelief.alt2Completed = newStatus;
    setRelief(updatedRelief);

    const prof = await getProfile();
    setProfile(prof);
    window.dispatchEvent(new CustomEvent("profile-updated"));
  }

  async function handleRegenerateRelief(e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setReliefLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const newRelief = await regenerateReliefRecommendation(pos.coords.latitude, pos.coords.longitude);
        setRelief(newRelief);
        setReliefLoading(false);
      }, async () => {
        const newRelief = await regenerateReliefRecommendation();
        setRelief(newRelief);
        setReliefLoading(false);
      });
    } else {
      const newRelief = await regenerateReliefRecommendation();
      setRelief(newRelief);
      setReliefLoading(false);
    }
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
                  const xp = task.tier === "epic" ? XP_VALUES.QUEST_EPIC : task.tier === "main" ? XP_VALUES.QUEST_MAIN : XP_VALUES.QUEST_SIDE;
                  
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

          <GlassCard delay={0.6} className="overflow-visible flex flex-col gap-4 border-tm-yellow/20">
            <div className="flex items-center justify-between min-h-[60px]">
              <div className="flex flex-col gap-1.5">
                <h2 className="text-xl font-black text-tm-yellow uppercase tracking-tighter">Attention</h2>
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
              ) : (
                <div className="space-y-3">
                  {smartMission && (
                    <div 
                      onClick={handleSmartToggle}
                      className={cn(
                        "p-3 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden",
                        smartMission.completed 
                          ? "bg-tm-yellow/20 border-tm-yellow/40 shadow-inner opacity-50" 
                          : "bg-white/40 dark:bg-tm-yellow/5 border-tm-yellow/30 dark:border-tm-yellow/20 hover:border-tm-yellow/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                          smartMission.completed ? "bg-tm-yellow border-tm-yellow" : "border-tm-yellow/30"
                        )}>
                          {smartMission.completed && <Check size={10} className="text-tm-purple-dark" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[8px] font-black uppercase text-tm-yellow tracking-widest flex items-center gap-1">
                              <Users size={10} /> Smart Mission
                            </span>
                            <div className="flex items-center gap-2">
                              {!smartMission.completed && (
                                <button 
                                  onClick={handleRegenerate}
                                  className="text-[8px] font-black text-tm-yellow/40 hover:text-tm-yellow uppercase tracking-widest bg-tm-yellow/5 px-1.5 py-0.5 rounded transition-all"
                                >
                                  Reload
                                </button>
                              )}
                              <span className="text-[8px] font-black text-tm-yellow/60">+{smartMission.xpReward === 25 ? 50 : smartMission.xpReward} XP</span>
                            </div>
                          </div>
                          <h3 className={cn("text-xs font-black text-foreground truncate", smartMission.completed && "line-through opacity-50")}>
                            {smartMission.title}
                          </h3>
                          {smartMission.description && !smartMission.completed && (
                            <p className="text-[9px] text-tm-blue-gray/80 dark:text-tm-blue-gray/60 mt-1 leading-relaxed line-clamp-2 italic">
                              {smartMission.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {relief && (
                    <div 
                      onClick={() => handleReliefToggle(0)}
                      className={cn(
                        "p-3 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden",
                        relief.completed 
                          ? "bg-tm-yellow/20 border-tm-yellow/40 shadow-inner opacity-50" 
                          : "bg-white/40 dark:bg-tm-yellow/5 border-tm-yellow/30 dark:border-tm-yellow/20 hover:border-tm-yellow/50 shadow-sm"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                          relief.completed ? "bg-tm-yellow border-tm-yellow" : "border-tm-yellow/30"
                        )}>
                          {relief.completed && <Check size={10} className="text-tm-purple-dark" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[8px] font-black uppercase text-tm-yellow tracking-widest flex items-center gap-1">
                              {relief.type === 'movie' && <Film size={10} />}
                              {relief.type === 'song' && <Music size={10} />}
                              {relief.type === 'food' && <Coffee size={10} />}
                              {relief.type === 'activity' && <Dumbbell size={10} />}
                              Relief: {relief.type}
                            </span>
                            <div className="flex items-center gap-2">
                              {!relief.completed && (
                                <button 
                                  onClick={handleRegenerateRelief}
                                  className="text-[8px] font-black text-tm-yellow/40 hover:text-tm-yellow uppercase tracking-widest bg-tm-yellow/5 px-1.5 py-0.5 rounded transition-all"
                                >
                                  Reload
                                </button>
                              )}
                              <span className="text-[8px] font-black text-tm-yellow/60">+{relief.xpReward === 5 ? 10 : relief.xpReward} XP</span>
                            </div>
                          </div>
                          <h3 className={cn("text-xs font-black text-foreground truncate", relief.completed && "line-through opacity-50")}>
                            {relief.title}
                          </h3>
                          {relief.description && !relief.completed && (
                            <p className="text-[9px] text-tm-blue-gray/80 dark:text-tm-blue-gray/60 mt-1 leading-relaxed line-clamp-2 italic">
                              {relief.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {!smartMission && !relief && (
                    <div className="p-4 rounded-2xl bg-tm-yellow/10 border border-tm-yellow/20 flex flex-col items-center gap-3 text-center">
                      <p className="text-sm font-medium text-tm-yellow">Missions unavailable</p>
                      <button onClick={handleRegenerate} className="flex items-center gap-2 px-3 py-1.5 bg-tm-yellow/20 text-tm-yellow text-[10px] font-black uppercase rounded-lg hover:bg-tm-yellow/30 transition-all">
                        <RotateCw size={12} className={cn(loading && "animate-spin")} /> Try Again
                      </button>
                    </div>
                  )}
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
          className="absolute bottom-20 flex flex-col items-center gap-2 text-tm-blue-gray"
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
                const max = (profile?.level || 1) * 350; // Adjusted for 70 XP per level (5 * 70 = 350)
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
                Earn { (profile?.nextLevelXP || 70) - (profile?.levelProgress || 0) } more XP to reach Level { (profile?.level || 1) + 1 }.
              </p>
            </div>
          </GlassCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl">
          <GlassCard delay={0.8} className="p-8 border-tm-blue-gray/10 bg-white/5 flex flex-col gap-8 group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
              <Zap size={120} />
            </div>

            <div className="flex items-center justify-between relative z-10">
              <div className="flex flex-col gap-1">
                <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                  <Zap className="text-tm-orange-light" size={24} /> Stress Metrics
                </h3>
                <p className="text-[10px] font-black uppercase text-tm-blue-gray/40 tracking-[0.3em]">
                  30-Day Emotional Signature
                </p>
              </div>
              <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[9px] font-black uppercase tracking-widest text-tm-blue-gray">
                Live Data
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center relative z-10 min-h-[220px]">
              {moodData.length > 0 ? (
                <MoodRadar 
                  size={240}
                  data={{
                    joy: moodData.filter(m => m.mood === "good").length,
                    steady: moodData.filter(m => m.mood === "neutral").length,
                    stress: moodData.filter(m => m.mood === "bad").length,
                  }} 
                />
              ) : (
                <div className="text-center opacity-40">
                  <div className="w-16 h-16 border-2 border-dashed border-tm-blue-gray rounded-full mx-auto mb-4 animate-spin-slow" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Pulse...</p>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-4 relative z-10">
              {[
                { label: 'Joy', value: moodData.filter(m => m.mood === "good").length, color: 'text-tm-yellow', bg: 'bg-tm-yellow/10 dark:bg-tm-yellow/5' },
                { label: 'Steady', value: moodData.filter(m => m.mood === "neutral").length, color: 'text-tm-blue-gray', bg: 'bg-tm-blue-gray/10 dark:bg-tm-blue-gray/5' },
                { label: 'Stress', value: moodData.filter(m => m.mood === "bad").length, color: 'text-tm-orange-dark', bg: 'bg-tm-orange-dark/10 dark:bg-tm-orange-dark/5' },
              ].map((stat, i) => (
                <div key={i} className={cn("p-4 rounded-3xl border border-tm-blue-gray/5 dark:border-white/5 flex flex-col items-center gap-1", stat.bg)}>
                  <div className={cn("w-2 h-2 rounded-full", stat.color.replace('text-', 'bg-'))} />
                  <span className="text-[10px] font-black uppercase text-tm-blue-gray/60 dark:text-tm-blue-gray/40 tracking-widest">{stat.label}</span>
                  <span className="text-2xl font-black text-foreground">{stat.value}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-8 border-tm-blue-gray/10 bg-white/5 flex flex-col gap-8 group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
              <Coffee size={120} />
            </div>

            <div className="flex items-center justify-between relative z-10">
              <div className="flex flex-col gap-1">
                <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                  <Coffee className="text-tm-blue-gray" size={24} /> Relief Hub
                </h3>
                {relief && (
                  <div className="flex items-center gap-3 text-[10px] font-black uppercase text-tm-blue-gray/60 tracking-[0.2em]">
                    <span className="flex items-center gap-1.5"><MapPin size={12} className="text-tm-yellow/40" /> {relief.location}</span>
                    <span className="w-1 h-1 rounded-full bg-white/10" />
                    <span className="flex items-center gap-1.5"><CloudSun size={12} className="text-tm-yellow/40" /> {relief.temp}°C {relief.weather}</span>
                  </div>
                )}
              </div>
              {!relief?.completed && relief && (
                <button 
                  onClick={handleRegenerateRelief}
                  className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-2xl border border-white/10 text-tm-blue-gray hover:text-tm-yellow hover:border-tm-yellow/50 transition-all shadow-lg active:scale-95"
                  title="Regenerate Hub"
                >
                  <RotateCw size={18} className={cn(reliefLoading && "animate-spin")} />
                </button>
              )}
            </div>

            <div className={cn("flex-1 flex flex-col justify-center relative z-10", reliefLoading && "items-center")}>
              {reliefLoading ? (
                <div className="flex flex-col items-center">
                  <PremiumLoader />
                  <p className="text-[10px] font-black uppercase text-tm-yellow animate-pulse -mt-16">Scanning for relief...</p>
                </div>
              ) : relief ? (
                <div className="flex flex-col gap-6">
                  {/* Primary Suggestion */}
                  <div className="relative">
                    <div className="absolute -top-3 left-4 px-2 bg-tm-purple-dark border border-tm-yellow/20 rounded text-[8px] font-black uppercase text-tm-yellow tracking-[0.2em] z-20">
                      Primary Path
                    </div>
                    <button 
                      onClick={() => handleReliefToggle(0)}
                      className={cn(
                        "w-full text-left p-6 rounded-[2rem] border transition-all relative overflow-hidden group/card shadow-2xl",
                        relief.completed 
                          ? "bg-tm-yellow/10 border-tm-yellow/40 shadow-inner opacity-50 grayscale-[0.5]" 
                          : "bg-white/5 border-white/10 hover:border-tm-yellow/30 hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-start gap-5">
                        <div className={cn(
                          "w-8 h-8 rounded-2xl border-2 flex items-center justify-center transition-all mt-1 shadow-lg",
                          relief.completed ? "bg-tm-yellow border-tm-yellow" : "bg-white/5 border-tm-blue-gray/30 group-hover/card:border-tm-yellow/50"
                        )}>
                          {relief.completed ? <Check size={18} className="text-tm-purple-dark" /> : <Sparkles size={14} className="text-tm-yellow" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase text-tm-yellow tracking-[0.3em] flex items-center gap-2">
                              {relief.type === 'movie' && <Film size={12} />}
                              {relief.type === 'song' && <Music size={12} />}
                              {relief.type === 'food' && <Coffee size={12} />}
                              {relief.type === 'activity' && <Dumbbell size={12} />}
                              {relief.type || 'Suggestion'}
                            </span>
                            <span className="text-xs font-black text-tm-yellow bg-tm-yellow/10 px-2 py-0.5 rounded-lg border border-tm-yellow/20">+{relief.xpReward === 5 ? 10 : relief.xpReward} XP</span>
                          </div>
                          <h4 className={cn("text-xl font-black leading-tight tracking-tight", relief.completed && "line-through opacity-50")}>
                            {relief.title}
                          </h4>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Alternatives Section */}
                  {relief.alternatives && Array.isArray(relief.alternatives) && relief.alternatives.length > 0 && (
                    <div className="flex flex-col gap-5">
                      <div className="flex items-center gap-4">
                        <p className="text-[10px] font-black uppercase text-tm-blue-gray/30 tracking-[0.4em] shrink-0">Alternative Channels</p>
                        <div className="h-px flex-1 bg-white/[0.03]" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {relief.alternatives.map((alt: any, i: number) => {
                          const isAltCompleted = i === 0 ? relief.alt1Completed : relief.alt2Completed;
                          return (
                            <button 
                              key={i} 
                              onClick={() => handleReliefToggle(i + 1)}
                              className={cn(
                                "flex flex-col gap-3 p-5 rounded-[1.5rem] border transition-all text-left group/alt relative overflow-hidden",
                                isAltCompleted 
                                  ? "bg-tm-yellow/5 border-tm-yellow/10 opacity-40 grayscale" 
                                  : "bg-white/[0.02] border-white/5 hover:border-tm-yellow/20 hover:bg-white/[0.05] shadow-lg"
                              )}
                            >
                              <div className="flex items-center justify-between gap-3 relative z-10">
                                <div className={cn(
                                  "w-8 h-8 rounded-xl border flex items-center justify-center transition-all shrink-0",
                                  isAltCompleted ? "bg-tm-yellow border-tm-yellow" : "bg-white/5 border-tm-blue-gray/20 group-hover/alt:border-tm-yellow/40"
                                )}>
                                  {isAltCompleted ? (
                                    <Check size={16} className="text-tm-purple-dark" />
                                  ) : (
                                    <>
                                      {alt.type === 'movie' && <Film size={14} className="text-tm-blue-gray group-hover/alt:text-tm-yellow" />}
                                      {alt.type === 'song' && <Music size={14} className="text-tm-blue-gray group-hover/alt:text-tm-yellow" />}
                                      {alt.type === 'food' && <Coffee size={14} className="text-tm-blue-gray group-hover/alt:text-tm-yellow" />}
                                      {alt.type === 'activity' && <Dumbbell size={14} className="text-tm-blue-gray group-hover/alt:text-tm-yellow" />}
                                    </>
                                  )}
                                </div>
                                <span className="text-[9px] font-black text-tm-yellow bg-tm-yellow/10 px-2 py-0.5 rounded-lg border border-tm-yellow/10">+{relief.xpReward === 5 ? 10 : relief.xpReward} XP</span>
                              </div>
                              <div className="relative z-10">
                                <span className="text-[8px] font-black uppercase text-tm-blue-gray/40 tracking-widest block mb-0.5">{alt.type}</span>
                                <h5 className={cn("text-sm font-black leading-snug line-clamp-2", isAltCompleted && "line-through opacity-50")}>{alt.title}</h5>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 opacity-50">
                  <p className="text-[10px] font-black uppercase text-tm-blue-gray animate-pulse">Syncing Hub...</p>
                </div>
              )}
            </div>
            
            <p className="text-[10px] text-tm-blue-gray/40 uppercase font-black tracking-[0.5em] text-center mt-auto relative z-10">
              Personalized Growth Neural-Link
            </p>
          </GlassCard>
        </div>
      </motion.section>

      {recapData && (
        <RecapModal 
          stats={recapData}
          isOpen={showRecap}
          onClose={() => setShowRecap(false)} 
        />
      )}
    </div>
  );
}
