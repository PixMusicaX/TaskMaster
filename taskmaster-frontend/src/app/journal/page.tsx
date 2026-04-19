"use client";
import React, { useState, useEffect } from "react";
import { format, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, Save, Calendar as CalendarIcon, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MoodPicker from "@/components/MoodPicker";
import BulletEditor, { BulletItem } from "@/components/BulletEditor";

export default function JournalPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mood, setMood] = useState<number | null>(null);
  const [bullets, setBullets] = useState<BulletItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    fetchEntry();
  }, [currentDate]);

  const fetchEntry = async () => {
    setIsLoading(true);
    const dateStr = format(currentDate, "yyyy-MM-dd");
    try {
      const res = await fetch(`http://localhost:5059/day/${dateStr}`);
      const data = await res.json();
      if (data.diary) {
        setMood(data.diary.mood_rating);
        setBullets(data.diary.content || []);
      } else {
        setMood(null);
        setBullets([]);
      }
    } catch (err) {
      console.error("Failed to fetch diary entry", err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveEntry = async () => {
    setIsSaving(true);
    const dateStr = format(currentDate, "yyyy-MM-dd");
    try {
      const res = await fetch("http://localhost:5059/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry_date: dateStr,
          content: bullets,
          mood_rating: mood,
        }),
      });
      if (res.ok) {
        setLastSaved(new Date());
        setTimeout(() => setLastSaved(null), 3000);
      } else {
          console.error("Save failed with status", res.status);
      }
    } catch (err) {
      console.error("Failed to save diary entry", err);
    } finally {
      setIsSaving(false);
    }
  };

  const adjustDate = (days: number) => {
    setCurrentDate(addDays(currentDate, days));
  };

  const SkeletonLoader = () => (
    <div className="flex flex-col gap-6 w-full animate-pulse">
        {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-4 items-center">
                <div className="w-8 h-8 rounded-lg bg-white/5" />
                <div className="flex-1 h-4 bg-white/5 rounded-full" />
                <div className="w-4 h-4 rounded-lg bg-white/5" />
            </div>
        ))}
    </div>
  );

  return (
    <main className="flex-1 flex flex-col p-6 md:p-12 lg:p-20 gap-12 bg-background relative overflow-hidden">
      {/* Background Decorations */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute top-0 right-0 p-20 opacity-20 -z-10 blur-3xl bg-indigo-500/30 rounded-full w-[600px] h-[600px]" />

      <header className="z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4 text-indigo-400 font-bold uppercase tracking-[0.4em] text-[10px] mb-2">
            <Sparkles className="w-4 h-4" /> Reflections
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white text-left">Journal</h1>
        </div>

        <div className="flex items-center gap-4">
             <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-1 pr-4 group transition-all hover:border-white/20">
                <button 
                    onClick={() => adjustDate(-1)}
                    className="p-3 hover:bg-white/5 rounded-xl text-muted-foreground hover:text-white transition-all active:scale-95"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex flex-col items-center min-w-[120px]">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                        {format(currentDate, "EEE, MMM yyyy")}
                    </span>
                    <span className="text-xl font-black text-white tracking-widest leading-none mt-1">
                        {format(currentDate, "dd")}
                    </span>
                </div>
                <button 
                    onClick={() => adjustDate(1)}
                    className="p-3 hover:bg-white/5 rounded-xl text-muted-foreground hover:text-white transition-all active:scale-95"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
      </header>

      <div className="z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 max-w-7xl">
        {/* LEFT COLUMN: MOOD */}
        <div className="lg:col-span-5 flex flex-col gap-8">
            <div className="flex flex-col gap-4">
                <span className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground/40 px-2">Daily Vibes</span>
                <MoodPicker 
                    mood={mood} 
                    content="" 
                    onMoodChange={setMood} 
                    onContentChange={() => {}} 
                    onSave={saveEntry}
                    minimal={true} 
                />
            </div>
            
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={saveEntry}
                disabled={isSaving || isLoading}
                className="w-full py-6 rounded-[2rem] bg-indigo-500 hover:bg-indigo-400 text-white font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-4 transition-all disabled:opacity-50"
            >
                {isSaving ? "Syncing..." : (
                    <>
                        <Save className="w-5 h-5" />
                        Save Reflections
                    </>
                )}
            </motion.button>
            
            <AnimatePresence>
                {lastSaved && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-center text-[10px] font-bold text-emerald-400 uppercase tracking-widest"
                    >
                        Success • Entry Synced at {format(lastSaved, "HH:mm")}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* RIGHT COLUMN: BULLETS */}
        <div className="lg:col-span-1" /> {/* Spacer */}
        <div className="lg:col-span-6 flex flex-col gap-6">
            <div className="glass rounded-[3rem] p-10 border border-white/5 shadow-2xl min-h-[500px]">
                {isLoading ? (
                    <SkeletonLoader />
                ) : (
                    <BulletEditor 
                        bullets={bullets} 
                        onChange={setBullets} 
                    />
                )}
            </div>
        </div>
      </div>
      
      <footer className="mt-auto pt-12 text-center text-muted-foreground text-[10px] uppercase tracking-[0.5em] opacity-20">
        Words Have Power
      </footer>
    </main>
  );
}
