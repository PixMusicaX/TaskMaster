"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { HistoryDay, getHistory } from "@/app/actions/history";
import GlassCard from "@/components/glass-card";
import { format, parseISO, subDays } from "date-fns";
import { Calendar, CheckSquare, FileText, Search, Star, MapPin, CloudSun, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, moodEmoji } from "@/lib/utils";
import HabitIconRender from "@/components/HabitIconRender";
import { SkeletonRows } from "@/components/loader";
import { formatReliefTemp } from "@/lib/weather";
import { parseNoteLines } from "@/lib/types";

// Note rows with at least one non-empty line (JSON bullet notes or legacy plain text)
function visibleNotesFor(day: HistoryDay) {
  return day.notes
    .map((n) => {
      const lines = n.content.trim().startsWith("[") ? parseNoteLines(n.content) : null;
      return { note: n, items: lines ? lines.filter((item) => item?.text?.trim()) : null };
    })
    .filter(({ note, items }) => (items ? items.length > 0 : note.content.trim().length > 0));
}

// Consecutive days grouped under their month
function groupByMonth(days: HistoryDay[]) {
  const groups: { key: string; label: string; days: HistoryDay[] }[] = [];
  for (const day of days) {
    const key = day.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.days.push(day);
    else groups.push({ key, label: format(parseISO(day.date), "MMMM yyyy"), days: [day] });
  }
  return groups;
}

function Section({ icon: Icon, title, className, children }: { icon: typeof Calendar; title: string; className: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className={cn("text-caption font-mono font-semibold uppercase tracking-[0.12em] mb-2 flex items-center gap-1.5", className)}>
        <Icon size={13} /> {title}
      </h3>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  );
}

const itemClass = "text-sm bg-tm-blue-gray/5 px-3 py-2 rounded-xl border border-tm-blue-gray/10";

