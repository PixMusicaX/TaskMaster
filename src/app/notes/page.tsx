"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import GlassCard from "@/components/glass-card";
import { History, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Brain, Search, CheckCircle2 } from "lucide-react";
import { format, subDays, addDays, isSameDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { getNoteByDate, saveNote, getRecentNotes } from "@/app/actions/notes";
import { getProfile } from "@/app/actions/gamification";
import { cn } from "@/lib/utils";
import { PremiumLoader } from "@/components/loader";
import TabularViewModal, { Column } from "@/components/TabularViewModal";

export type NoteLine = {
  id: string;
  bullet: string;
  text: string;
};

export default function NotesPage() {
  const [lines, setLines] = useState<NoteLine[]>([]);
  const [activeBulletPicker, setActiveBulletPicker] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [recentNotes, setRecentNotes] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNoteLoading, setIsNoteLoading] = useState(false);
  const [mood, setMood] = useState("neutral");
  const [isTabularOpen, setIsTabularOpen] = useState(false);
  const [allNotesForTable, setAllNotesForTable] = useState<any[]>([]);

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
    setIsNoteLoading(true);
    const dateStr = format(date, "yyyy-MM-dd");
    try {
      const [data, profileData] = await Promise.all([
        getNoteByDate(dateStr),
        getProfile()
      ]);
      setProfile(profileData);
      setMood(data?.mood || "neutral");
      if (data?.content) {
        try {
          setLines(JSON.parse(data.content));
        } catch (e) {
          setLines(data.content.split("\n").map((text: string) => ({
            id: Math.random().toString(36).substr(2, 9),
            bullet: "○",
            text
          })));
        }
      } else {
        setLines([{ id: Math.random().toString(36).substr(2, 9), bullet: "○", text: "" }]);
      }
      setIsDirty(false);
    } finally {
      setIsNoteLoading(false);
      setIsLoading(false);
    }
  }, []);

  // Save the current note silently (no loading state flip, used for auto-save)
  const autoSave = useCallback(async (date: Date, currentLines: NoteLine[], currentMood: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    await saveNote(dateStr, JSON.stringify(currentLines), currentMood);
    setLastSaved(new Date());
    setIsDirty(false);
    fetchRecent();
  }, []);

  const fetchRecent = useCallback(async () => {
    const data = await getRecentNotes(1000);
    setRecentNotes(data.slice(0, 10));
    setAllNotesForTable(data);
  }, []);

  useEffect(() => {
    fetchNote(selectedDate);
    fetchRecent();
  }, [selectedDate, fetchNote, fetchRecent]);

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
        <PremiumLoader />
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black text-tm-purple-dark dark:text-tm-yellow">Daily Notes</h1>
              <p className="text-tm-blue-gray font-medium">Capture your thoughts, plans, and reflections.</p>

              {profile && (
                <div className="flex gap-4 mt-4">
                  <div className="flex items-center gap-2 bg-tm-yellow/10 px-3 py-1.5 rounded-xl border border-tm-yellow/20">
                    <Brain size={14} className="text-tm-yellow" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-tm-yellow">Intelligence: {profile.intelligence} XP</span>
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
              <div className="px-6 text-center">
                <p className="text-[10px] font-black uppercase text-tm-blue-gray tracking-widest leading-none mb-1.5">{format(selectedDate, "EEEE")}</p>
                <p className="font-black text-lg sm:text-sm text-tm-purple-dark dark:text-tm-yellow tracking-tight leading-none">
                  {format(selectedDate, "MMMM d, yyyy")}
                </p>
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
                  <span className="text-[10px] font-black uppercase tracking-widest">{format(selectedDate, "MMMM d")} Entry</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex p-1 mr-2">
                    {[
                      { val: "good", icon: "😇", color: "text-tm-yellow", bg: "bg-tm-yellow/20" },
                      { val: "neutral", icon: "😐", color: "text-tm-blue-gray", bg: "bg-white/10" },
                      { val: "bad", icon: "😢", color: "text-tm-orange-dark", bg: "bg-tm-orange-dark/20" }
                    ].map(m => (
                      <button
                        key={m.val}
                        onClick={() => { setMood(m.val); setIsDirty(true); }}
                        className={cn(
                          "p-2 rounded-full transition-all flex items-center justify-center w-9 h-9",
                          mood === m.val ? m.bg + " " + m.color + " shadow-inner scale-95" : "text-tm-blue-gray/40 hover:bg-white/5"
                        )}
                        title={m.val.toUpperCase()}
                      >
                        <span className="text-xl">{m.icon}</span>
                      </button>
                    ))}
                  </div>

                  {isDirty ? (
                    <span className="text-[10px] text-tm-blue-gray/60 font-bold italic flex items-center gap-1 animate-pulse">
                      Saving automatically...
                    </span>
                  ) : lastSaved ? (
                    <span className="text-[10px] text-tm-blue-gray font-bold italic flex items-center gap-1">
                      <CheckCircle2 size={12} /> Saved {format(lastSaved, "HH:mm")}
                    </span>
                  ) : (
                    <span className="text-[10px] text-tm-blue-gray/40 font-bold italic flex items-center gap-1">
                      Auto-save on
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1 bg-transparent p-4 sm:p-8 overflow-y-auto space-y-2 min-h-[400px] relative">
                {isNoteLoading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/20 backdrop-blur-[2px] z-10">
                    <div className="w-12 h-12 border-4 border-tm-yellow/20 border-t-tm-yellow rounded-full animate-spin mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-tm-blue-gray">Consulting the Archives...</p>
                  </div>
                ) : null}
                {lines.map((line, index) => (
                  <div key={line.id} className="flex items-start gap-3 group">
                    <div className="relative mt-1">
                      <button
                        onClick={() => setActiveBulletPicker(line.id)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-tm-yellow/20 transition-colors text-lg"
                      >
                        {line.bullet}
                      </button>
                      {activeBulletPicker === line.id && (
                        <div className="absolute top-8 left-0 z-50 bg-background border border-tm-blue-gray/20 p-2 rounded-xl shadow-2xl flex gap-1 animate-in fade-in zoom-in duration-200">
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
                        </div>
                      )}
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
                  </div>
                ))}
                {lines.length === 0 && (
                  <button
                    onClick={() => setLines([{ id: Math.random().toString(36).substr(2, 9), bullet: "○", text: "" }])}
                    className="text-tm-blue-gray/40 italic hover:text-tm-yellow transition-colors"
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

                  return (
                    <button
                      key={dateStr}
                      onClick={() => handleDateChange(day)}
                      className={cn(
                        "w-full text-left p-4 rounded-2xl border transition-all relative overflow-hidden group",
                        isSelected ? "bg-tm-yellow/20 border-tm-yellow shadow-lg scale-[1.02]" : "bg-white/40 dark:bg-white/5 border-white/20 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 shadow-sm",
                        !isSelected && cardMood === "good" && "bg-tm-yellow/10 border-tm-yellow/30",
                        !isSelected && cardMood === "bad" && "bg-tm-orange-dark/10 border-tm-orange-dark/30"
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <p className="text-[10px] font-black text-tm-blue-gray uppercase tracking-widest">{format(day, "EEE, MMM d")}</p>
                        {existingNote?.mood && (
                          <span className="text-sm opacity-80 group-hover:opacity-100 transition-all">
                            {existingNote.mood === "good" ? "😇" : existingNote.mood === "bad" ? "😢" : "😐"}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm line-clamp-1 mt-1 font-medium ${existingNote ? "text-foreground" : "text-tm-blue-gray/40 italic"}`}>
                        {existingNote ? (
                          (() => {
                            try {
                              const parsed = JSON.parse(existingNote.content);
                              return parsed.map((l: any) => l.text).filter(Boolean).join(" • ");
                            } catch (e) {
                              return existingNote.content.replace(/\n/g, " • ");
                            }
                          })()
                        ) : "No entry yet."}
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
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex justify-center pt-12">
            <button
              onClick={() => setIsTabularOpen(true)}
              className="flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-tm-blue-gray hover:text-tm-yellow font-black uppercase tracking-widest text-xs transition-all group"
            >
              <Search size={16} className="group-hover:scale-110 transition-transform" />
              View All Notes in Tabular Format
            </button>
          </div>

          <TabularViewModal
            title="Notes Archive"
            isOpen={isTabularOpen}
            onClose={() => setIsTabularOpen(false)}
            data={allNotesForTable.map(n => {
              let contentText = "";
              try {
                const parsed = JSON.parse(n.content);
                contentText = parsed.map((l: any) => l.text).filter(Boolean).join(" • ");
              } catch (e) {
                contentText = n.content;
              }
              return {
                ...n,
                contentText
              };
            })}
            columns={[
              { header: "Date", key: "date", render: (val) => {
                let year = "";
                let shortDate = val;
                let full = val;
                try {
                  const base = val.replace(/^(\d{4}-\d{2}-\d{2}).*$/, "$1");
                  const parsed = new Date(base + "T00:00:00");
                  year = parsed.getFullYear().toString();
                  shortDate = parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  full = base;
                } catch {}
                return (
                  <span className="font-mono text-tm-blue-gray whitespace-nowrap">
                    <span className="sm:hidden flex flex-col leading-tight">
                      <span className="text-[10px] opacity-50">{year}</span>
                      <span>{shortDate}</span>
                    </span>
                    <span className="hidden sm:inline">{full}</span>
                  </span>
                );
              }}
              ,{
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
