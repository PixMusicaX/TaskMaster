"use client";

import { useState, useEffect, useRef } from "react";
import { HistoryDay, getHistory } from "@/app/actions/history";
import GlassCard from "@/components/glass-card";
import { format, parseISO, subDays } from "date-fns";
import { Calendar, CheckSquare, FileText, CalendarDays, Search, Star, Activity, MapPin, CloudSun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import HabitIconRender from "@/components/HabitIconRender";
import { formatReliefTemp } from "@/lib/weather";

export default function HistoryList({ initialData, initialEndDateStr }: { initialData: HistoryDay[], initialEndDateStr: string }) {
  const [data, setData] = useState<HistoryDay[]>(initialData);
  const [currentEndDateStr, setCurrentEndDateStr] = useState(initialEndDateStr);
  const [loading, setLoading] = useState(false);
  
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const searchTimeoutRef = useRef<any>(null);

  // If search is toggled off, clear the query
  useEffect(() => {
    if (!isSearchVisible) {
      setQuery("");
    }
  }, [isSearchVisible]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (query.trim() === "") {
      // Revert to initial paginated data
      if (isSearching) {
         setData(initialData);
         setCurrentEndDateStr(initialEndDateStr);
         setIsSearching(false);
      }
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const searchResults = await getHistory("", 28, query);
        setData(searchResults);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    }
  }, [query, initialData, initialEndDateStr]);

  const loadMore = async () => {
    setLoading(true);
    try {
      // Calculate new end date (subtract 28 days from current end date)
      const nextEndDate = subDays(parseISO(currentEndDateStr), 28);
      const nextEndDateStr = format(nextEndDate, "yyyy-MM-dd");
      
      const moreData = await getHistory(nextEndDateStr, 28, "");
      
      setData((prev) => [...prev, ...moreData]);
      setCurrentEndDateStr(nextEndDateStr);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getMoodEmoji = (mood: string) => {
    if (mood === "good") return "😇";
    if (mood === "bad") return "😢";
    return "😐";
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <div className="max-w-4xl mx-auto mb-4 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-tm-purple-dark dark:text-tm-yellow">History</h1>
            <p className="text-tm-blue-gray font-medium">Review your past completed tasks, events, and personal notes.</p>
          </div>
          
          <button
            onClick={() => setIsSearchVisible(!isSearchVisible)}
            className={cn(
              "flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black transition-all backdrop-blur-xl border shadow-2xl w-full sm:w-auto",
              isSearchVisible 
                ? "bg-tm-purple-dark text-tm-yellow border-tm-purple-dark" 
                : "bg-white/20 dark:bg-white/5 border-white/20 text-tm-purple-dark dark:text-tm-yellow saturate-150 hover:bg-white/30 dark:hover:bg-white/10"
            )}
          >
            <Search size={20} />
            {isSearchVisible ? "Close Search" : "Search Archive"}
          </button>
        </div>

        <AnimatePresence>
          {isSearchVisible && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-6 overflow-hidden"
            >
              <div className="relative w-full max-w-md">
                <input 
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search history..."
                  autoFocus
                  className="w-full bg-white/40 dark:bg-black/20 border border-tm-blue-gray/20 dark:border-white/10 rounded-2xl px-6 py-3 outline-none focus:border-tm-yellow/50 focus:ring-2 focus:ring-tm-yellow/20 transition-all backdrop-blur-md text-tm-purple-dark dark:text-white font-medium"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {loading && isSearching ? (
        <div className="text-center py-12 text-tm-blue-gray animate-pulse">Searching...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-tm-blue-gray">No history found for this period.</div>
      ) : (
        data.map((day, idx) => {
          const hasNote = day.notes.length > 0;
          const firstNoteMood = hasNote ? day.notes[0].mood : null;
          
          return (
            <GlassCard key={day.date} delay={Math.min(idx * 0.05, 0.5)}>
              <div className="flex flex-col gap-4">
                <div className="border-b border-tm-blue-gray/10 dark:border-white/10 pb-3">
                  <div className="flex items-center gap-3">
                    {firstNoteMood ? (
                      <span className="text-2xl leading-none select-none drop-shadow-md">{getMoodEmoji(firstNoteMood)}</span>
                    ) : (
                      <CalendarDays className="text-tm-orange-dark dark:text-tm-yellow" size={24} />
                    )}
                    <h2 className="text-xl font-bold text-tm-purple-dark dark:text-white">
                      {format(parseISO(day.date), "EEEE, MMMM do yyyy")}
                    </h2>
                  </div>
                  
                  {day.relief && day.relief.location && day.relief.location !== "No location found" && (
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase text-tm-blue-gray/60 tracking-[0.2em] mt-2 pl-9">
                      <span className="flex items-center gap-1.5"><MapPin size={12} className="text-tm-yellow/40" /> {day.relief.location}</span>
                      <span className="w-1 h-1 rounded-full bg-black/10 dark:bg-white/10" />
                      <span className="flex items-center gap-1.5"><CloudSun size={12} className="text-tm-yellow/40" /> {formatReliefTemp(day.relief.temp)}°C {day.relief.weather}</span>
                    </div>
                  )}

                  {day.habits && day.habits.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pl-9">
                      {day.habits.map((h) => (
                        <div key={h.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-xs font-semibold text-tm-purple-dark dark:text-white/80">
                          {h.habitIcon && <HabitIconRender icon={h.habitIcon} size={14} className="text-tm-blue-gray" />}
                          <span>{h.habitName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {(day.notes.length === 0 && day.events.length === 0 && day.specialDays.length === 0 && day.tasks.length === 0 && (!day.habits || day.habits.length === 0)) ? (
                   <p className="text-sm text-tm-blue-gray italic pl-9">No activities recorded on this day.</p>
                ) : (
                  <div className="flex flex-col gap-4 pl-9">
                    {day.tasks.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-tm-orange-light mb-2 flex items-center gap-1">
                          <CheckSquare size={14} /> Completed Tasks
                        </h3>
                        <ul className="space-y-2">
                          {day.tasks.map((t) => (
                            <li key={t.id} className="text-sm bg-black/5 dark:bg-white/5 p-2 rounded-lg border border-black/5 dark:border-white/5">
                              <span className="font-medium">{t.title}</span>
                              {t.description && <span className="text-tm-blue-gray ml-2">- {t.description}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {day.events.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-tm-yellow mb-2 flex items-center gap-1">
                          <Calendar size={14} /> Events
                        </h3>
                        <ul className="space-y-2">
                          {day.events.map((e) => (
                            <li key={e.id} className="text-sm bg-black/5 dark:bg-white/5 p-2 rounded-lg border border-black/5 dark:border-white/5">
                              <span className="font-medium">{e.title}</span>
                              {e.description && <span className="text-tm-blue-gray ml-2">- {e.description}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {day.specialDays.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-tm-orange-dark mb-2 flex items-center gap-1">
                          <Star size={14} /> Special Days
                        </h3>
                        <ul className="space-y-2">
                          {day.specialDays.map((e) => (
                            <li key={e.id} className="text-sm bg-black/5 dark:bg-white/5 p-2 rounded-lg border border-black/5 dark:border-white/5">
                              <span className="font-medium">{e.title}</span>
                              {e.description && <span className="text-tm-blue-gray ml-2">- {e.description}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {day.notes.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-tm-purple-light dark:text-tm-purple-light mb-2 flex items-center gap-1">
                          <FileText size={14} /> Notes
                        </h3>
                        <ul className="space-y-2">
                          {day.notes.map((n) => {
                            let parsedContent = null;
                            try {
                              if (n.content.trim().startsWith("[")) {
                                parsedContent = JSON.parse(n.content);
                              }
                            } catch (e) {}

                            return (
                              <li key={n.id} className="text-sm bg-black/5 dark:bg-white/5 p-3 rounded-lg border border-black/5 dark:border-white/5">
                                {Array.isArray(parsedContent) ? (
                                  <ul className="space-y-1.5">
                                    {parsedContent.map((item: any, i: number) => (
                                      <li key={item.id || i} className="flex items-start gap-2 text-tm-purple-dark dark:text-white/90">
                                        <span className="text-tm-blue-gray opacity-70 select-none mt-0.5">{item.bullet || '•'}</span>
                                        <span className="leading-snug">{item.text}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="whitespace-pre-wrap text-tm-purple-dark dark:text-white/90">{n.content}</p>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </GlassCard>
          );
        })
      )}

      {!isSearching && (
        <div className="flex justify-center mt-4">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-3 rounded-full bg-tm-orange-dark hover:bg-tm-orange-light text-white font-bold tracking-widest uppercase transition-all shadow-lg hover:shadow-[0_0_15px_rgba(242,79,19,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Loading..." : "View More History"}
          </button>
        </div>
      )}
    </div>
  );
}
