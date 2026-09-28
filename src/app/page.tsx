"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { format, subDays, addDays, subMonths } from "date-fns";
import Clock from "@/components/clock";
import { getHabits, toggleHabitLog } from "@/app/actions/habits";
import { getEventsByDateRange, toggleEventCompletion, getDashboardTasks, syncMonthlyHolidays } from "@/app/actions/events";
import { getProfile, getSeasonHistory } from "@/app/actions/gamification";
import { getNoteByDate, getRecentNotes } from "@/app/actions/notes";
import { getSmartMission, toggleSmartMission, regenerateSmartMission } from "@/app/actions/smart-missions";
import { getDailyQuote } from "@/app/actions/daily-quote";
import { getReliefRecommendation, toggleReliefRecommendation, regenerateReliefRecommendation } from "@/app/actions/relief";
import { getPreparationTip, togglePreparationTip, regeneratePreparationTip } from "@/app/actions/preparation";
import { getSpecialDayColors } from "@/lib/utils";
import RecapModal from "@/components/RecapModal";
import TaskmasterDialog from "@/components/taskmaster-dialog";
import DailyMissionsCard from "@/components/home/daily-missions-card";
import ActiveQuestsCard from "@/components/home/active-quests-card";
import AttentionCard from "@/components/home/attention-card";
import CharacterStatsCard from "@/components/home/character-stats-card";
import ClassStatusCard from "@/components/home/class-status-card";
import FutureSightCard from "@/components/home/future-sight-card";
import StressMetricsCard from "@/components/home/stress-metrics-card";
import TavernCard from "@/components/home/tavern-card";
import MapCard from "@/components/home/map-card";

type ReliefFetcher = typeof getReliefRecommendation;

// Fetch a relief recommendation with the device location, falling back to the last known location/weather
function fetchReliefWithLocation(fetcher: ReliefFetcher, todayStr: string): Promise<any> {
  const run = async (lat?: number, lon?: number) => {
    const cachedLocation = localStorage.getItem('tm_lastLocation') || undefined;
    const cachedWeather = localStorage.getItem('tm_lastWeather') || undefined;
    const cachedTemp = localStorage.getItem('tm_lastTemp') || undefined;
    const isCached = (!lat || !lon) && !!cachedLocation;

    const relief = await fetcher(lat, lon, todayStr, cachedLocation, cachedWeather, cachedTemp);

    if (lat && lon && relief && relief.location !== "No location found") {
      localStorage.setItem('tm_lastLocation', relief.location || "");
      localStorage.setItem('tm_lastWeather', relief.weather || "");
      localStorage.setItem('tm_lastTemp', relief.temp || "");
    }
    return relief ? { ...relief, isCached } : null;
  };

  if (typeof window === "undefined" || !navigator.geolocation) return run();
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(run(pos.coords.latitude, pos.coords.longitude)),
      () => resolve(run()),
      { timeout: 5000 }
    );
  });
}

function withItem(set: Set<string>, id: string) {
  return new Set(set).add(id);
}

function withoutItem(set: Set<string>, id: string) {
  const next = new Set(set);
  next.delete(id);
  return next;
}

// Special days pinned to a time of day are shown under the clock
function isTimedSpecialDay(t: any) {
  if (t.type !== "special_day") return false;
  if (t.startTime) {
    const d = new Date(t.startTime);
    return d.getHours() !== 0 || d.getMinutes() !== 0;
  }
  return true;
}

