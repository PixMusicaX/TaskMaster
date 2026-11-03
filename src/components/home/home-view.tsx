"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";

import { format, subDays, addDays } from "date-fns";
import Clock from "@/components/clock";
import { getHabits, toggleHabitLog } from "@/app/actions/habits";
import { getCalendarEvents, getEventsByDateRange, toggleEventCompletion, getDashboardTasks, syncMonthlyHolidays } from "@/app/actions/events";
import { GCAL_SYNCED_EVENT } from "@/lib/gcal/events";
import { getProfile, getSeasonPace, getSeasonXPBeforeToday } from "@/app/actions/gamification";
import { DEV_XP_EVENT, withDevXp } from "@/lib/dev-xp";
import { getOnThisDay, type HistoryDay } from "@/app/actions/history";
import { getNoteByDate, getRecentNotes } from "@/app/actions/notes";
import { getSmartMission, toggleSmartMission, regenerateSmartMission } from "@/app/actions/smart-missions";
import { getDailyQuote } from "@/app/actions/daily-quote";
import { dismissPersonalizationIntro, getHomeNudges } from "@/app/actions/account";
import { getReliefRecommendation, toggleReliefRecommendation, regenerateReliefRecommendation } from "@/app/actions/relief";
import { getPreparationTip, togglePreparationTip, regeneratePreparationTip } from "@/app/actions/preparation";
import { getSpecialDayColors } from "@/lib/utils";
import { personaForToday } from "@/lib/persona";
import { isRaid, isRaidDay } from "@/lib/raid";
import { useProgress } from "@/components/progress/progress-provider";
import type { EventRow, HabitWithLogs, NoteRow, PrepTipRow, Profile, Relief, SeasonPace, SmartMissionRow } from "@/lib/types";
import TaskmasterDialog from "@/components/taskmaster-dialog";
import DailyMissionsCard from "@/components/home/daily-missions-card";
import ActiveQuestsCard from "@/components/home/active-quests-card";
import AttentionCard from "@/components/home/attention-card";
import HeroQuote from "@/components/home/hero-quote";
import { splitQuote } from "@/lib/quote";
import GrowthSaga from "@/components/home/lazy-saga";
import { useScrollDissolve } from "@/lib/scroll-fx";
import dynamic from "next/dynamic";

// The reduced-motion cards are only needed by those who asked for less motion
const SagaCards = dynamic(() => import("@/components/home/saga-cards"));

type ReliefFetcher = typeof getReliefRecommendation;

