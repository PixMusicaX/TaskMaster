"use client";

import { useState, useEffect, useCallback } from "react";
import GlassCard from "@/components/glass-card";
import { Save, History, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check, Brain, Search } from "lucide-react";
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
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNoteLoading, setIsNoteLoading] = useState(false);
  const [mood, setMood] = useState("neutral");
  const [isTabularOpen, setIsTabularOpen] = useState(false);
  const [allNotesForTable, setAllNotesForTable] = useState<any[]>([]);

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
    } finally {
      setIsNoteLoading(false);
      setIsLoading(false);
    }
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

  async function handleSave() {
    setIsSaving(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    await saveNote(dateStr, JSON.stringify(lines), mood);
    const profileData = await getProfile();
    setProfile(profileData);
    window.dispatchEvent(new CustomEvent("profile-updated"));
    setLastSaved(new Date());
    setIsSaving(false);
    fetchRecent();
  }

  function updateLine(index: number, updates: Partial<NoteLine>) {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], ...updates };
    setLines(newLines);
  }

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "Enter") {
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
    <div className="p-6 md:p-12 max-w-5xl mx-auto space-y-8">
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
            <GlassCard className="flex items-center gap-2 p-2 border-tm-yellow/30 relative z-10 overflow-visible">
              <button
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                className="p-2 hover:bg-tm-yellow/30 rounded-xl transition-colors text-tm-purple-dark dark:text-tm-yellow"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="px-4 text-center min-w-[120px]">
                <p className="text-[10px] font-black uppercase text-tm-blue-gray tracking-widest leading-none mb-1">{format(selectedDate, "EEEE")}</p>
                <p className="font-black text-sm text-tm-purple-dark dark:text-tm-yellow">{format(selectedDate, "MMM d, yyyy")}</p>
              </div>
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                disabled={isSameDay(selectedDate, new Date())}
                className="p-2 hover:bg-tm-yellow/30 rounded-xl transition-colors disabled:opacity-20 text-tm-purple-dark dark:text-tm-yellow"
              >
                <ChevronRight size={20} />
              </button>
            </GlassCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
            <GlassCard className={cn(
              "min-h-[500px] flex flex-col p-0 overflow-hidden transition-all duration-500",
              "shadow-xl shadow-tm-purple-dark/5 dark:shadow-none",
              mood === "good" ? "border-tm-yellow/40 shadow-[0_0_20px_rgba(242,194,48,0.15)]" :
                mood === "bad" ? "border-tm-orange-dark/40 shadow-[0_0_20px_rgba(191,49,0,0.15)]" :
                  "border-tm-yellow/20"
            )}>
              <div className="border-b border-tm-blue-gray/10 p-4 flex items-center justify-between bg-white/40 dark:bg-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-tm-blue-gray">
                  <CalendarIcon size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{format(selectedDate, "MMMM d")} Entry</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 mr-2">
                    {[
                      { val: "good", icon: "😇", color: "text-tm-yellow", bg: "bg-tm-yellow/20" },
                      { val: "neutral", icon: "😐", color: "text-tm-blue-gray", bg: "bg-white/10" },
                      { val: "bad", icon: "😢", color: "text-tm-orange-dark", bg: "bg-tm-orange-dark/20" }
                    ].map(m => (
                      <button
                        key={m.val}
                        onClick={() => setMood(m.val)}
                        className={cn(
                          "p-2 rounded-lg transition-all flex items-center justify-center w-9 h-9",
                          mood === m.val ? m.bg + " " + m.color + " shadow-inner scale-95" : "text-tm-blue-gray/40 hover:bg-white/5"
                        )}
                        title={m.val.toUpperCase()}
                      >
                        <span className="text-xl">{m.icon}</span>
                      </button>
                    ))}
                  </div>

                  {lastSaved && (
                    <span className="text-[10px] text-tm-blue-gray font-bold italic hidden sm:flex items-center gap-1 mr-2">
                      <Check size={12} /> Saved at {format(lastSaved, "HH:mm")}
                    </span>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-tm-orange-dark text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-tm-orange-dark/20 hover:scale-105 transition-transform disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : <><Save size={16} /> Save</>}
                  </button>
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
                    <input
                      id={`line-${line.id}`}
                      value={line.text}
                      onChange={(e) => updateLine(index, { text: e.target.value })}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      placeholder={index === 0 ? "Start typing your thoughts..." : ""}
                      className="flex-1 bg-transparent outline-none text-lg leading-relaxed placeholder:text-tm-blue-gray/20 font-medium"
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
                      onClick={() => setSelectedDate(day)}
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
              { header: "Date", key: "date", render: (val) => <span className="font-mono text-tm-blue-gray">{val}</span> },
              {
                header: "Mood", key: "mood", render: (val) => (
                  <span className="text-2xl">
                    {val === "good" ? "😇" : val === "bad" ? "😢" : "😐"}
                  </span>
                )
              },
              {
                header: "Content", key: "contentText", render: (val) => (
                  <div className="max-w-md truncate font-medium text-white/80">
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
