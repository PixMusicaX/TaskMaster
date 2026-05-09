"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import GlassCard from "@/components/glass-card";
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, X, Trash2, Check, Bell, BellOff, Edit2, Swords, Brain, Coins, HeartPulse, Users, Calendar as CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, setHours, setMinutes } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { getEventsByDateRange, addEvent, toggleEventCompletion, deleteEvent, updateEvent, getAllEvents } from "@/app/actions/events";
import { getProfile } from "@/app/actions/gamification";
import { getRecentNotes } from "@/app/actions/notes";
import { getReliefHistory } from "@/app/actions/relief";
import { cn } from "@/lib/utils";
import { PremiumLoader } from "@/components/loader";
import TabularViewModal, { Column } from "@/components/TabularViewModal";
import { Search } from "lucide-react";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [reliefs, setReliefs] = useState<any[]>([]);
  const [moods, setMoods] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("task");
  const [newTier, setNewTier] = useState("main");
  const [newTime, setNewTime] = useState("12:00");
  const [newNotification, setNewNotification] = useState(true);
  const [newDateStr, setNewDateStr] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isTabularOpen, setIsTabularOpen] = useState(false);
  const [allEventsForTable, setAllEventsForTable] = useState<any[]>([]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const { startDate, endDate, days, monthStart } = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    return { startDate, endDate, days, monthStart };
  }, [currentDate]);

  const fetchEvents = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const [eventsData, profileData, notesData, reliefData] = await Promise.all([
        getEventsByDateRange(startDate, endDate),
        getProfile(),
        getRecentNotes(60),
        getReliefHistory(format(startDate, "yyyy-MM-dd"))
      ]);
      setEvents(eventsData);
      setProfile(profileData);
      setMoods(notesData);
      setReliefs(reliefData);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, [startDate, endDate]);

  const initialLoad = useRef(true);

  useEffect(() => {
    fetchEvents(initialLoad.current);
    initialLoad.current = false;
  }, [fetchEvents]);

  useEffect(() => {
    async function fetchArchive() {
      const start = new Date();
      start.setFullYear(start.getFullYear() - 5);
      const end = new Date();
      end.setFullYear(end.getFullYear() + 2);
      const data = await getEventsByDateRange(start, end);
      setAllEventsForTable(data);
    }
    fetchArchive();
  }, []);

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

  function openEdit(event: any) {
    setEditingEvent(event);
    setNewTitle(event.title);
    setNewType(event.type);
    setNewTier(event.tier || "main");
    const dateObj = new Date(event.startTime || event.date);
    setNewTime(format(dateObj, "HH:mm"));
    setNewDateStr(format(dateObj, "yyyy-MM-dd"));
    setNewNotification(event.notification ?? true);
    setSelectedDate(dateObj);
    setShowAdd(true);
  }

  async function handleAddEvent() {
    if (!newTitle) return;

    const [hours, minutes] = newTime.split(":").map(Number);
    const baseDate = new Date(newDateStr);
    const eventTime = setMinutes(setHours(baseDate, hours), minutes);

    const eventData = {
      title: newTitle,
      date: newDateStr,
      type: newType,
      tier: newType === "task" ? "side" : newTier,
      startTime: eventTime,
      notification: newNotification,
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
    setEditingEvent(null);
    setShowAdd(false);
  }

  async function handleDelete(id: string) {
    await deleteEvent(id);
    await fetchEvents(false);
    window.dispatchEvent(new CustomEvent("profile-updated"));
  }

  async function handleToggle(id: string, current: boolean) {
    await toggleEventCompletion(id, !current);
    await fetchEvents(false);
    window.dispatchEvent(new CustomEvent("profile-updated"));
  }

  const selectedEvents = events.filter(e => isSameDay(new Date(e.startTime || e.date), selectedDate));

  return (
    <div className="p-4 pt-12 md:p-12 md:pt-16 max-w-7xl mx-auto space-y-8">
      {isLoading ? (
        <PremiumLoader />
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black text-tm-purple-dark dark:text-tm-yellow">Calendar</h1>
              <p className="text-tm-blue-gray font-medium">Plan your weeks and months ahead.</p>

              {profile && (
                <div className="flex gap-4 mt-4">
                  <div className="flex items-center gap-2 bg-tm-orange-dark/10 px-3 py-1.5 rounded-xl border border-tm-orange-dark/20">
                    <Swords size={14} className="text-tm-orange-dark" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-tm-orange-dark">Strength: {profile.strength} XP</span>
                  </div>
                  <div className="flex items-center gap-2 bg-tm-orange-light/10 px-3 py-1.5 rounded-xl border border-tm-orange-light/20">
                    <Coins size={14} className="text-tm-orange-light" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-tm-orange-light">Wealth: {profile.wealth} XP</span>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowAdd(true);
              }}
              className="flex items-center gap-2 bg-tm-orange-dark/80 backdrop-blur-xl saturate-150 text-white px-6 py-3 rounded-2xl font-black hover:scale-105 transition-transform shadow-xl border border-tm-orange-dark/30 relative z-10"
            >
              <Plus size={20} /> New Item
            </button>
          </div>

          <AnimatePresence>
            {showAdd && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed inset-0 z-[200] w-full h-full flex items-center justify-center p-6 bg-black/40 backdrop-blur-md"
              >
                <GlassCard className="w-full max-w-md space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">{editingEvent ? "Edit" : "New"} {newType === "task" ? "Task" : "Event"}</h2>
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
                    </div>

                    {newType === "event" && (
                      <div className="flex flex-col gap-2">
                        <p className="text-[10px] font-black uppercase text-tm-blue-gray tracking-widest px-1">Quest Tier</p>
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-tm-yellow/5 border border-tm-yellow/10">
                        <p className="text-[10px] font-black uppercase text-tm-blue-gray mb-1">Date</p>
                        <input
                          type="date"
                          value={newDateStr}
                          onChange={(e) => setNewDateStr(e.target.value)}
                          className="bg-transparent font-bold text-lg outline-none w-full [color-scheme:light] dark:[color-scheme:dark]"
                        />
                      </div>
                      <div className="p-4 rounded-2xl bg-tm-yellow/5 border border-tm-yellow/10">
                        <p className="text-[10px] font-black uppercase text-tm-blue-gray mb-1">Time</p>
                        <input
                          type="time"
                          value={newTime}
                          onChange={(e) => setNewTime(e.target.value)}
                          className="bg-transparent font-bold text-lg outline-none w-full [color-scheme:light] dark:[color-scheme:dark]"
                        />
                      </div>
                    </div>

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
                  <h2 className="text-2xl font-black text-tm-purple-dark dark:text-tm-yellow">{format(currentDate, "MMMM yyyy")}</h2>
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
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <div key={day} className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-tm-blue-gray/60">
                    {day}
                  </div>
                ))}
              </div>

              <div className="flex-1 grid grid-cols-7 auto-rows-fr">
                {days.map((day) => {
                  const isToday = isSameDay(day, new Date());
                  const isCurrentMonth = isSameMonth(day, monthStart);
                  const isSelected = isSameDay(day, selectedDate);
                  const dayEvents = events.filter(e => isSameDay(new Date(e.startTime || e.date), day));
                  const dayMood = moods.find(m => m.date === format(day, "yyyy-MM-dd"))?.mood;

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "relative p-2 border-r border-b border-tm-blue-gray/5 text-left transition-all flex flex-col gap-1 min-h-[100px]",
                        !isCurrentMonth ? "text-tm-blue-gray/20 bg-tm-blue-gray/5" : "text-foreground",
                        isSelected ? "bg-tm-yellow/10" : "hover:bg-tm-yellow/5",
                        dayMood === "good" && "bg-tm-yellow/[0.03]",
                        dayMood === "bad" && "bg-tm-orange-dark/[0.03]"
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <span className={cn(
                          "text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full transition-all",
                          isToday ? "bg-tm-orange-dark text-white shadow-lg shadow-tm-orange-dark/20 scale-110" : ""
                        )}>
                          {format(day, "d")}
                        </span>
                        {dayMood && (
                          <span className="text-sm opacity-80 group-hover:opacity-100 transition-all">
                            {dayMood === "good" ? "😇" : dayMood === "bad" ? "😢" : "😐"}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-1 mt-1 overflow-hidden">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[8px] font-bold truncate border-l-2",
                              event.type === "task"
                                ? (event.completed ? "bg-tm-blue-gray/10 text-tm-blue-gray/50 border-tm-blue-gray/30" : "bg-tm-yellow/20 text-tm-purple-dark border-tm-yellow")
                                : "bg-tm-orange-light/20 text-tm-orange-dark border-tm-orange-light"
                            )}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[8px] font-black text-tm-blue-gray text-center">+{dayEvents.length - 3} more</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </GlassCard>

          {/* Mobile Mini Calendar */}
          <GlassCard className="lg:hidden p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-tm-purple-dark dark:text-tm-yellow">{format(currentDate, "MMMM yyyy")}</h2>
              <div className="flex gap-1">
                <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 text-tm-blue-gray hover:text-tm-yellow"><ChevronLeft size={20} /></button>
                <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 text-tm-blue-gray hover:text-tm-yellow"><ChevronRight size={20} /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <div key={i} className="text-center text-[10px] font-black text-tm-blue-gray/40 pb-2">{d}</div>
              ))}
              {days.map((day) => {
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isSelected = isSameDay(day, selectedDate);
                const dayEvents = events.filter(e => isSameDay(new Date(e.startTime || e.date), day));
                const hasTask = dayEvents.some(e => e.type === "task");
                const hasEvent = dayEvents.some(e => e.type === "event");

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "aspect-square flex flex-col items-center justify-center rounded-xl transition-all relative",
                      !isCurrentMonth ? "opacity-20" : "opacity-100",
                      isSelected ? "bg-tm-yellow text-tm-purple-dark shadow-lg" : "hover:bg-white/5",
                      isToday && !isSelected && "border border-tm-orange-dark text-tm-orange-dark"
                    )}
                  >
                    <span className="text-sm font-bold">{format(day, "d")}</span>
                    <div className="flex gap-0.5 mt-0.5 h-1">
                      {hasTask && <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-tm-purple-dark" : "bg-tm-yellow")} />}
                      {hasEvent && <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-tm-purple-dark/60" : "bg-tm-orange-light")} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </GlassCard>

            <div className="space-y-6 flex flex-col">
              <div className="flex items-center justify-between pl-2">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">{format(selectedDate, "MMMM d")}</h3>
                  <p className="text-xs font-black uppercase text-tm-blue-gray tracking-widest">{format(selectedDate, "EEEE")}</p>
                  {reliefs.find(r => r.date === format(selectedDate, "yyyy-MM-dd"))?.location && (
                    <div className="flex items-center gap-1.5 mt-1 text-tm-blue-gray/60">
                      <MapPin size={10} className="text-tm-orange-light" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {reliefs.find(r => r.date === format(selectedDate, "yyyy-MM-dd")).location}
                      </span>
                    </div>
                  )}
                </div>
                {selectedEvents.length > 0 && (
                  <span className="bg-tm-yellow/20 text-tm-yellow px-3 py-1 rounded-full text-[10px] font-black uppercase">
                    {selectedEvents.length} items
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                {selectedEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center opacity-40 border-2 border-dashed border-tm-blue-gray/20 rounded-3xl p-8">
                    <CalendarIcon size={32} className="mb-4 text-tm-blue-gray" />
                    <p className="text-sm font-bold">No plans for today.</p>
                    <p className="text-xs">Click the + button to add items.</p>
                  </div>
                ) : (
                  selectedEvents.map((event) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={event.id}
                    >
                      <GlassCard className={cn(
                        "p-4 space-y-3 group",
                        event.type === "task" ? "border-l-4 border-l-tm-blue-gray/30" :
                          event.tier === "epic" ? "border-l-4 border-l-tm-orange-dark shadow-[0_0_15px_rgba(239,68,68,0.1)]" :
                            event.tier === "main" ? "border-l-4 border-l-tm-orange-light" :
                              "border-l-4 border-l-tm-yellow"
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {event.type === "task" && (
                              <button
                                onClick={() => handleToggle(event.id, event.completed)}
                                className={cn(
                                  "w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center",
                                  event.completed ? "bg-tm-yellow border-tm-yellow" : "border-tm-blue-gray/20 hover:border-tm-yellow"
                                )}
                              >
                                {event.completed && <Check size={12} className="text-tm-purple-dark" />}
                              </button>
                            )}
                            <h4 className={cn("font-bold text-sm", event.completed && "line-through text-tm-blue-gray")}>{event.title}</h4>
                          </div>
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={() => openEdit(event)}
                              className="opacity-100 lg:opacity-0 group-hover:opacity-100 p-1 text-tm-blue-gray hover:text-tm-yellow transition-all"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(event.id)}
                              className="opacity-100 lg:opacity-0 group-hover:opacity-100 p-1 text-tm-blue-gray hover:text-red-500 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        {event.description && (
                          <p className="text-xs text-tm-blue-gray line-clamp-2">{event.description}</p>
                        )}
                        <div className="flex items-center justify-between gap-4 text-[10px] font-black uppercase text-tm-blue-gray">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                              <Clock size={12} /> <span>{event.startTime ? format(new Date(event.startTime), "HH:mm") : "All Day"}</span>
                            </div>
                            <span className={cn(
                              "px-2 py-0.5 rounded",
                              event.type === "task" ? "bg-tm-blue-gray/10 text-tm-blue-gray/60" :
                                event.tier === "epic" ? "bg-tm-orange-dark/20 text-tm-orange-dark border border-tm-orange-dark/30" :
                                  event.tier === "main" ? "bg-tm-orange-light/10 text-tm-orange-light" :
                                    "bg-tm-yellow/10 text-tm-yellow"
                            )}>
                              {event.type === "event" ? `${event.tier} ` : ""}{event.type}
                            </span>
                          </div>
                          {event.notification && (
                            <div className="flex items-center gap-1 text-tm-orange-dark">
                              <Bell size={12} fill="currentColor" className="opacity-50" />
                              <span>Alert On</span>
                            </div>
                          )}
                        </div>
                      </GlassCard>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-center pt-8">
            <button
              onClick={() => setIsTabularOpen(true)}
              className="flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-tm-blue-gray hover:text-tm-yellow font-black uppercase tracking-widest text-xs transition-all group"
            >
              <Search size={16} className="group-hover:scale-110 transition-transform" />
              View All Items in Tabular Format
            </button>
          </div>

          <TabularViewModal
            title="Calendar Archive"
            isOpen={isTabularOpen}
            onClose={() => setIsTabularOpen(false)}
            data={[...allEventsForTable].reverse()}
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
                        <span className="text-[10px] opacity-50">{year}</span>
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
                header: "Title", key: "title", render: (val) => (
                  <span className="font-bold text-white/90">{val}</span>
                )
              },
              {
                header: "Type", key: "type", render: (val) => (
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-black uppercase",
                    val === "task" ? "bg-tm-yellow/10 text-tm-yellow" : "bg-tm-orange-light/10 text-tm-orange-light"
                  )}>
                    {val}
                  </span>
                )
              },
              {
                header: "Status", key: "completed", render: (val, row) => {
                  if (row.type === "task") {
                    return (
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-black uppercase",
                        val ? "bg-green-500/20 text-green-500" : "bg-tm-blue-gray/20 text-tm-blue-gray"
                      )}>
                        {val ? "Completed" : "Pending"}
                      </span>
                    );
                  }
                  
                  const isUpcoming = new Date(row.startTime || row.date) > new Date();
                  return (
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-black uppercase",
                      isUpcoming ? "bg-tm-orange-light/10 text-tm-orange-light" : "bg-tm-blue-gray/10 text-tm-blue-gray"
                    )}>
                      {isUpcoming ? "Upcoming" : "Passed"}
                    </span>
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
