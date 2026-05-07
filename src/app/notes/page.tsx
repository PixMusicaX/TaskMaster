"use client";

import { useState, useEffect, useCallback } from "react";
import GlassCard from "@/components/glass-card";
import { Save, History, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { format, subDays, addDays, isSameDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { getNoteByDate, saveNote, getRecentNotes } from "@/app/actions/notes";

export default function NotesPage() {
  const [content, setContent] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [recentNotes, setRecentNotes] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const fetchNote = useCallback(async (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const data = await getNoteByDate(dateStr);
    setContent(data?.content || "");
  }, []);

  const fetchRecent = useCallback(async () => {
    const data = await getRecentNotes();
    setRecentNotes(data);
  }, []);

  useEffect(() => {
    fetchNote(selectedDate);
    fetchRecent();
  }, [selectedDate, fetchNote, fetchRecent]);

  async function handleSave() {
    setIsSaving(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    await saveNote(dateStr, content);
    setLastSaved(new Date());
    setIsSaving(false);
    fetchRecent();
  }

  return (
    <div className="p-6 md:p-12 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-tm-purple-dark dark:text-tm-yellow">Daily Notes</h1>
          <p className="text-tm-blue-gray font-medium">Capture your thoughts, plans, and reflections.</p>
        </div>
        <div className="flex items-center gap-2 bg-tm-yellow/10 p-2 rounded-2xl border border-tm-yellow/20">
          <button 
            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            className="p-2 hover:bg-tm-yellow/20 rounded-xl transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="px-4 text-center min-w-[120px]">
            <p className="text-[10px] font-black uppercase text-tm-blue-gray tracking-widest">{format(selectedDate, "EEEE")}</p>
            <p className="font-bold text-sm">{format(selectedDate, "MMM d, yyyy")}</p>
          </div>
          <button 
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            disabled={isSameDay(selectedDate, new Date())}
            className="p-2 hover:bg-tm-yellow/20 rounded-xl transition-colors disabled:opacity-30"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <GlassCard className="min-h-[500px] flex flex-col p-0 overflow-hidden border-tm-yellow/20">
          <div className="border-b border-tm-blue-gray/10 p-4 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-2 text-tm-blue-gray">
              <CalendarIcon size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">{format(selectedDate, "MMMM d")} Entry</span>
            </div>
            <div className="flex items-center gap-4">
              {lastSaved && (
                <span className="text-[10px] text-tm-blue-gray font-bold italic flex items-center gap-1">
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
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind today?"
            className="flex-1 bg-transparent p-8 outline-none resize-none text-lg leading-relaxed placeholder:text-tm-blue-gray/30 font-medium"
          />
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
              
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(day)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all relative overflow-hidden group ${
                    isSelected
                      ? "bg-tm-yellow/20 border-tm-yellow shadow-md"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <p className="text-[10px] font-black text-tm-blue-gray uppercase tracking-widest">{format(day, "EEE, MMM d")}</p>
                  <p className={`text-sm line-clamp-1 mt-1 font-medium ${existingNote ? "text-foreground" : "text-tm-blue-gray/40 italic"}`}>
                    {existingNote ? existingNote.content.replace(/\n/g, " • ") : "No entry yet."}
                  </p>
                  {isSelected && (
                    <motion.div 
                      layoutId="note-indicator"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-tm-yellow"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