export default function Home() {
  const [habits, setHabits] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [recapData, setRecapData] = useState<any>(null);

  const [showRecap, setShowRecap] = useState(false);
  const [showTaskmaster, setShowTaskmaster] = useState(false);
  const [smartMission, setSmartMission] = useState<any>(null);
  const [dailyQuote, setDailyQuote] = useState<string>("");
  const [relief, setRelief] = useState<any>(null);
  const [prepTip, setPrepTip] = useState<any>(null);
  const [moodData, setMoodData] = useState<any[]>([]);
  const [futureEvents, setFutureEvents] = useState<any[]>([]);
  const [completionScore, setCompletionScore] = useState(0);
  const [missingInfo, setMissingInfo] = useState<string[]>([]);
  const [habitsLoading, setHabitsLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);
  const [reliefLoading, setReliefLoading] = useState(false);
  const [prepLoading, setPrepLoading] = useState(false);

  const [updatingHabits, setUpdatingHabits] = useState<Set<string>>(new Set());
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set());
  const [updatingSmart, setUpdatingSmart] = useState(false);
  const [updatingRelief, setUpdatingRelief] = useState<Set<string>>(new Set());
  const [updatingPrep, setUpdatingPrep] = useState(false);

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  // The dashboard only looks at the last 7 days of habit logs
  const habitLogsSince = format(subDays(today, 6), "yyyy-MM-dd");

  const rawQuote = profile?.quote || dailyQuote || smartMission?.quote || "Master your day, master your life.";
  const quoteParts = rawQuote.split(/\s*[—-]\s*/).filter(Boolean);
  const quoteText = quoteParts[0];
  const quoteAuthor = quoteParts.length > 1 ? quoteParts.slice(1).join(" - ") : "";

  const specialDays = tasks.filter(isTimedSpecialDay);

  const refreshProfile = useCallback(async () => {
    setProfile(await getProfile(todayStr));
    window.dispatchEvent(new CustomEvent("profile-updated"));
  }, [todayStr]);

  useEffect(() => {
    async function fetchData() {
      // 1. Habits, Missing Info Check & 7-day Completion Stats
      const habitsPromise = getHabits(habitLogsSince);
      habitsPromise.then(async (habitData) => {
        setHabits(habitData);
        setHabitsLoading(false);

        const yesterday = subDays(today, 1);
        const yesterdayStr = format(yesterday, "yyyy-MM-dd");
        const yesterdayDay = yesterday.getDay();
        const missing: string[] = [];

        const yesterdayNote = await getNoteByDate(yesterdayStr);
        if (!yesterdayNote) missing.push("Note");

        const habitsScheduledYesterday = habitData.filter(h => !h.frequency || h.frequency.includes(yesterdayDay));
        const anyHabitLoggedYesterday = habitData.some(h => h.logs.some((l: any) => l.date === yesterdayStr));

        if (habitsScheduledYesterday.length > 0 && !anyHabitLoggedYesterday) {
          missing.push("Habits");
        }
        setMissingInfo(missing);
      });

      // 2. Tasks (including overdue)
      getDashboardTasks(todayStr).then((data) => {
        setTasks(data);
        setTasksLoading(false);
      });

      // Handle Monthly Calendarific Sync
      const syncKey = `calendarific_sync_${format(today, "yyyy_MM")}`;
      if (!localStorage.getItem(syncKey)) {
        console.log("Syncing calendarific holidays for this month...");
        syncMonthlyHolidays(format(today, "yyyy-MM-01")).then((res) => {
          if (res.success) {
            console.log("Holiday sync completed:", res.message);
            localStorage.setItem(syncKey, "true");
            // Refresh tasks to grab any newly inserted special days
            getDashboardTasks(todayStr).then(setTasks);
          } else {
            console.error("Holiday sync failed:", res.message);
            // Don't set item on failure so it can retry
          }
        });
      }

      // 3. Profile Stats
      getProfile(todayStr).then(setProfile);
      getRecentNotes(30).then(setMoodData);
      getEventsByDateRange(addDays(today, 1), addDays(today, 14)).then(data => {
        setFutureEvents(data.filter(e => e.type !== "task"));
      });

      getSeasonHistory(6, todayStr).then(historyData => {
        const lastMonth = subMonths(today, 1);
        const recapKey = `recap_${format(lastMonth, "yyyy_MM")}`;

        if (!localStorage.getItem(recapKey)) {
          const lastMonthStats = historyData.find(h => h.monthName === format(lastMonth, "MMMM"));
          if (lastMonthStats && lastMonthStats.xp > 0) {
            setRecapData(lastMonthStats);
            setShowRecap(true);
            localStorage.setItem(recapKey, "true");
          }
        }
      });

      // 4. Calculate 7-day Completion Stats
      Promise.all([
        getEventsByDateRange(subDays(today, 6), today),
        habitsPromise
      ]).then(([recentEvents, allHabits]) => {
        // Task Completion
        const eligibleTasks = recentEvents.filter(e => e.type === "task" || e.type === "event");
        const completedTasks = eligibleTasks.filter(e => e.completed).length;
        const taskRatio = eligibleTasks.length > 0 ? (completedTasks / eligibleTasks.length) : 1;

        // Habit Completion
        let totalScheduledHabits = 0;
        let totalCompletedHabits = 0;

        for (let i = 0; i < 7; i++) {
          const d = subDays(today, i);
          const dStr = format(d, "yyyy-MM-dd");
          const dDay = d.getDay();

          allHabits.forEach(h => {
            if (!h.frequency || h.frequency.includes(dDay)) {
              totalScheduledHabits++;
              if (h.logs.some((l: any) => l.date === dStr && l.completed)) {
                totalCompletedHabits++;
              }
            }
          });
        }
        const habitRatio = totalScheduledHabits > 0 ? (totalCompletedHabits / totalScheduledHabits) : 1;

        // Combine scores (Average of Task and Habit success)
        setCompletionScore(((taskRatio * 100) + (habitRatio * 100)) / 2);
      });

      // 5. AI Guidance (Parallelized for better performance)
      setAiLoading(true);
      try {
        const [smartData, prepData, quoteData] = await Promise.all([
          getSmartMission(todayStr),
          getPreparationTip(todayStr),
          getDailyQuote(todayStr)
        ]);
        setSmartMission(smartData);
        setPrepTip(prepData);
        setDailyQuote(quoteData);

        setRelief(await fetchReliefWithLocation(getReliefRecommendation, todayStr));
      } catch (err) {
        console.error("AI Fetch error:", err);
      } finally {
        setAiLoading(false);
      }
    }
    fetchData();
  }, []);

  // Midnight Reload Logic
  useEffect(() => {
    const checkMidnight = setInterval(() => {
      if (format(new Date(), "yyyy-MM-dd") !== todayStr) {
        console.log("Day change detected. Reloading for the new quest...");
        window.location.reload();
      }
    }, 60000);
    return () => clearInterval(checkMidnight);
  }, [todayStr]);

  async function handleHabitToggle(habitId: string, currentStatus: boolean) {
    setUpdatingHabits(prev => withItem(prev, habitId));
    try {
      await toggleHabitLog(habitId, todayStr, !currentStatus);
      const [data] = await Promise.all([getHabits(habitLogsSince), refreshProfile()]);
      setHabits(data);
    } finally {
      setUpdatingHabits(prev => withoutItem(prev, habitId));
    }
  }

  async function handleTaskToggle(id: string, current: boolean) {
    setUpdatingTasks(prev => withItem(prev, id));
    try {
      await toggleEventCompletion(id, !current);
      const [taskData] = await Promise.all([getDashboardTasks(todayStr), refreshProfile()]);
      setTasks(taskData);
    } finally {
      setUpdatingTasks(prev => withoutItem(prev, id));
    }
  }

  async function handleSmartToggle() {
    if (!smartMission) return;
    setUpdatingSmart(true);
    try {
      await toggleSmartMission(smartMission.id, !smartMission.completed);
      const [data] = await Promise.all([getSmartMission(todayStr), refreshProfile()]);
      setSmartMission(data);
    } finally {
      setUpdatingSmart(false);
    }
  }

  async function handlePrepToggle() {
    if (!prepTip) return;
    setUpdatingPrep(true);
    try {
      const newStatus = !prepTip.completed;
      setPrepTip({ ...prepTip, completed: newStatus });
      await togglePreparationTip(prepTip.id, newStatus);
      await refreshProfile();
    } finally {
      setUpdatingPrep(false);
    }
  }

  async function handleRegeneratePrep() {
    setPrepLoading(true);
    setPrepTip(await regeneratePreparationTip(todayStr));
    setPrepLoading(false);
  }

  async function handleReliefToggle(index: number = 0) {
    if (!relief) return;
    const key = `${relief.id}-${index}`;
    const field = index === 0 ? "completed" : index === 1 ? "alt1Completed" : "alt2Completed";
    setUpdatingRelief(prev => withItem(prev, key));
    try {
      const newStatus = !relief[field];
      await toggleReliefRecommendation(relief.id, newStatus, index);
      setRelief({ ...relief, [field]: newStatus });
      await refreshProfile();
    } finally {
      setUpdatingRelief(prev => withoutItem(prev, key));
    }
  }

  async function handleRegenerate() {
    setAiLoading(true);
    await regenerateSmartMission(todayStr);
    const [data, quoteData] = await Promise.all([getSmartMission(todayStr), getDailyQuote(todayStr)]);
    setSmartMission(data);
    setDailyQuote(quoteData);
    setAiLoading(false);
  }

  async function handleRegenerateRelief() {
    setReliefLoading(true);
    setRelief(await fetchReliefWithLocation(regenerateReliefRecommendation, todayStr));
    setReliefLoading(false);
  }

  return (
    <div className="min-h-full bg-transparent text-foreground selection:bg-tm-yellow selection:text-tm-purple-dark">
      <section className="relative min-h-screen flex flex-col items-center pt-28 pb-32 px-6 gap-12">
        {/* Central Hero: Clock */}
        <div className="flex flex-col items-center text-center gap-2 z-10">
          <Clock />

          {specialDays.length > 0 && (
            <div className="flex flex-row items-center justify-center gap-3 my-2 flex-wrap text-lg md:text-xl font-black uppercase tracking-tighter italic">
              {specialDays.map((sd, index) => (
                <div key={sd.id} className="flex items-center gap-3">
                  {index > 0 && <span className="text-tm-blue-gray/30">/</span>}
                  <span className={getSpecialDayColors(sd.title).text}>{sd.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-sm text-center md:text-base font-medium text-tm-blue-gray italic opacity-80 max-w-xl mx-auto -mt-8 mb-12">
          "{quoteText}"{quoteAuthor ? ` - ${quoteAuthor}` : ""}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-6xl">
          <DailyMissionsCard
            habits={habits}
            loading={habitsLoading}
            todayStr={todayStr}
            weekday={today.getDay()}
            updating={updatingHabits}
            onToggle={handleHabitToggle}
          />
          <ActiveQuestsCard
            tasks={tasks}
            loading={tasksLoading}
            today={today}
            updating={updatingTasks}
            onToggle={handleTaskToggle}
          />
          <AttentionCard
            charisma={profile?.charisma}
            aiLoading={aiLoading}
            missingInfo={missingInfo}
            prepTip={prepTip}
            prepLoading={prepLoading}
            updatingPrep={updatingPrep}
            onPrepToggle={handlePrepToggle}
            onRegeneratePrep={handleRegeneratePrep}
            smartMission={smartMission}
            updatingSmart={updatingSmart}
            onSmartToggle={handleSmartToggle}
            onRegenerateSmart={handleRegenerate}
            relief={relief}
            updatingRelief={updatingRelief}
            onReliefToggle={handleReliefToggle}
          />
        </div>

        {/* Insights / Scroll Indicator */}
        <div className="flex flex-col items-center gap-4 py-12 opacity-50 hover:opacity-100 transition-opacity">
          <span className="text-caption font-black uppercase tracking-[0.4em] text-tm-blue-gray">Deep Insights</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-px h-12 bg-gradient-to-b from-tm-yellow to-transparent" />
            <div className="w-1.5 h-1.5 bg-tm-yellow rounded-full shadow-[0_0_8px_rgba(242,194,48,0.8)]" />
          </motion.div>
        </div>
      </section>

      <section className="min-h-screen p-6 md:p-12 flex flex-col items-center justify-center gap-12">
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-6xl font-black text-tm-purple-dark dark:text-tm-yellow tracking-tighter">Growth Analytics</h2>
          <p className="text-tm-blue-gray max-w-2xl mx-auto font-medium">
            Visualizing your progress towards becoming the master of your tasks.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl">
          <CharacterStatsCard profile={profile} />
          <ClassStatusCard profile={profile} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl">
          <FutureSightCard events={futureEvents} />
          <StressMetricsCard moodData={moodData} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl">
          <TavernCard
            relief={relief}
            loading={reliefLoading}
            updating={updatingRelief}
            onToggle={handleReliefToggle}
            onRegenerate={handleRegenerateRelief}
          />
          <MapCard profile={profile} moodData={moodData} completionScore={completionScore} />
        </div>

        {/* Taskmaster Summon Button */}
        <div className="w-full max-w-6xl flex justify-center mt-8">
          <button
            onClick={() => setShowTaskmaster(true)}
            className="group relative px-8 py-4 bg-tm-purple-dark border border-tm-yellow/30 rounded-[2rem] hover:bg-tm-purple-dark/80 transition-all shadow-[0_0_30px_rgba(242,194,48,0.15)] hover:shadow-[0_0_40px_rgba(242,194,48,0.3)] flex items-center gap-4 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-tm-yellow/0 via-tm-yellow/10 to-tm-yellow/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <div className="w-10 h-10 rounded-xl bg-tm-yellow/20 flex items-center justify-center relative z-10">
              <MessageSquare className="text-tm-yellow" size={20} />
            </div>
            <div className="text-left relative z-10">
              <p className="text-xs font-black text-tm-yellow tracking-[0.2em] uppercase">Need Guidance?</p>
              <p className="text-lg font-black text-white italic tracking-tight">Ask The Taskmaster</p>
            </div>
          </button>
        </div>
      </section>

      {recapData && (
        <RecapModal
          stats={recapData}
          isOpen={showRecap}
          onClose={() => setShowRecap(false)}
        />
      )}

      <TaskmasterDialog
        isOpen={showTaskmaster}
        onClose={() => setShowTaskmaster(false)}
      />
    </div>
  );
}
