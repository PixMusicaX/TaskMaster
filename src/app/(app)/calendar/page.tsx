"use client";

import { useState, useEffect, useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import GlassCard from "@/components/glass-card";
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, X, Trash2, Check, Bell, BellOff, Edit2, Swords, Coins, RotateCw, ChevronDown, Calendar as CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, setHours, setMinutes } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { getEventsByDateRange, addEvent, toggleEventCompletion, deleteEvent, updateEvent, getAllEvents } from "@/app/actions/events";
import { getProfile } from "@/app/actions/gamification";
import { getMoodsByDateRange } from "@/app/actions/notes";
import { getReliefHistory } from "@/app/actions/relief";
import { cn, getSpecialDayColors } from "@/lib/utils";
import { PageSkeleton } from "@/components/loader";
import CompletionCheck from "@/components/ui/completion-check";
import StrikeText from "@/components/ui/strike-text";
import { SPRING } from "@/lib/motion";
import TabularViewModal from "@/components/TabularViewModal";
import type { EventRow, MoodEntry, Profile, ReliefRow } from "@/lib/types";
import { Search } from "lucide-react";
import { PERSONA_NAMES, isPersonaOff, scheduledPersona, subscribePersonaSetting } from "@/lib/persona";
import { PersonaDayBadge } from "@/components/persona/persona-day-badge";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<EventRow[]>([]);
  const [reliefs, setReliefs] = useState<ReliefRow[]>([]);
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Until Persona days are switched on (Account → Settings) the calendar doesn't mark them either
  const personaOff = useSyncExternalStore(subscribePersonaSetting, isPersonaOff, () => true);
  const dayPersona = (day: Date) => (personaOff ? null : scheduledPersona(day));
  const [showAdd, setShowAdd] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("task");
  const [newTier, setNewTier] = useState("main");
  const [newTime, setNewTime] = useState("12:00");
  const [newNotification, setNewNotification] = useState(true);
  const [newRepeatsYearly, setNewRepeatsYearly] = useState(false);
  const [newDateStr, setNewDateStr] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isTabularOpen, setIsTabularOpen] = useState(false);
  const [isPickingMonth, setIsPickingMonth] = useState(false);
  const [allEventsForTable, setAllEventsForTable] = useState<EventRow[]>([]);

  const [updatingEvents, setUpdatingEvents] = useState<Set<string>>(new Set());

  // Direction the month grid slides in from, updated whenever the visible month changes
  const monthKey = format(currentDate, "yyyy-MM");
  const [prevMonthKey, setPrevMonthKey] = useState(monthKey);
  const [monthDir, setMonthDir] = useState(0);
  if (monthKey !== prevMonthKey) {
    setMonthDir(monthKey > prevMonthKey ? 1 : -1);
    setPrevMonthKey(monthKey);
  }

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const { startDate, endDate, days, monthStart } = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    return { startDate, endDate, days, monthStart };
  }, [currentDate]);

  const fetchEvents = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const [eventsData, profileData, notesData, reliefData] = await Promise.all([
        getEventsByDateRange(startDate, endDate),
        getProfile(format(currentDate, "yyyy-MM-dd")),
        getMoodsByDateRange(format(startDate, "yyyy-MM-dd"), format(endDate, "yyyy-MM-dd")),
        getReliefHistory(format(startDate, "yyyy-MM-dd"))
      ]);
      setEvents(eventsData);
      setProfile(profileData);
      setMoods(notesData);
      setReliefs(reliefData);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, [startDate, endDate, currentDate]);

  const initialLoad = useRef(true);

  useEffect(() => {
    fetchEvents(initialLoad.current);
    initialLoad.current = false;
  }, [fetchEvents]);

  // The full archive is only needed for the table view, so load it (fresh) when that opens
  useEffect(() => {
    if (!isTabularOpen) return;
    getAllEvents().then(setAllEventsForTable);
  }, [isTabularOpen]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      events.forEach(event => {
        if (event.notification && event.startTime && !event.completed) {
          const startTime = new Date(event.startTime);
          const diff = startTime.getTime() - now.getTime();
          if (diff > 0 && diff < 60000) {
            new Notification(`TaskMaster: ${event.title}`, {
              body: `Starts at ${format(startTime, "HH:mm")}`,
              icon: "/file.svg"
            });
          }
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [events]);

  function openEdit(event: EventRow) {
    if (event.isApi) return;
    setEditingEvent(event);
    setNewTitle(event.title);
    setNewType(event.type);
    setNewTier(event.tier || "main");
    const dateObj = new Date(event.startTime || event.date);
    setNewTime(format(dateObj, "HH:mm"));
    setNewDateStr(format(dateObj, "yyyy-MM-dd"));
    setNewNotification(event.notification ?? true);
    setNewRepeatsYearly(event.repeatsYearly ?? false);
    setSelectedDate(dateObj);
    setShowAdd(true);
  }

  async function handleAddEvent() {
    if (!newTitle) return;

    const [hours, minutes] = newTime.split(":").map(Number);
    const baseDate = new Date(newDateStr);
    const eventTime = newType === "special_day" ? null : setMinutes(setHours(baseDate, hours), minutes);

    const eventData = {
      title: newTitle,
      date: newDateStr,
      type: newType,
      tier: newType === "task" ? "side" : newTier,
      startTime: eventTime,
      notification: newNotification,
      repeatsYearly: newRepeatsYearly,
    };

    if (editingEvent) {
      await updateEvent(editingEvent.id, eventData);
    } else {
      await addEvent(eventData);
    }

    resetForm();
    await fetchEvents(false);
    window.dispatchEvent(new CustomEvent("profile-updated"));
  }

  function resetForm() {
    setNewTitle("");
    setNewType("task");
    setNewTier("main");
    setNewTime("12:00");
    setNewDateStr(format(selectedDate, "yyyy-MM-dd"));
    setNewNotification(true);
    setNewRepeatsYearly(false);
    setEditingEvent(null);
    setShowAdd(false);
  }

  async function handleDelete(id: string) {
    await deleteEvent(id);
    await fetchEvents(false);
    window.dispatchEvent(new CustomEvent("profile-updated"));
  }

  async function handleToggle(id: string, current: boolean) {
    setUpdatingEvents(prev => new Set(prev).add(id));
    setEvents(prev => prev.map(e => e.id === id ? { ...e, completed: !current } : e));
    try {
      await toggleEventCompletion(id, !current);
      await fetchEvents(false);
      window.dispatchEvent(new CustomEvent("profile-updated"));
    } catch (e) {
      console.error("Failed to toggle event:", e);
      fetchEvents(false);
    } finally {
      setUpdatingEvents(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  }

  const sortedAndFilteredArchive = useMemo(() => {
    const sorted = [...allEventsForTable].sort((a, b) => {
      const dateA = new Date(a.startTime || a.date).getTime();
      const dateB = new Date(b.startTime || b.date).getTime();
      return dateB - dateA;
    });

    const userEvents = allEventsForTable.filter(e => e.type === "task" || e.type === "event");
    if (userEvents.length === 0) return sorted;

    const maxUserDate = Math.max(...userEvents.map(e => new Date(e.startTime || e.date).getTime()));

    return sorted.filter(e => {
      if (e.type !== "special_day") return true;
      const d = new Date(e.startTime || e.date).getTime();
      return d <= maxUserDate;
    });
  }, [allEventsForTable]);

  const selectedEvents = events
    .filter((e) => isSameDay(new Date(e.startTime || e.date), selectedDate))
    .filter((e) => {
      if (e.type === "special_day" && e.startTime) {
        const d = new Date(e.startTime);
        return d.getHours() !== 0 || d.getMinutes() !== 0;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.type === "special_day" && b.type !== "special_day") return -1;
      if (a.type !== "special_day" && b.type === "special_day") return 1;
      return 0;
    });

  const selectedLocation = reliefs.find(r => r.date === format(selectedDate, "yyyy-MM-dd"))?.location;

  return (
    <div className="p-4 pt-12 md:p-12 md:pt-16 max-w-7xl mx-auto space-y-8">
      {isLoading ? (
        <PageSkeleton />
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-display font-bold text-tm-purple-dark dark:text-tm-yellow">Calendar</h1>
              <p className="text-tm-blue-gray font-medium">Plan your weeks and months ahead.</p>

              {profile && (
                <div className="flex flex-wrap gap-2 mt-4">
                  <div className="flex items-center gap-2 bg-tm-orange-dark/10 px-3 py-1.5 rounded-xl border border-tm-orange-dark/20">
                    <Swords size={14} className="text-tm-orange-dark" />
                    <span className="text-caption font-mono font-semibold uppercase tracking-[0.12em] whitespace-nowrap text-tm-orange-dark">Strength: {profile.strength} XP</span>
                  </div>
                  <div className="flex items-center gap-2 bg-tm-orange-light/10 px-3 py-1.5 rounded-xl border border-tm-orange-light/20">
                    <Coins size={14} className="text-tm-orange-light" />
                    <span className="text-caption font-mono font-semibold uppercase tracking-[0.12em] whitespace-nowrap text-tm-orange-light">Wealth: {profile.wealth} XP</span>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowAdd(true);
              }}
              className="flex items-center gap-2 bg-tm-yellow backdrop-blur-xl text-tm-purple-dark px-6 py-3 rounded-2xl font-black hover:scale-105 transition-transform shadow-xl w-full sm:w-auto relative z-10"
            >
              <Plus size={20} /> New Item
            </button>
          </div>

          <AnimatePresence>
            {showAdd && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] w-full h-full flex items-center justify-center p-6 bg-black/40 backdrop-blur-md"
                onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}
              >
                <GlassCard className="w-full max-w-md space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">
                      {editingEvent ? "Edit" : "New"}{" "}
                      {newType === "task"
                        ? "Task"
                        : newType === "special_day"
                          ? "Special Day"
                          : "Event"}
                    </h2>
                    <button onClick={resetForm}><X /></button>
                  </div>
                  <div className="space-y-4">
                    <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                      <button
                        onClick={() => setNewType("task")}
                        className={cn("flex-1 py-2 rounded-lg font-bold text-sm transition-all", newType === "task" ? "bg-tm-yellow text-tm-purple-dark" : "text-tm-blue-gray")}
                      >
                        Task
                      </button>
                      <button
                        onClick={() => setNewType("event")}
                        className={cn("flex-1 py-2 rounded-lg font-bold text-sm transition-all", newType === "event" ? "bg-tm-orange-light text-white" : "text-tm-blue-gray")}
                      >
                        Event
                      </button>
                      <button
                        onClick={() => setNewType("special_day")}
                        className={cn(
                          "flex-1 py-2 rounded-lg font-bold text-sm transition-all",
                          newType === "special_day"
                            ? "bg-tm-orange-dark text-white shadow-lg shadow-tm-orange-dark/20"
                            : "text-tm-blue-gray"
                        )}
                      >
                        Special Day
                      </button>
                    </div>

                    {newType === "event" && (
                      <div className="flex flex-col gap-2">
                        <p className="text-caption font-mono font-semibold uppercase text-tm-blue-gray tracking-[0.12em] px-1">Quest Tier</p>
                        <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                          {[
                            { id: "side", label: "Side", color: "bg-tm-yellow", text: "text-tm-purple-dark" },
                            { id: "main", label: "Main", color: "bg-tm-orange-light", text: "text-white" },
                            { id: "epic", label: "Epic", color: "bg-tm-orange-dark", text: "text-white" },
                          ].map((t) => (
                            <button
                              key={t.id}
                              onClick={() => setNewTier(t.id)}
                              className={cn(
                                "flex-1 py-2 rounded-lg font-bold text-xs transition-all",
                                newTier === t.id ? `${t.color} ${t.text} shadow-lg` : "text-tm-blue-gray hover:bg-white/5"
                              )}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <input
                      autoFocus
                      placeholder="Title"
                      className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-tm-yellow font-bold text-lg"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                    <div className={cn("grid gap-4", newType !== "special_day" ? "grid-cols-2" : "grid-cols-1")}>
                      <div className="p-4 rounded-2xl bg-tm-yellow/5 border border-tm-yellow/10">
                        <p className="text-caption font-mono font-semibold uppercase text-tm-blue-gray mb-1 tracking-[0.12em]">Date</p>
                        <input
                          type="date"
                          value={newDateStr}
                          onChange={(e) => setNewDateStr(e.target.value)}
                          className="bg-transparent font-bold text-lg outline-none w-full [color-scheme:light] dark:[color-scheme:dark]"
                        />
                      </div>
                      {newType !== "special_day" && (
                        <div className="p-4 rounded-2xl bg-tm-yellow/5 border border-tm-yellow/10">
                          <p className="text-caption font-mono font-semibold uppercase text-tm-blue-gray mb-1 tracking-[0.12em]">Time</p>
                          <input
                            type="time"
                            value={newTime}
                            onChange={(e) => setNewTime(e.target.value)}
                            className="bg-transparent font-bold text-lg outline-none w-full [color-scheme:light] dark:[color-scheme:dark]"
                          />
                        </div>
                      )}
                    </div>
                    
                    {newType === "special_day" && (
                      <button
                        onClick={() => setNewRepeatsYearly(!newRepeatsYearly)}
                        className={cn(
                          "w-full flex items-center justify-between p-4 rounded-2xl border transition-all",
                          newRepeatsYearly ? "bg-tm-yellow/10 border-tm-yellow text-tm-yellow" : "bg-white/5 border-white/10 text-tm-blue-gray"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <RotateCw size={18} className={cn(newRepeatsYearly && "animate-spin-slow")} />
                          <span className="text-sm font-bold">Repeats Yearly</span>
                        </div>
                        <div className={cn("w-10 h-5 rounded-full relative transition-colors", newRepeatsYearly ? "bg-tm-yellow" : "bg-tm-blue-gray/30")}>
                          <motion.div
                            animate={{ x: newRepeatsYearly ? 20 : 2 }}
                            className="absolute top-1 w-3 h-3 bg-white rounded-full"
                          />
                        </div>
                      </button>
                    )}

                    <button
                      onClick={() => setNewNotification(!newNotification)}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-2xl border transition-all",
                        newNotification ? "bg-tm-orange-dark/10 border-tm-orange-dark text-tm-orange-dark" : "bg-white/5 border-white/10 text-tm-blue-gray"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {newNotification ? <Bell size={18} /> : <BellOff size={18} />}
                        <span className="text-sm font-bold">Browser Notification</span>
                      </div>
                      <div className={cn("w-10 h-5 rounded-full relative transition-colors", newNotification ? "bg-tm-orange-dark" : "bg-tm-blue-gray/30")}>
                        <motion.div
                          animate={{ x: newNotification ? 20 : 2 }}
                          className="absolute top-1 w-3 h-3 bg-white rounded-full"
                        />
                      </div>
                    </button>

                    <button
                      onClick={handleAddEvent}
                      className="w-full bg-tm-yellow text-tm-purple-dark font-black py-4 rounded-2xl shadow-xl hover:bg-tm-yellow/80 transition-colors"
                    >
                      {editingEvent ? "UPDATE ITEM" : "SAVE ITEM"}
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 h-full min-h-[600px]">
            {/* Desktop Full Calendar */}
            <GlassCard className="hidden lg:flex flex-col p-0 overflow-x-auto thin-scrollbar border-tm-blue-gray/10">
              <div className="min-w-[700px] flex flex-col h-full">
                <div className="p-6 flex items-center justify-between bg-white/5 border-b border-tm-blue-gray/10">
                  {isPickingMonth ? (
                    <div className="flex items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
                      <div className="relative group/sel">
                        <select 
                          value={format(currentDate, "MM")}
                          onChange={(e) => {
                            const newDate = new Date(currentDate);
                            newDate.setMonth(parseInt(e.target.value) - 1);
                            setCurrentDate(newDate);
                          }}
                          className="appearance-none bg-tm-yellow/10 border border-tm-yellow/30 rounded-xl px-4 py-2 text-sm font-semibold uppercase tracking-widest outline-none focus:border-tm-yellow transition-all cursor-pointer pr-10 text-tm-purple-dark dark:text-tm-yellow hover:bg-tm-yellow/20"
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i} value={(i + 1).toString().padStart(2, '0')} className="bg-tm-purple-dark text-white font-sans uppercase">
                              {format(new Date(2024, i, 1), "MMMM")}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-tm-yellow/50 group-hover/sel:text-tm-yellow pointer-events-none transition-colors" />
                      </div>

                      <div className="relative group/sel">
                        <select
                          value={format(currentDate, "yyyy")}
                          onChange={(e) => {
                            const newDate = new Date(currentDate);
                            newDate.setFullYear(parseInt(e.target.value));
                            setCurrentDate(newDate);
                          }}
                          className="appearance-none bg-tm-yellow/10 border border-tm-yellow/30 rounded-xl px-4 py-2 text-sm font-semibold uppercase tracking-widest outline-none focus:border-tm-yellow transition-all cursor-pointer pr-10 text-tm-purple-dark dark:text-tm-yellow hover:bg-tm-yellow/20"
                        >
                          {Array.from({ length: 101 }, (_, i) => {
                            const year = new Date().getFullYear() - 50 + i;
                            return <option key={year} value={year} className="bg-tm-purple-dark text-white font-sans">{year}</option>;
                          })}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-tm-yellow/50 group-hover/sel:text-tm-yellow pointer-events-none transition-colors" />
                      </div>
                      
                      <button 
                        onClick={() => setIsPickingMonth(false)} 
                        className="p-2 bg-tm-yellow text-tm-purple-dark rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all"
                      >
                        <Check size={18} />
                      </button>
                    </div>
                  ) : (
                    <h2 
                      onClick={() => setIsPickingMonth(true)}
                      className="text-2xl font-display font-bold text-tm-purple-dark dark:text-tm-yellow cursor-pointer hover:opacity-70 transition-opacity flex items-center gap-2 group"
                    >
                      {format(currentDate, "MMMM yyyy")}
                      <ChevronDown size={18} className="opacity-0 group-hover:opacity-100 transition-all" />
                    </h2>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                      className="p-2 hover:bg-tm-yellow/20 rounded-xl transition-colors"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      onClick={() => {
                        setCurrentDate(new Date());
                        setSelectedDate(new Date());
                      }}
                      className="px-4 py-2 hover:bg-tm-yellow/20 rounded-xl transition-colors font-bold text-sm"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                      className="p-2 hover:bg-tm-yellow/20 rounded-xl transition-colors"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 border-b border-tm-blue-gray/10 bg-tm-blue-gray/5">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="py-3 text-center text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray/60">
                      {day}
                    </div>
                  ))}
                </div>

                <motion.div
                  key={monthKey}
                  initial={{ opacity: 0, x: monthDir * 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-1 grid grid-cols-7 auto-rows-fr"
                >
                  {days.map((day) => {
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isSelected = isSameDay(day, selectedDate);
                    const dayEvents = events
                      .filter(e => isSameDay(new Date(e.startTime || e.date), day))
                      .filter(e => {
                        if (e.type === "special_day" && e.startTime) {
                          const d = new Date(e.startTime);
                          return d.getHours() !== 0 || d.getMinutes() !== 0;
                        }
                        return true;
                      })
                      .sort((a, b) => {
                        if (a.type === "special_day" && b.type !== "special_day") return -1;
                        if (a.type !== "special_day" && b.type === "special_day") return 1;
                        return 0;
                      });
                    const dayMood = moods.find(m => m.date === format(day, "yyyy-MM-dd"))?.mood;
                    const persona = dayPersona(day);

                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={cn(
                          "relative p-2 border-r border-b border-tm-blue-gray/5 text-left transition-all flex flex-col gap-1 min-h-[100px]",
                          // A Persona day dresses the whole box in that game's look
                          persona && `p-day p-day-${persona}`,
                          !isCurrentMonth ? "text-tm-blue-gray/20 bg-tm-blue-gray/5" : "text-foreground",
                          isSelected ? "bg-tm-yellow/10" : "hover:bg-tm-yellow/5",
                          dayMood === "good" && "bg-tm-yellow/[0.03]",
                          dayMood === "bad" && "bg-tm-orange-dark/[0.03]"
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <span className="flex items-center gap-1.5">
                            <span className={cn(
                              "text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full transition-all",
                              isToday ? "bg-tm-orange-dark text-white shadow-lg shadow-tm-orange-dark/20 scale-110" : ""
                            )}>
                              {format(day, "d")}
                            </span>
                            {persona && <PersonaDayBadge style={persona} size={12} className={cn("relative", !isCurrentMonth && "opacity-40")} />}
                          </span>
                          {dayMood && (
                            <span className="text-sm opacity-80 group-hover:opacity-100 transition-all">
                              {dayMood === "good" ? "😇" : dayMood === "bad" ? "😢" : "😐"}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col gap-1 mt-1 overflow-hidden">
                          {dayEvents.slice(0, 3).map((event) => {
                            const sdColors = event.type === "special_day" ? getSpecialDayColors() : null;
                            return (
                              <div
                                key={event.id}
                                className={cn(
                                  "px-1.5 py-0.5 rounded text-micro font-bold truncate border-l-2",
                                  event.type === "special_day"
                                    ? `${sdColors?.bg}/20 ${sdColors?.text} ${sdColors?.border}`
                                    : event.type === "task"
                                      ? (event.completed ? "bg-tm-blue-gray/10 text-tm-blue-gray/50 border-tm-blue-gray/30" : "bg-tm-yellow/20 text-tm-purple-dark border-tm-yellow")
                                      : "bg-tm-orange-light/20 text-tm-orange-dark border-tm-orange-light"
                                )}
                              >
                                {event.title}
                              </div>
                            )
                          })}
                          {dayEvents.length > 3 && (
                            <div className="text-micro font-mono font-semibold text-tm-blue-gray text-center">+{dayEvents.length - 3} more</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              </div>
            </GlassCard>

            {/* Mobile Mini Calendar */}
            <GlassCard className="lg:hidden p-4 space-y-4">
              <div className="flex items-center justify-between">
                {isPickingMonth ? (
                  <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-300">
                    <div className="relative">
                      <select 
                        value={format(currentDate, "MM")}
                        onChange={(e) => {
                          const newDate = new Date(currentDate);
                          newDate.setMonth(parseInt(e.target.value) - 1);
                          setCurrentDate(newDate);
                        }}
                        className="appearance-none bg-tm-yellow/10 border border-tm-yellow/20 rounded-lg px-3 py-2 text-caption font-mono font-semibold uppercase tracking-[0.12em] outline-none focus:border-tm-yellow text-tm-purple-dark dark:text-tm-yellow pr-8"
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i} value={(i + 1).toString().padStart(2, '0')} className="bg-tm-purple-dark text-white">
                            {format(new Date(2024, i, 1), "MMM")}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tm-yellow/50 pointer-events-none" />
                    </div>

                    <div className="relative">
                      <select
                        value={format(currentDate, "yyyy")}
                        onChange={(e) => {
                          const newDate = new Date(currentDate);
                          newDate.setFullYear(parseInt(e.target.value));
                          setCurrentDate(newDate);
                        }}
                        className="appearance-none bg-tm-yellow/10 border border-tm-yellow/20 rounded-lg px-3 py-2 text-caption font-mono font-semibold uppercase tracking-[0.12em] outline-none focus:border-tm-yellow text-tm-purple-dark dark:text-tm-yellow pr-8"
                      >
                        {Array.from({ length: 101 }, (_, i) => {
                          const year = new Date().getFullYear() - 50 + i;
                          return <option key={year} value={year} className="bg-tm-purple-dark text-white">{year}</option>;
                        })}
                      </select>
                      <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tm-yellow/50 pointer-events-none" />
                    </div>
                    
                    <button 
                      onClick={() => setIsPickingMonth(false)} 
                      className="p-2 bg-tm-yellow text-tm-purple-dark rounded-lg shadow-lg"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <h2 
                    onClick={() => setIsPickingMonth(true)}
                    className="text-xl font-bold text-tm-purple-dark dark:text-tm-yellow flex items-center gap-1.5 cursor-pointer"
                  >
                    {format(currentDate, "MMMM yyyy")}
                    <ChevronDown size={16} className="text-tm-blue-gray/50" />
                  </h2>
                )}
                <div className="flex gap-1">
                  <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 text-tm-blue-gray hover:text-tm-yellow"><ChevronLeft size={20} /></button>
                  <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 text-tm-blue-gray hover:text-tm-yellow"><ChevronRight size={20} /></button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={i} className="text-center text-caption font-black text-tm-blue-gray/70 pb-2">{d}</div>
                ))}
              </div>
              <motion.div
                key={monthKey}
                initial={{ opacity: 0, x: monthDir * 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-7 gap-1 -mt-3"
              >
                {days.map((day) => {
                  const isToday = isSameDay(day, new Date());
                  const isCurrentMonth = isSameMonth(day, monthStart);
                  const isSelected = isSameDay(day, selectedDate);
                  const dayEvents = events.filter(e => isSameDay(new Date(e.startTime || e.date), day));
                  const hasTask = dayEvents.some(e => e.type === "task");
                  const hasEvent = dayEvents.some(e => e.type === "event");
                  const specialDays = dayEvents.filter(e => e.type === "special_day");
                  const hasSpecialDay = specialDays.length > 0;
                  const sdColor = hasSpecialDay ? getSpecialDayColors() : null;
                  const persona = dayPersona(day);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "aspect-square flex flex-col items-center justify-center rounded-xl transition-colors relative",
                        !isCurrentMonth ? "opacity-20" : "opacity-100",
                        isSelected ? "text-tm-purple-dark" : "hover:bg-white/5",
                        isToday && !isSelected && "border border-tm-orange-dark text-tm-orange-dark"
                      )}
                    >
                      {isSelected && (
                        <motion.span
                          layoutId="calendar-selected-day"
                          className="absolute inset-0 rounded-xl bg-tm-yellow shadow-lg -z-10"
                          transition={SPRING.bubble}
                        />
                      )}
                      {persona && <PersonaDayBadge style={persona} size={8} className="absolute -top-0.5 -right-0.5" />}
                      <span className="text-sm font-bold">{format(day, "d")}</span>
                      <div className="flex gap-0.5 mt-0.5 h-1">
                        {hasTask && <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-tm-purple-dark" : "bg-tm-yellow")} />}
                        {hasEvent && <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-tm-purple-dark/60" : "bg-tm-orange-light")} />}
                        {hasSpecialDay && <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-tm-purple-dark/40" : sdColor?.bg)} />}
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            </GlassCard>

            <div className="space-y-6 flex flex-col">
              <div className="flex items-center justify-between pl-2">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">{format(selectedDate, "MMMM d")}</h3>
                  <p className="text-xs font-mono font-semibold uppercase text-tm-blue-gray tracking-[0.12em] flex items-center gap-2">
                    {format(selectedDate, "EEEE")}
                    {dayPersona(selectedDate) && (
                      <span className="inline-flex items-center gap-1.5">
                        <PersonaDayBadge style={dayPersona(selectedDate)!} size={10} />
                        {PERSONA_NAMES[dayPersona(selectedDate)!]} day
                      </span>
                    )}
                  </p>
                  {selectedLocation && (
                    <div className="flex items-center gap-1.5 mt-1 text-tm-blue-gray/60">
                      <MapPin size={10} className="text-tm-orange-light" />
                      <span className="text-caption font-mono font-semibold uppercase tracking-[0.12em]">
                        {selectedLocation}
                      </span>
                    </div>
                  )}
                </div>
                {selectedEvents.length > 0 && (
                  <span className="whitespace-nowrap bg-tm-yellow/20 text-tm-yellow px-3 py-1 rounded-full text-caption font-mono font-semibold uppercase tracking-[0.12em]">
                    {selectedEvents.length} items
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                <AnimatePresence mode="popLayout" initial={false}>
                {selectedEvents.length === 0 ? (
                  <motion.div
                    key={`empty-${format(selectedDate, "yyyy-MM-dd")}`}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 0.4, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="flex flex-col items-center justify-center h-48 text-center border-2 border-dashed border-tm-blue-gray/20 rounded-3xl p-8"
                  >
                    <CalendarIcon size={32} className="mb-4 text-tm-blue-gray" />
                    <p className="text-sm font-bold">No plans for today.</p>
                    <p className="text-xs">Click the + button to add items.</p>
                  </motion.div>
                ) :
                  selectedEvents.map((event) => {
                    const sdColors = event.type === "special_day" ? getSpecialDayColors() : null;
                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                        key={event.id}
                      >
                        <GlassCard className={cn(
                          "p-4 space-y-3 group",
                          event.type === "special_day" ? `border-l-4 border-l-transparent ${sdColors?.shadow}` :
                            event.type === "task" ? "border-l-4 border-l-tm-blue-gray/30" :
                              event.tier === "epic" ? "border-l-4 border-l-tm-orange-dark shadow-[0_0_15px_rgba(239,68,68,0.1)]" :
                                event.tier === "main" ? "border-l-4 border-l-tm-orange-light" :
                                  "border-l-4 border-l-tm-yellow"
                        )}>
                          {event.type === "special_day" && <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl", sdColors?.bg)} />}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {event.type === "task" && (
                                <motion.button
                                  onClick={updatingEvents.has(event.id) ? undefined : () => handleToggle(event.id, event.completed)}
                                  disabled={updatingEvents.has(event.id)}
                                  whileTap={{ scale: 0.85 }}
                                  className={cn("p-1 -m-1", updatingEvents.has(event.id) && "pointer-events-none")}
                                  aria-label={event.completed ? "Mark as not done" : "Mark as done"}
                                  aria-pressed={event.completed}
                                >
                                  <CompletionCheck
                                    done={event.completed}
                                    className={cn(
                                      "w-5 h-5 rounded-md border-2 transition-colors",
                                      event.completed ? "bg-tm-yellow border-tm-yellow" : "border-tm-blue-gray/20 hover:border-tm-yellow"
                                    )}
                                    checkSize={12}
                                    checkClassName="text-tm-purple-dark"
                                  />
                                </motion.button>
                              )}
                              <h4 className={cn("font-bold text-sm transition-colors", event.completed && "text-tm-blue-gray")}><StrikeText done={event.completed}>{event.title}</StrikeText></h4>
                            </div>
                            <div className="flex gap-2 items-center">
                              {!event.isApi && (
                                <button
                                  onClick={() => openEdit(event)}
                                  className="opacity-100 lg:opacity-0 group-hover:opacity-100 p-1 text-tm-blue-gray hover:text-tm-yellow transition-all"
                                >
                                  <Edit2 size={14} />
                                </button>
                              )}
                              {(!event.isApi || event.type === "special_day") && (
                                <button
                                  onClick={() => handleDelete(event.id)}
                                  className="opacity-100 lg:opacity-0 group-hover:opacity-100 p-1 text-tm-blue-gray hover:text-red-500 transition-all"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                          {event.description && (
                            <p className="text-xs text-tm-blue-gray line-clamp-2">{event.description}</p>
                          )}
                          <div className="flex items-center justify-between gap-4 text-caption font-mono font-semibold uppercase text-tm-blue-gray tracking-[0.12em]">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1.5">
                                <Clock size={12} /> <span>{event.startTime ? format(new Date(event.startTime), "HH:mm") : "All Day"}</span>
                              </div>
                              <span className={cn(
                                "px-2 py-0.5 rounded",
                                event.type === "special_day" ? `${sdColors?.bg}/10 ${sdColors?.text}` :
                                  event.type === "task" ? "bg-tm-blue-gray/10 text-tm-blue-gray/60" :
                                    event.tier === "epic" ? "bg-tm-orange-dark/20 text-tm-orange-dark border border-tm-orange-dark/30" :
                                      event.tier === "main" ? "bg-tm-orange-light/10 text-tm-orange-light" :
                                        "bg-tm-yellow/10 text-tm-yellow"
                              )}>
                                {event.type === "special_day" ? (
                                  <span className="flex items-center gap-1">
                                    Special Day
                                  </span>
                                ) : event.type === "event" ? `${event.tier} event` : event.type}
                              </span>
                            </div>
                            {event.notification && (
                              <div className="flex items-center gap-1 text-tm-orange-light">
                                <Bell size={12} fill="currentColor" className="opacity-50" />
                                <span>Alert On</span>
                              </div>
                            )}
                          </div>
                        </GlassCard>
                      </motion.div>
                    )
                  })
                }
                </AnimatePresence>
              </div>
            </div>
          </div>
          <div className="flex justify-center pt-8">
            <button
              onClick={() => setIsTabularOpen(true)}
              className="flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-tm-blue-gray hover:text-tm-yellow font-mono font-semibold uppercase tracking-[0.12em] text-xs transition-all group"
            >
              <Search size={16} className="group-hover:scale-110 transition-transform" />
              View All Items in Tabular Format
            </button>
          </div>

          <TabularViewModal
            title="Calendar Archive"
            isOpen={isTabularOpen}
            onClose={() => setIsTabularOpen(false)}
            data={sortedAndFilteredArchive}
            columns={[
              {
                header: "Date", key: "date", render: (val, row) => {
                  const base = format(new Date(row.startTime || row.date), "yyyy-MM-dd");
                  const parsed = new Date(base + "T00:00:00");
                  const year = parsed.getFullYear().toString();
                  const shortDate = parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  return (
                    <span className="font-mono text-tm-blue-gray whitespace-nowrap">
                      <span className="sm:hidden flex flex-col leading-tight">
                        <span className="text-caption opacity-50">{year}</span>
                        <span>{shortDate}</span>
                      </span>
                      <span className="hidden sm:inline">{base}</span>
                    </span>
                  );
                }
              },
              {
                header: "Time", key: "startTime", render: (val) => (
                  <span className="text-tm-blue-gray">
                    {val ? format(new Date(val), "HH:mm") : "All Day"}
                  </span>
                )
              },
              {
                header: "Title", key: "title", wrap: true, render: (val) => (
                  <span className="font-bold text-white/90 leading-tight block py-1">{val}</span>
                )
              },
              {
                header: "Type", key: "type", render: (val, row) => (
                  <div className="flex items-center justify-center">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-caption font-mono font-semibold uppercase whitespace-nowrap tracking-[0.12em]",
                      val === "task" ? "bg-tm-yellow/10 text-tm-yellow" : "bg-tm-orange-light/10 text-tm-orange-light"
                    )}>
                      <span className="sm:inline hidden">{val?.replace("_", " ")}</span>
                      <span className="sm:hidden inline">{row.type === "task" ? "T" : row.type === "special_day" ? "S" : "E"}</span>
                    </span>
                  </div>
                )
              },
              {
                header: "Status", key: "completed", render: (val, row) => {
                  if (row.type === "task") {
                    return (
                      <div className="flex items-center justify-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-caption font-mono font-semibold uppercase whitespace-nowrap tracking-[0.12em]",
                          val ? "bg-green-500/20 text-green-500" : "bg-tm-blue-gray/20 text-tm-blue-gray"
                        )}>
                          <span className="sm:inline hidden">{val ? "Completed" : "Pending"}</span>
                          <span className="sm:hidden inline">{val ? "✓" : "..."}</span>
                        </span>
                      </div>
                    );
                  }

                  const isUpcoming = new Date(row.startTime || row.date) > new Date();
                  return (
                    <div className="flex items-center justify-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-caption font-mono font-semibold uppercase whitespace-nowrap tracking-[0.12em]",
                        isUpcoming ? "bg-tm-orange-light/10 text-tm-orange-light" : "bg-tm-blue-gray/10 text-tm-blue-gray"
                      )}>
                        <span className="sm:inline hidden">{isUpcoming ? "Upcoming" : "Passed"}</span>
                        <span className="sm:hidden inline">{isUpcoming ? "⌚" : "⌛"}</span>
                      </span>
                    </div>
                  );
                }
              }
            ]}
          />
        </>
      )}
    </div>
  );
}