// Fetch a relief recommendation with the device location, falling back to the last known location/weather
function fetchReliefWithLocation(fetcher: ReliefFetcher, todayStr: string): Promise<Relief | null> {
  const run = async (lat?: number, lon?: number) => {
    const cachedLocation = localStorage.getItem('tm_lastLocation') || undefined;
    const cachedWeather = localStorage.getItem('tm_lastWeather') || undefined;
    const cachedTemp = localStorage.getItem('tm_lastTemp') || undefined;
    const isCached = (!lat || !lon) && !!cachedLocation;

    // The Persona style on screen today (null on a normal day), so the Tavern speaks in its voice
    const relief = await fetcher(lat, lon, todayStr, cachedLocation, cachedWeather, cachedTemp, personaForToday());

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
function isTimedSpecialDay(t: EventRow) {
  if (t.type !== "special_day") return false;
  if (t.startTime) {
    const d = new Date(t.startTime);
    return d.getHours() !== 0 || d.getMinutes() !== 0;
  }
  return true;
}

// What the page's server half (app/(app)/home/page.tsx) loads for the player's day before the
// browser asks: the same calls the page would otherwise make itself, all at once
export type HomeInitial = {
  todayStr: string;
  habits: Awaited<ReturnType<typeof getHabits>>;
  yesterdayNote: Awaited<ReturnType<typeof getNoteByDate>>;
  tasks: Awaited<ReturnType<typeof getDashboardTasks>>;
  profile: Awaited<ReturnType<typeof getProfile>>;
  moodData: Awaited<ReturnType<typeof getRecentNotes>>;
  // The next two weeks, tasks included (they are left out here)
  calendar: Awaited<ReturnType<typeof getCalendarEvents>>;
  seasonPace: Awaited<ReturnType<typeof getSeasonPace>>;
  xpBeforeToday: Awaited<ReturnType<typeof getSeasonXPBeforeToday>>;
  onThisDay: HistoryDay[];
  nudges: Awaited<ReturnType<typeof getHomeNudges>>;
  // The last seven days, for the completion score
  recentEvents: Awaited<ReturnType<typeof getEventsByDateRange>>;
};

const upcoming = (calendar: EventRow[]) => calendar.filter(e => e.type !== "task");

// What yesterday is missing: a note, and the habits if none was logged on a day some were due
function missingInfoFor(habits: HabitWithLogs[], yesterdayNote: unknown, today: Date) {
  const yesterday = subDays(today, 1);
  const yesterdayStr = format(yesterday, "yyyy-MM-dd");
  const missing: string[] = [];
  if (!yesterdayNote) missing.push("Note");
  const scheduled = habits.filter(h => !h.frequency || h.frequency.includes(yesterday.getDay()));
  const logged = habits.some(h => h.logs.some((l) => l.date === yesterdayStr));
  if (scheduled.length > 0 && !logged) missing.push("Habits");
  return missing;
}

// The last seven days' completion: the average of the tasks-and-events ratio and the habits ratio
function completionScoreFor(recentEvents: EventRow[], habits: HabitWithLogs[], today: Date) {
  const eligibleTasks = recentEvents.filter(e => (e.type === "task" || e.type === "event") && !e.gcalImported);
  const completedTasks = eligibleTasks.filter(e => e.completed).length;
  const taskRatio = eligibleTasks.length > 0 ? (completedTasks / eligibleTasks.length) : 1;

  let totalScheduledHabits = 0;
  let totalCompletedHabits = 0;
  for (let i = 0; i < 7; i++) {
    const d = subDays(today, i);
    const dStr = format(d, "yyyy-MM-dd");
    const dDay = d.getDay();
    habits.forEach(h => {
      if (!h.frequency || h.frequency.includes(dDay)) {
        totalScheduledHabits++;
        if (h.logs.some((l) => l.date === dStr && l.completed)) totalCompletedHabits++;
      }
    });
  }
  const habitRatio = totalScheduledHabits > 0 ? (totalCompletedHabits / totalScheduledHabits) : 1;
  return ((taskRatio * 100) + (habitRatio * 100)) / 2;
}

// `initial` is the server's head start (null when it couldn't tell the player's date). If it
// answers for another day than the browser's, the page loads its data itself, as before.
export default function HomeView({ initial }: { initial: Promise<HomeInitial | null> | null }) {
  const [habits, setHabits] = useState<HabitWithLogs[]>([]);
  const [tasks, setTasks] = useState<EventRow[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [showTaskmaster, setShowTaskmaster] = useState(false);
  const [smartMission, setSmartMission] = useState<SmartMissionRow | null>(null);
  const [dailyQuote, setDailyQuote] = useState<string>("");
  const [relief, setRelief] = useState<Relief | null>(null);
  const [prepTip, setPrepTip] = useState<PrepTipRow | null>(null);
  const [moodData, setMoodData] = useState<NoteRow[]>([]);
  const [futureEvents, setFutureEvents] = useState<EventRow[]>([]);
  const [seasonPace, setSeasonPace] = useState<SeasonPace | null>(null);
  const [xpBeforeToday, setXpBeforeToday] = useState<number | null>(null);
  const [onThisDay, setOnThisDay] = useState<HistoryDay[]>([]);
  const [completionScore, setCompletionScore] = useState(0);
  const [missingInfo, setMissingInfo] = useState<string[]>([]);
  const [habitsLoading, setHabitsLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiKeyMissing, setAiKeyMissing] = useState(false);
  // The one-time invitation to tell the AI about yourself
  const [inviteToPersonalize, setInviteToPersonalize] = useState(false);
  const [reliefLoading, setReliefLoading] = useState(false);
  const [reliefFailed, setReliefFailed] = useState(false);
  const [prepLoading, setPrepLoading] = useState(false);

  const [updatingHabits, setUpdatingHabits] = useState<Set<string>>(new Set());
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set());
  const [updatingSmart, setUpdatingSmart] = useState(false);
  const [updatingRelief, setUpdatingRelief] = useState<Set<string>>(new Set());
  const [updatingPrep, setUpdatingPrep] = useState(false);

  // Pinned for the page's lifetime; the midnight check below reloads when the day changes
  const [today] = useState(() => new Date());
  const todayStr = format(today, "yyyy-MM-dd");
  // The dashboard only looks at the last 7 days of habit logs
  const habitLogsSince = format(subDays(today, 6), "yyyy-MM-dd");

  const rawQuote = dailyQuote || smartMission?.quote || "Master your day, master your life.";
  const { text: quoteText, author: quoteAuthor } = splitQuote(rawQuote);

  const specialDays = tasks.filter(isTimedSpecialDay);

  const { themeReady } = useProgress();

  const heroRef = useRef<HTMLDivElement>(null);
  useScrollDissolve(heroRef);

  const refreshProfile = useCallback(async () => {
    setProfile(withDevXp(await getProfile(todayStr)));
    window.dispatchEvent(new CustomEvent("profile-updated"));
  }, [todayStr]);

  // Items that arrive from Google show up without a reload
  useEffect(() => {
    const onSynced = () => {
      getDashboardTasks(todayStr).then(setTasks);
      getCalendarEvents(addDays(today, 1), addDays(today, 14)).then(data => setFutureEvents(data.filter(e => e.type !== "task")));
    };
    window.addEventListener(GCAL_SYNCED_EVENT, onSynced);
    return () => window.removeEventListener(GCAL_SYNCED_EVENT, onSynced);
  }, [today, todayStr]);

  useEffect(() => {
    let live = true;
    const applyNudges = (nudges: HomeInitial["nudges"]) => {
      setAiKeyMissing(nudges.aiKeyMissing);
      setInviteToPersonalize(nudges.personalize);
    };

    // Everything at once, from what the server sent with the page
    function fromServer(data: HomeInitial) {
      setHabits(data.habits);
      setHabitsLoading(false);
      setMissingInfo(missingInfoFor(data.habits, data.yesterdayNote, today));
      setTasks(data.tasks);
      setTasksLoading(false);
      setProfile(withDevXp(data.profile));
      setMoodData(data.moodData);
      setFutureEvents(upcoming(data.calendar));
      setSeasonPace(data.seasonPace);
      setXpBeforeToday(data.xpBeforeToday);
      setOnThisDay(data.onThisDay);
      applyNudges(data.nudges);
      setCompletionScore(completionScoreFor(data.recentEvents, data.habits, today));
    }

    // Piece by piece, asking the server for each
    function fromBrowser() {
      const habitsPromise = getHabits(habitLogsSince);
      habitsPromise.then(async (habitData) => {
        setHabits(habitData);
        setHabitsLoading(false);
        const yesterdayNote = await getNoteByDate(format(subDays(today, 1), "yyyy-MM-dd"));
        setMissingInfo(missingInfoFor(habitData, yesterdayNote, today));
      });
      // Tasks, including overdue ones
      getDashboardTasks(todayStr).then((data) => {
        setTasks(data);
        setTasksLoading(false);
      });
      getProfile(todayStr).then(p => setProfile(withDevXp(p)));
      getRecentNotes(30).then(setMoodData);
      getCalendarEvents(addDays(today, 1), addDays(today, 14)).then(data => setFutureEvents(upcoming(data)));
      getSeasonPace(todayStr).then(setSeasonPace);
      getSeasonXPBeforeToday(todayStr).then(setXpBeforeToday);
      getOnThisDay(todayStr).then(setOnThisDay);
      getHomeNudges().then(applyNudges);
      Promise.all([getEventsByDateRange(subDays(today, 6), today), habitsPromise])
        .then(([recentEvents, allHabits]) => setCompletionScore(completionScoreFor(recentEvents, allHabits, today)));
    }

    (initial ?? Promise.resolve(null))
      .catch(() => null)
      .then(data => {
        if (!live) return;
        if (data && data.todayStr === todayStr) fromServer(data);
        else fromBrowser();
      });
    return () => { live = false; };
  }, [initial, today, todayStr, habitLogsSince]);

  // This month's holidays (Calendarific), once per month per browser
  useEffect(() => {
    const syncKey = `calendarific_sync_${format(today, "yyyy_MM")}`;
    if (localStorage.getItem(syncKey)) return;
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
  }, [today, todayStr]);

  // Relief comes back empty when the server gave up, or throws when it can't be reached. Either way
  // the Tavern says so, rather than looking as if it were still thinking.
  const loadRelief = useCallback(async (fetcher: ReliefFetcher) => {
    setReliefFailed(false);
    try {
      const next = await fetchReliefWithLocation(fetcher, todayStr);
      setRelief(next);
      setReliefFailed(!next);
    } catch (err) {
      console.error("Relief fetch error:", err);
      setReliefFailed(true);
    }
  }, [todayStr]);

  // 5. AI Guidance, once the rank and era are on screen: the day's first visit generates it, which
  // is slow, and every request queued behind it would wait
  useEffect(() => {
    if (!themeReady) return;
    async function fetchGuidance() {
      setAiLoading(true);
      // Each stands alone, so one failing leaves the others on the page
      const [smartData, prepData, quoteData] = await Promise.allSettled([
        getSmartMission(todayStr, personaForToday()),
        getPreparationTip(todayStr, personaForToday()),
        getDailyQuote(todayStr)
      ]);
      if (smartData.status === "fulfilled") setSmartMission(smartData.value);
      if (prepData.status === "fulfilled") setPrepTip(prepData.value ?? null);
      if (quoteData.status === "fulfilled") setDailyQuote(quoteData.value);
      [smartData, prepData, quoteData].forEach(result => {
        if (result.status === "rejected") console.error("AI Fetch error:", result.reason);
      });

      await loadRelief(getReliefRecommendation);
      setAiLoading(false);
    }
    fetchGuidance();
  }, [todayStr, themeReady, loadRelief]);

  // Dev tools: re-read the profile when the spoofed XP changes (never fires in production)
  useEffect(() => {
    const onDevXp = () => { getProfile(todayStr).then(p => setProfile(withDevXp(p))); };
    window.addEventListener(DEV_XP_EVENT, onDevXp);
    return () => window.removeEventListener(DEV_XP_EVENT, onDevXp);
  }, [todayStr]);

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
    // Optimistic: flip today's log so the check animates on tap
    setHabits(prev => prev.map(h => h.id !== habitId ? h : {
      ...h,
      logs: [
        ...h.logs.filter((l) => l.date !== todayStr),
        { id: `optimistic-${habitId}`, userId: h.userId, habitId, habitName: h.name, habitIcon: h.icon, date: todayStr, completed: !currentStatus },
      ],
    }));
    try {
      await toggleHabitLog(habitId, todayStr, !currentStatus);
      const [data] = await Promise.all([getHabits(habitLogsSince), refreshProfile()]);
      setHabits(data);
    } catch (e) {
      console.error("Failed to toggle habit:", e);
      getHabits(habitLogsSince).then(setHabits);
    } finally {
      setUpdatingHabits(prev => withoutItem(prev, habitId));
    }
  }

  async function handleTaskToggle(id: string, current: boolean) {
    setUpdatingTasks(prev => withItem(prev, id));
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !current } : t));
    try {
      await toggleEventCompletion(id, !current);
      const [taskData] = await Promise.all([getDashboardTasks(todayStr), refreshProfile()]);
      setTasks(taskData);
    } catch (e) {
      console.error("Failed to toggle task:", e);
      getDashboardTasks(todayStr).then(setTasks);
    } finally {
      setUpdatingTasks(prev => withoutItem(prev, id));
    }
  }

  async function handleSmartToggle() {
    if (!smartMission) return;
    setUpdatingSmart(true);
    setSmartMission({ ...smartMission, completed: !smartMission.completed });
    try {
      await toggleSmartMission(smartMission.id, !smartMission.completed);
      const [data] = await Promise.all([getSmartMission(todayStr, personaForToday()), refreshProfile()]);
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
    setPrepTip((await regeneratePreparationTip(todayStr, personaForToday())) ?? null);
    setPrepLoading(false);
  }

  async function handleReliefToggle(index: number = 0) {
    if (!relief) return;
    const key = `${relief.id}-${index}`;
    const field = index === 0 ? "completed" : index === 1 ? "alt1Completed" : "alt2Completed";
    setUpdatingRelief(prev => withItem(prev, key));
    try {
      const newStatus = !relief[field];
      setRelief({ ...relief, [field]: newStatus });
      await toggleReliefRecommendation(relief.id, newStatus, index);
      await refreshProfile();
    } finally {
      setUpdatingRelief(prev => withoutItem(prev, key));
    }
  }

  async function handleRegenerate() {
    setAiLoading(true);
    await regenerateSmartMission(todayStr, personaForToday());
    const [data, quoteData] = await Promise.all([getSmartMission(todayStr, personaForToday()), getDailyQuote(todayStr)]);
    setSmartMission(data);
    setDailyQuote(quoteData);
    setAiLoading(false);
  }

  async function reloadRelief(fetcher: ReliefFetcher) {
    setReliefLoading(true);
    await loadRelief(fetcher);
    setReliefLoading(false);
  }

  const tavern = {
    relief,
    // Mondays are raid day; the row says so once it's here
    raid: relief ? isRaid(relief) : isRaidDay(todayStr),
    loading: reliefLoading,
    failed: reliefFailed,
    updating: updatingRelief,
    onToggle: handleReliefToggle,
    onRegenerate: () => reloadRelief(regenerateReliefRecommendation),
    onRetry: () => reloadRelief(getReliefRecommendation),
  };

  return (
    <div className="min-h-full bg-transparent text-foreground selection:bg-tm-yellow selection:text-tm-on-accent">
      <section className="relative min-h-screen flex flex-col items-center pt-28 pb-32 px-6 gap-12">
        {/* Central Hero: Clock */}
        <div ref={heroRef} className="flex flex-col items-center text-center gap-2 z-10">
          <Clock />

          {specialDays.length > 0 && (
            <div className="flex flex-row items-center justify-center gap-3 my-2 flex-wrap text-lg md:text-xl font-bold uppercase tracking-tighter italic">
              {specialDays.map((sd, index) => (
                <div key={sd.id} className="flex items-center gap-3">
                  {index > 0 && <span className="text-tm-blue-gray/60">/</span>}
                  <span className={getSpecialDayColors().text}>{sd.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <HeroQuote text={quoteText} author={quoteAuthor} />

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
            aiKeyMissing={aiKeyMissing}
            inviteToPersonalize={inviteToPersonalize}
            onDismissPersonalize={() => { setInviteToPersonalize(false); dismissPersonalizationIntro(); }}
            onReliefToggle={handleReliefToggle}
          />
        </div>

        {/* Insights / Scroll Indicator */}
        <div className="flex flex-col items-center gap-4 py-12 opacity-50 hover:opacity-100 transition-opacity">
          <span className="text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray">Deep Insights</span>
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

      <section className="px-6 pt-12 text-center space-y-4">
        <h2 className="text-4xl md:text-6xl font-display font-bold text-tm-purple-dark dark:text-tm-yellow tracking-tight">Growth Analytics</h2>
        <p className="text-tm-blue-gray max-w-2xl mx-auto font-medium">
          Visualizing your progress towards becoming the master of your tasks.
        </p>
      </section>

      <GrowthSaga
        profile={profile}
        moodData={moodData}
        pace={seasonPace}
        xpBeforeToday={xpBeforeToday}
        onThisDay={onThisDay}
        futureEvents={futureEvents}
        todayStr={todayStr}
        tavern={tavern}
        completionScore={completionScore}
        onAsk={() => setShowTaskmaster(true)}
        holdArrival={aiLoading || prepLoading || reliefLoading}
        fallback={
          <SagaCards
            profile={profile}
            pace={seasonPace}
            onThisDay={onThisDay}
            todayStr={todayStr}
            futureEvents={futureEvents}
            moodData={moodData}
            tavern={tavern}
            completionScore={completionScore}
          />
        }
      />

      <TaskmasterDialog
        isOpen={showTaskmaster}
        onClose={() => setShowTaskmaster(false)}
      />
    </div>
  );
}