function DayCard({ day, delay }: { day: HistoryDay; delay: number }) {
  const visibleNotes = visibleNotesFor(day);
  const habits = day.habits ?? [];
  const isEmpty = visibleNotes.length === 0 && day.events.length === 0 && day.specialDays.length === 0 && day.tasks.length === 0 && habits.length === 0;
  const summary = [
    day.tasks.length && `${day.tasks.length} task${day.tasks.length > 1 ? "s" : ""}`,
    day.events.length && `${day.events.length} event${day.events.length > 1 ? "s" : ""}`,
    habits.length && `${habits.length} habit${habits.length > 1 ? "s" : ""}`,
  ].filter(Boolean).join(" · ");

  return (
    <GlassCard delay={delay} className="p-4 md:p-5">
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base md:text-lg font-semibold text-foreground leading-tight">
              {format(parseISO(day.date), "EEEE, MMMM do yyyy")}
            </h2>
            {summary && (
              <span className="hidden sm:block text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray whitespace-nowrap pt-1">{summary}</span>
            )}
          </div>

          {day.relief && day.relief.location && day.relief.location !== "No location found" && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption font-mono font-semibold uppercase text-tm-blue-gray/70 tracking-[0.12em] mt-1.5">
              <span className="flex items-center gap-1.5"><MapPin size={12} className="text-tm-yellow/60" /> {day.relief.location}</span>
              <span className="flex items-center gap-1.5"><CloudSun size={12} className="text-tm-yellow/60" /> {formatReliefTemp(day.relief.temp)}°C {day.relief.weather}</span>
            </div>
          )}

          {habits.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {habits.map((h) => (
                <div key={h.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tm-yellow/10 border border-tm-yellow/20 text-xs font-bold text-foreground/80">
                  {h.habitIcon && <HabitIconRender icon={h.habitIcon} size={13} className="text-tm-yellow" />}
                  <span>{h.habitName}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {isEmpty ? (
          <p className="text-sm text-tm-blue-gray italic">No activities recorded on this day.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {day.tasks.length > 0 && (
              <Section icon={CheckSquare} title="Completed Tasks" className="text-tm-orange-light">
                {day.tasks.map((t) => (
                  <li key={t.id} className={itemClass}>
                    <span className="font-semibold">{t.title}</span>
                    {t.description && <span className="text-tm-blue-gray ml-2">- {t.description}</span>}
                  </li>
                ))}
              </Section>
            )}

            {day.events.length > 0 && (
              <Section icon={Calendar} title="Events" className="text-tm-yellow">
                {day.events.map((e) => (
                  <li key={e.id} className={cn(itemClass, "flex items-center gap-2 flex-wrap")}>
                    <span className={cn(e.tier === "side" ? "italic" : e.tier === "epic" ? "font-bold" : "font-normal")}>{e.title}</span>
                    {e.startTime && <span className="text-caption text-tm-yellow font-black bg-tm-yellow/10 px-1.5 py-0.5 rounded">{format(new Date(e.startTime), "h:mm a")}</span>}
                    {e.description && <span className="text-tm-blue-gray">- {e.description}</span>}
                  </li>
                ))}
              </Section>
            )}

            {day.specialDays.length > 0 && (
              <Section icon={Star} title="Special Days" className="text-tm-orange-dark">
                {day.specialDays.map((e) => (
                  <li key={e.id} className={itemClass}>
                    <span className={cn(e.tier === "side" ? "italic" : e.tier === "epic" ? "font-bold" : "font-normal")}>{e.title}</span>
                    {e.description && <span className="text-tm-blue-gray ml-2">- {e.description}</span>}
                  </li>
                ))}
              </Section>
            )}

            {visibleNotes.length > 0 && (
              <Section icon={FileText} title="Notes" className="text-tm-blue-gray">
                {visibleNotes.map(({ note: n, items }) => (
                  <li key={n.id} className={cn(itemClass, "py-3")}>
                    {items ? (
                      <ul className="space-y-1.5">
                        {items.map((item, i) => (
                          <li key={item.id || i} className="flex items-start gap-2 text-foreground/90">
                            <span className="text-tm-blue-gray opacity-70 select-none mt-0.5">{item.bullet || '•'}</span>
                            <span className="leading-snug">{item.text}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="whitespace-pre-wrap text-foreground/90">{n.content}</p>
                    )}
                  </li>
                ))}
              </Section>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
}

export default function HistoryList() {
  const [data, setData] = useState<HistoryDay[]>([]);
  const [defaultData, setDefaultData] = useState<HistoryDay[]>([]);
  // History runs up to yesterday, anchored to the viewer's local date
  const [clientDateStr] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [initialEndDateStr] = useState(() => format(subDays(new Date(), 1), "yyyy-MM-dd"));
  const [currentEndDateStr, setCurrentEndDateStr] = useState(initialEndDateStr);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // First page of history
  useEffect(() => {
    let cancelled = false;
    getHistory(initialEndDateStr, 28, "", clientDateStr).then(res => {
      if (cancelled) return;
      setData(res);
      setDefaultData(res);
      setInitialLoadComplete(true);
      setLoading(false);

      // Deep links (e.g. from the dashboard's Chronicle card) open with a search: /history?q=...
      const initialQuery = new URLSearchParams(window.location.search).get("q");
      if (initialQuery) {
        setIsSearchVisible(true);
        setQuery(initialQuery);
        setIsSearching(true);
      }
    });
    return () => { cancelled = true; };
  }, [initialEndDateStr, clientDateStr]);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (value.trim() === "") {
      // Back to the paginated timeline
      setData(defaultData);
      setIsSearching(false);
    } else {
      setIsSearching(true);
    }
  }

  function closeSearch() {
    setIsSearchVisible(false);
    handleQueryChange("");
  }

  // Debounced search
  useEffect(() => {
    if (!initialLoadComplete || query.trim() === "") return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        setData(await getHistory("", 28, query, clientDateStr));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [query, initialLoadComplete, clientDateStr]);

  const loadMore = useCallback(async () => {
    setLoading(true);
    try {
      // Calculate new end date (subtract 28 days from current end date)
      const nextEndDate = subDays(parseISO(currentEndDateStr), 28);
      const nextEndDateStr = format(nextEndDate, "yyyy-MM-dd");

      const moreData = await getHistory(nextEndDateStr, 28, "", clientDateStr);

      setData((prev) => [...prev, ...moreData]);
      setDefaultData((prev) => [...prev, ...moreData]);
      setCurrentEndDateStr(nextEndDateStr);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [currentEndDateStr, clientDateStr]);

  // Load the next 4 weeks automatically as the end of the timeline scrolls into view
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined" || isSearching || loading || !initialLoadComplete) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore();
    }, { rootMargin: "400px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isSearching, loading, initialLoadComplete, loadMore]);

  let cardIndex = 0;

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-tm-purple-dark dark:text-tm-yellow">History</h1>
          <p className="text-tm-blue-gray font-medium">Review your past completed tasks, events, and personal notes.</p>
        </div>

        <motion.div layout className="flex items-center justify-end" transition={{ type: "spring", stiffness: 400, damping: 32 }}>
          <AnimatePresence mode="popLayout" initial={false}>
            {isSearchVisible ? (
              <motion.div
                key="search"
                initial={{ opacity: 0, width: 48 }}
                animate={{ opacity: 1, width: "100%" }}
                exit={{ opacity: 0, width: 48 }}
                className="relative w-full md:w-80"
              >
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-tm-blue-gray pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Search history..."
                  autoFocus
                  className="w-full bg-white/40 dark:bg-black/20 border border-tm-blue-gray/20 dark:border-white/10 rounded-2xl pl-11 pr-11 py-3 outline-none focus:border-tm-yellow/50 focus:ring-2 focus:ring-tm-yellow/20 transition-colors text-foreground font-medium"
                />
                <button
                  onClick={closeSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl text-tm-blue-gray hover:text-tm-yellow"
                  aria-label="Close search"
                >
                  <X size={16} />
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="toggle"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setIsSearchVisible(true)}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-black bg-white/20 dark:bg-white/5 border border-tm-blue-gray/20 text-tm-purple-dark dark:text-tm-yellow hover:bg-white/30 dark:hover:bg-white/10 transition-colors w-full sm:w-auto"
              >
                <Search size={18} /> Search Archive
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {loading && data.length === 0 ? (
        <SkeletonRows rows={4} caption="Loading history..." />
      ) : loading && isSearching ? (
        <SkeletonRows rows={3} caption="Searching..." />
      ) : data.length === 0 ? (
        <div className="text-center py-16 text-tm-blue-gray">
          <Search size={32} className="mx-auto mb-3 opacity-30" />
          <p>No history found for this period.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline spine */}
          <div className="absolute left-[15px] sm:left-[19px] top-2 bottom-0 w-px bg-gradient-to-b from-tm-yellow/50 via-tm-blue-gray/20 to-transparent" aria-hidden />

          {groupByMonth(data).map(group => (
            <section key={group.key} className="relative">
              <div className="sticky top-20 z-20 py-2 pl-10 sm:pl-12">
                <span className="inline-block px-3 py-1 rounded-full bg-background/85 backdrop-blur-md border border-tm-blue-gray/15 text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray">
                  {group.label}
                </span>
              </div>

              <div className="space-y-4 pb-6">
                {group.days.map(day => {
                  const mood = day.notes.length > 0 ? day.notes[0].mood : null;
                  const delay = Math.min(cardIndex++ * 0.04, 0.4);
                  return (
                    <div key={day.date} className="relative pl-10 sm:pl-12">
                      {/* Day marker: mood emoji, or a dot */}
                      <div className="absolute left-0 top-4 w-8 sm:w-10 flex justify-center">
                        {mood ? (
                          <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-background border border-tm-blue-gray/15 flex items-center justify-center text-lg leading-none select-none shadow-sm">
                            {moodEmoji(mood)}
                          </span>
                        ) : (
                          <span className="mt-2.5 w-3 h-3 rounded-full bg-background border-2 border-tm-yellow/60" />
                        )}
                      </div>
                      <DayCard day={day} delay={delay} />
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {!isSearching && data.length > 0 && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          <button
            onClick={loadMore}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-tm-orange-dark hover:bg-tm-orange-light text-white text-caption font-mono font-semibold tracking-[0.12em] uppercase transition-all shadow-lg active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? "Loading..." : "View More History"}
          </button>
        </div>
      )}
    </div>
  );
}
