"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import GlassCard from "@/components/glass-card";
import { History, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Brain, Search, CheckCircle2 } from "lucide-react";
import { format, subDays, addDays, isSameDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { getNoteByDate, saveNote, getRecentNotes } from "@/app/actions/notes";
import { getProfile } from "@/app/actions/gamification";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/loader";
import { SPRING } from "@/lib/motion";
import TabularViewModal from "@/components/TabularViewModal";
import { parseNoteLines, type NoteRow, type Profile } from "@/lib/types";

// The exiting label reads the latest direction via AnimatePresence's custom prop
const DATE_SLIDE = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 24 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -24 }),
};

export type NoteLine = {
  id: string;
  bullet: string;
  text: string;
};

// One-line preview of a note: bullet texts joined, or legacy plain text with line breaks flattened
function noteSummary(content: string, empty: string) {
  const lines = parseNoteLines(content);
  const joined = lines
    ? lines.map(l => l.text).filter(Boolean).join(" • ")
    : content.replace(/\n/g, " • ").trim();
  return joined || empty;
}

export default function NotesPage() {
  const [lines, setLines] = useState<NoteLine[]>([]);
  const [activeBulletPicker, setActiveBulletPicker] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [recentNotes, setRecentNotes] = useState<NoteRow[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNoteLoading, setIsNoteLoading] = useState(false);
  const [mood, setMood] = useState("neutral");
  const [isTabularOpen, setIsTabularOpen] = useState(false);
  const [allNotesForTable, setAllNotesForTable] = useState<NoteRow[]>([]);
  // Bumped when a note finishes loading, so the entry swaps in as one unit
  const [noteVersion, setNoteVersion] = useState(0);

  // Direction the date header slides, updated when the selected day changes
  const dateKey = format(selectedDate, "yyyy-MM-dd");
  const [prevDateKey, setPrevDateKey] = useState(dateKey);
  const [dateDir, setDateDir] = useState(0);
  if (dateKey !== prevDateKey) {
    setDateDir(dateKey > prevDateKey ? 1 : -1);
    setPrevDateKey(dateKey);
  }

  // Refs so async callbacks always see fresh values
  const linesRef = useRef(lines);
  const moodRef = useRef(mood);
  const selectedDateRef = useRef(selectedDate);
  const isDirtyRef = useRef(isDirty);
  useEffect(() => { linesRef.current = lines; }, [lines]);
  useEffect(() => { moodRef.current = mood; }, [mood]);
  useEffect(() => { selectedDateRef.current = selectedDate; }, [selectedDate]);
  useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);

  const fetchNote = useCallback(async (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    try {
      const [data, profileData] = await Promise.all([
        getNoteByDate(dateStr),
        getProfile(dateStr)
      ]);
      setProfile(profileData);
      setMood(data?.mood || "neutral");
      if (data?.content) {
        try {
          const parsed = JSON.parse(data.content);
          if (Array.isArray(parsed)) {
            setLines(parsed);
          } else {
            throw new Error("Not an array");
          }
        } catch {
          setLines(data.content.split("\n").map((text: string) => ({
            id: Math.random().toString(36).substring(2, 11),
            bullet: "○",
            text
          })));
        }
      } else {
        setLines([{ id: Math.random().toString(36).substr(2, 9), bullet: "○", text: "" }]);
      }
      setIsDirty(false);
      setNoteVersion(v => v + 1);
    } finally {
      setIsNoteLoading(false);
      setIsLoading(false);
    }
  }, []);

  // Merge a freshly saved note into the lists we already hold instead of refetching them
  const mergeSavedNote = useCallback((saved: Awaited<ReturnType<typeof saveNote>>) => {
    const merge = (list: typeof recentNotes) =>
      [saved, ...list.filter(n => n.date !== saved.date)].sort((a, b) => b.date.localeCompare(a.date));
    setRecentNotes(prev => merge(prev).slice(0, 10));
    setAllNotesForTable(prev => (prev.length > 0 ? merge(prev) : prev));
  }, []);

  const fetchProfile = useCallback(async () => {
    const dateStr = format(selectedDateRef.current, "yyyy-MM-dd");
    const profileData = await getProfile(dateStr);
    setProfile(profileData);
  }, []);

  const autoSave = useCallback(async (date: Date, currentLines: NoteLine[], currentMood: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const saved = await saveNote(dateStr, JSON.stringify(currentLines), currentMood);
    setLastSaved(new Date());
    setIsDirty(false);
    mergeSavedNote(saved);
    fetchProfile(); // Update intelligence stat
  }, [mergeSavedNote, fetchProfile]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (!isDirtyRef.current) {
        return;
      }
      autoSave(selectedDateRef.current, linesRef.current, moodRef.current).catch((err) => {
        console.error("Auto-save failed", err);
      });
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [lines, mood, selectedDate, isDirty, autoSave]);

  useEffect(() => {
    fetchNote(selectedDate);
  }, [selectedDate, fetchNote]);

  useEffect(() => {
    getRecentNotes(10).then(setRecentNotes);
  }, []);

  // The full archive is only needed for the table view, so load it when that opens
  useEffect(() => {
    if (!isTabularOpen) return;
    getRecentNotes(1000).then(setAllNotesForTable);
  }, [isTabularOpen]);

  // Auto-save on page unload / browser navigation away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        // Fire-and-forget best-effort save via sendBeacon
        const payload = JSON.stringify({
          date: format(selectedDateRef.current, "yyyy-MM-dd"),
          content: JSON.stringify(linesRef.current),
          mood: moodRef.current,
        });
        navigator.sendBeacon("/api/notes/autosave", new Blob([payload], { type: "application/json" }));
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Auto-save when the component unmounts (SPA navigation within the app)
  useEffect(() => {
    return () => {
      if (isDirtyRef.current) {
        saveNote(
          format(selectedDateRef.current, "yyyy-MM-dd"),
          JSON.stringify(linesRef.current),
          moodRef.current
        );
      }
    };
  }, []);

  useEffect(() => {
    const textareas = document.querySelectorAll<HTMLTextAreaElement>('.note-textarea');
    textareas.forEach(textarea => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    });
  }, [lines]);


  async function handleDateChange(newDate: Date) {
    if (isDirtyRef.current) {
      await autoSave(selectedDateRef.current, linesRef.current, moodRef.current);
    }
    setIsNoteLoading(true);
    setSelectedDate(newDate);
  }

  function updateLine(index: number, updates: Partial<NoteLine>) {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], ...updates };
    setLines(newLines);
    setIsDirty(true);
  }

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const newLines = [...lines];
      const newLine = { id: Math.random().toString(36).substr(2, 9), bullet: lines[index].bullet, text: "" };
      newLines.splice(index + 1, 0, newLine);
      setLines(newLines);
      setTimeout(() => {
        document.getElementById(`line-${newLine.id}`)?.focus();
      }, 0);
    } else if (e.key === "Backspace" && lines[index].text === "" && lines.length > 1) {
      e.preventDefault();
      const prevLineId = lines[index - 1]?.id;
      const newLines = lines.filter((_, i) => i !== index);
      setLines(newLines);
      if (prevLineId) {
        setTimeout(() => {
          const el = document.getElementById(`line-${prevLineId}`) as HTMLInputElement;
          if (el) {
            el.focus();
            el.setSelectionRange(el.value.length, el.value.length);
          }
        }, 0);
      }
    }
  }

  return (
    <div className="p-4 pt-12 md:p-12 md:pt-16 max-w-5xl mx-auto space-y-8">
      {isLoading ? (
        <PageSkeleton />
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-display font-bold text-tm-purple-dark dark:text-tm-yellow">Daily Notes</h1>
              <p className="text-tm-blue-gray font-medium">Capture your thoughts, plans, and reflections.</p>

              {profile && (
                <div className="flex flex-wrap gap-2 mt-4">
                  <div className="flex items-center gap-2 bg-tm-yellow/10 px-3 py-1.5 rounded-xl border border-tm-yellow/20">
                    <Brain size={14} className="text-tm-yellow" />
                    <span className="text-caption font-mono font-semibold uppercase tracking-[0.12em] whitespace-nowrap text-tm-yellow">Intelligence: {profile.intelligence} XP</span>
                  </div>
                </div>
              )}
            </div>
            <GlassCard className="flex items-center justify-between p-1.5 border-tm-yellow/30 relative z-10 overflow-visible w-full sm:w-auto sm:min-w-[320px]">
              <button
                onClick={() => handleDateChange(subDays(selectedDate, 1))}
                className="p-2.5 hover:bg-tm-yellow/30 rounded-2xl transition-all text-tm-purple-dark dark:text-tm-yellow active:scale-90"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="px-6 text-center overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false} custom={dateDir}>
                  <motion.div
                    key={dateKey}
                    custom={dateDir}
                    variants={DATE_SLIDE}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <p className="text-caption font-mono font-semibold uppercase text-tm-blue-gray tracking-[0.12em] leading-none mb-1.5">{format(selectedDate, "EEEE")}</p>
                    <p className="font-bold text-lg sm:text-sm text-tm-purple-dark dark:text-tm-yellow tracking-tight leading-none">
                      {format(selectedDate, "MMMM d, yyyy")}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
              <button
                onClick={() => handleDateChange(addDays(selectedDate, 1))}
                disabled={isSameDay(selectedDate, new Date())}
                className="p-2.5 hover:bg-tm-yellow/30 rounded-2xl transition-all disabled:opacity-20 text-tm-purple-dark dark:text-tm-yellow active:scale-90"
              >
                <ChevronRight size={24} />
              </button>
            </GlassCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 md:gap-8">
            <GlassCard className={cn(
              "min-h-[500px] flex flex-col p-0 overflow-hidden transition-all duration-500",
              "shadow-xl shadow-tm-purple-dark/5 dark:shadow-none",
              mood === "good" ? "border-tm-yellow/40 shadow-[0_0_20px_rgba(242,194,48,0.15)]" :
                mood === "bad" ? "border-tm-orange-dark/40 shadow-[0_0_20px_rgba(191,49,0,0.15)]" :
                  "border-tm-yellow/20"
            )}>
              <div className="border-b border-tm-blue-gray/10 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-tm-blue-gray">
                  <CalendarIcon size={16} />
                  <span className="text-caption font-mono font-semibold uppercase tracking-[0.12em]">{format(selectedDate, "MMMM d")} Entry</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex p-1 mr-2">
                    {[
                      { val: "good", icon: "😇", color: "text-tm-yellow", bg: "bg-tm-yellow/20" },
                      { val: "neutral", icon: "😐", color: "text-tm-blue-gray", bg: "bg-white/10" },
                      { val: "bad", icon: "😢", color: "text-tm-orange-dark", bg: "bg-tm-orange-dark/20" }
                    ].map(m => (
                      <motion.button
                        key={m.val}
                        onClick={() => { setMood(m.val); setIsDirty(true); }}
                        whileTap={{ scale: 0.8 }}
                        className={cn(
                          "relative p-2 rounded-full transition-colors flex items-center justify-center w-9 h-9",
                          mood === m.val ? m.color : "text-tm-blue-gray/70 hover:bg-white/5"
                        )}
                        title={m.val.toUpperCase()}
                        aria-pressed={mood === m.val}
                      >
                        {mood === m.val && (
                          <motion.span
                            layoutId="mood-pill"
                            className={cn("absolute inset-0 rounded-full shadow-inner", m.bg)}
                            transition={SPRING.bubble}
                          />
                        )}
                        <motion.span
                          className={cn("relative text-xl", mood !== m.val && "grayscale-[0.6]")}
                          animate={mood === m.val ? { scale: [1, 1.35, 1], rotate: [0, -12, 0] } : { scale: 1, rotate: 0 }}
                          transition={{ duration: 0.4 }}
                        >
                          {m.icon}
                        </motion.span>
                      </motion.button>
                    ))}
                  </div>

                  {isDirty ? (
                    <span className="text-caption text-tm-blue-gray/60 font-bold italic flex items-center gap-1 animate-pulse">
                      Saving automatically...
                    </span>
                  ) : lastSaved ? (
                    <span className="text-caption text-tm-blue-gray font-bold italic flex items-center gap-1">
                      <CheckCircle2 size={12} /> Saved {format(lastSaved, "HH:mm")}
                    </span>
                  ) : (
                    <span className="text-caption text-tm-blue-gray/70 font-bold italic flex items-center gap-1">
                      Auto-save on
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1 bg-transparent p-4 sm:p-8 overflow-y-auto space-y-2 min-h-[400px] relative">
                {isNoteLoading ? (
                  <div className="absolute inset-0 p-4 sm:p-8 space-y-4 bg-background/60 z-10" aria-busy="true">
                    {[82, 64, 74, 40].map((w, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="tm-skeleton w-6 h-6 shrink-0 rounded-lg" />
                        <div className="tm-skeleton h-4" style={{ width: `${w}%` }} />
                      </div>
                    ))}
                    <p className="text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray pt-2">Consulting the Archives...</p>
                  </div>
                ) : null}
                <motion.div
                  key={noteVersion}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-2"
                >
                <AnimatePresence initial={false}>
                {lines.map((line, index) => (
                  <motion.div
                    key={line.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="flex items-start gap-3 group"
                  >
                    <div className="relative mt-1">
                      <button
                        onClick={() => setActiveBulletPicker(line.id)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-tm-yellow/20 transition-colors text-lg"
                      >
                        {line.bullet}
                      </button>
                      <AnimatePresence>
                      {activeBulletPicker === line.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: -4 }}
                          transition={SPRING.snappy}
                          className="absolute top-8 left-0 z-50 bg-background border border-tm-blue-gray/20 p-2 rounded-xl shadow-2xl flex gap-1 origin-top-left"
                        >
                          {["○", "✅", "📍", "💡", "🔥", "✨"].map(b => (
                            <button
                              key={b}
                              onClick={() => {
                                updateLine(index, { bullet: b });
                                setActiveBulletPicker(null);
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-tm-yellow/20 text-lg"
                            >
                              {b}
                            </button>
                          ))}
                          <input
                            autoFocus
                            placeholder="Emoji"
                            className="w-12 bg-transparent outline-none border-b border-tm-yellow/30 text-center text-sm"
                            onChange={(e) => {
                              if (e.target.value) {
                                updateLine(index, { bullet: e.target.value });
                                setActiveBulletPicker(null);
                              }
                            }}
                          />
                        </motion.div>
                      )}
                      </AnimatePresence>
                    </div>
                    <textarea
                      id={`line-${line.id}`}
                      value={line.text}
                      rows={1}
                      onChange={(e) => {
                        updateLine(index, { text: e.target.value });
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      placeholder={index === 0 ? "Start typing your thoughts..." : ""}
                      className="note-textarea flex-1 bg-transparent outline-none text-lg leading-relaxed placeholder:text-tm-blue-gray/20 font-medium resize-none overflow-hidden"
                    />
                  </motion.div>
                ))}
                </AnimatePresence>
                </motion.div>
                {lines.length === 0 && (
                  <button
                    onClick={() => setLines([{ id: Math.random().toString(36).substr(2, 9), bullet: "○", text: "" }])}
                    className="text-tm-blue-gray/70 italic hover:text-tm-yellow transition-colors"
                  >
                    + Add your first note...
                  </button>
                )}
              </div>
            </GlassCard>

            <div className="space-y-6">
              <div className="flex items-center gap-2 text-tm-purple-dark dark:text-tm-yellow pl-2">
                <History size={20} />
                <h2 className="text-xl font-bold tracking-tight">Previous Days</h2>
              </div>
              <div className="space-y-3">
                {Array.from({ length: 10 }, (_, i) => subDays(new Date(), i)).map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const existingNote = recentNotes.find(n => n.date === dateStr);
                  const isSelected = isSameDay(day, selectedDate);
                  const cardMood = existingNote?.mood || "neutral";
                  const noteContent = existingNote
                    ? noteSummary(existingNote.content, "...but nothing happened.")
                    : "...but nothing happened.";

                  return (
                    <motion.button
                      key={dateStr}
                      onClick={() => handleDateChange(day)}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "w-full text-left p-4 rounded-2xl border transition-all relative overflow-hidden group min-h-[82px] flex flex-col justify-center",
                        isSelected ? "bg-tm-yellow/20 border-tm-yellow shadow-lg scale-[1.02]" : "bg-white/40 dark:bg-white/5 border-white/20 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 shadow-sm",
                        !isSelected && cardMood === "good" && "bg-tm-yellow/10 border-tm-yellow/30",
                        !isSelected && cardMood === "bad" && "bg-tm-orange-dark/10 border-tm-orange-dark/30"
                      )}
                    >
                      <div className="flex justify-between items-start w-full">
                        <p className="text-caption font-mono font-semibold text-tm-blue-gray uppercase tracking-[0.12em]">{format(day, "EEE, MMM d")}</p>
                        {existingNote?.mood && (
                          <span className="text-sm opacity-80 group-hover:opacity-100 transition-all">
                            {existingNote.mood === "good" ? "😇" : existingNote.mood === "bad" ? "😢" : "😐"}
                          </span>
                        )}
                      </div>
                      <p className={cn(
                        "text-sm line-clamp-1 mt-1 font-medium h-5 w-full",
                        existingNote ? "text-foreground" : "text-tm-blue-gray/70 italic"
                      )}>
                        {noteContent}
                      </p>
                      {isSelected && (
                        <motion.div
                          layoutId="note-indicator"
                          className={cn(
                            "absolute left-0 top-0 bottom-0 w-1",
                            cardMood === "good" ? "bg-tm-yellow" : cardMood === "bad" ? "bg-tm-orange-dark" : "bg-tm-yellow"
                          )}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex justify-center pt-12">
            <button
              onClick={() => setIsTabularOpen(true)}
              className="flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-tm-blue-gray hover:text-tm-yellow font-mono font-semibold uppercase tracking-[0.12em] text-xs transition-all group"
            >
              <Search size={16} className="group-hover:scale-110 transition-transform" />
              View All Notes in Tabular Format
            </button>
          </div>

          <TabularViewModal
            title="Notes Archive"
            isOpen={isTabularOpen}
            onClose={() => setIsTabularOpen(false)}
            data={allNotesForTable.map(n => ({
              ...n,
              contentText: noteSummary(n.content, "...but nothing happened"),
            }))}
            columns={[
              {
                header: "Date", key: "date", render: (val) => {
                  let year = "";
                  let shortDate = val;
                  let full = val;
                  try {
                    const base = val.replace(/^(\d{4}-\d{2}-\d{2}).*$/, "$1");
                    const parsed = new Date(base + "T00:00:00");
                    year = parsed.getFullYear().toString();
                    shortDate = parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    full = base;
                  } catch { }
                  return (
                    <span className="font-mono text-tm-blue-gray whitespace-nowrap">
                      <span className="sm:hidden flex flex-col leading-tight">
                        <span className="text-caption opacity-50">{year}</span>
                        <span>{shortDate}</span>
                      </span>
                      <span className="hidden sm:inline">{full}</span>
                    </span>
                  );
                }
              }
              , {
                header: "Mood", key: "mood", render: (val) => (
                  <span className="text-2xl">
                    {val === "good" ? "😇" : val === "bad" ? "😢" : "😐"}
                  </span>
                )
              },
              {
                header: "Content", key: "contentText", wrap: true, render: (val) => (
                  <div className="font-medium text-white/80">
                    {val}
                  </div>
                )
              }
            ]}
          />
        </>
      )}
    </div>
  );
}
