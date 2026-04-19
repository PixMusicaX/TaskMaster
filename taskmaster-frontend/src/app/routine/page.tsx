"use client";
import React, { useState, useEffect, useMemo } from "react";
import { format, subDays, eachDayOfInterval, isSameDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Eye, EyeOff, CheckCircle2, Circle, ChevronLeft, ChevronRight } from "lucide-react";

interface Habit {
  id: number;
  name: string;
  is_active: bool;
}

interface HabitLog {
  habit_id: number;
  log_date: string;
  is_completed: boolean;
}

export default function RoutinePage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitDays, setNewHabitDays] = useState<number[]>([0,1,2,3,4,5,6]);
  const [batchOffset, setBatchOffset] = useState(0); // 0 = current 14 days, 1 = previous 14, etc.
  const [isConfirmOpen, setIsConfirmOpen] = useState<{ type: 'add' | 'delete', id?: number } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [habitsRes, logsRes] = await Promise.all([
        fetch("http://localhost:5059/habits"),
        fetch("http://localhost:5059/habits/logs"),
      ]);
      const habitsData = await habitsRes.json();
      const logsData = await logsRes.json();
      setHabits(habitsData);
      setLogs(logsData);
    } catch (err) {
      console.error("Failed to fetch routine data", err);
    }
  };

  const dates = useMemo(() => {
    const end = subDays(new Date(), batchOffset * 14);
    const start = subDays(end, 13);
    return eachDayOfInterval({ start, end }).reverse();
  }, [batchOffset]);

  const toggleHabit = async (habitId: number, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    
    // Check if habit is scheduled for this day
    const habit = habits.find(h => h.id === habitId);
    const dayOfWeek = date.getDay();
    const isScheduled = habit?.days_of_week?.includes(dayOfWeek);

    if (!isScheduled) return; // Non-interactive if not scheduled

    // Optimistic update
    const existingLogIndex = logs.findIndex(l => l.habit_id === habitId && l.log_date === dateStr);
    let newLogs = [...logs];
    if (existingLogIndex > -1) {
      newLogs[existingLogIndex].is_completed = !newLogs[existingLogIndex].is_completed;
    } else {
      newLogs.push({ habit_id: habitId, log_date: dateStr, is_completed: true });
    }
    setLogs(newLogs);

    try {
      await fetch("http://localhost:5059/habits/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habit_id: habitId, log_date: dateStr }),
      });
    } catch (err) {
      console.error("Toggle failed", err);
      fetchData();
    }
  };

  const handleAddConfirm = async () => {
    if (!newHabitName.trim()) return;
    try {
      const res = await fetch("http://localhost:5059/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newHabitName, days_of_week: newHabitDays }),
      });
      const newHabit = await res.json();
      setHabits([...habits, newHabit]);
      setNewHabitName("");
      setNewHabitDays([0,1,2,3,4,5,6]);
      setIsConfirmOpen(null);
    } catch (err) {
      console.error("Failed to add habit", err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!isConfirmOpen?.id) return;
    try {
      await fetch(`http://localhost:5059/habits/${isConfirmOpen.id}`, { method: "DELETE" });
      setHabits(habits.map(h => h.id === isConfirmOpen.id ? { ...h, is_active: false } : h));
      setIsConfirmOpen(null);
    } catch (err) {
      console.error("Failed to deactivate habit", err);
    }
  };

  const sortedHabits = useMemo(() => {
    return [...habits]
      .filter(h => showInactive || h.is_active)
      .sort((a, b) => {
        if (a.is_active === b.is_active) return a.id - b.id;
        return a.is_active ? -1 : 1;
      });
  }, [habits, showInactive]);

  const daysLabel = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <main className="flex-1 flex flex-col p-6 md:p-12 lg:p-20 gap-12 bg-background relative overflow-hidden">
      {/* Background Decorations */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      <header className="z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white text-left shadow-none filter-none">Routine</h1>
          <p className="text-muted-foreground font-medium italic opacity-60">"Success is the sum of small efforts, repeated day-in and day-out."</p>
        </div>

        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-2 rounded-2xl">
              <input 
                type="text" 
                placeholder="New Habit..." 
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                className="bg-transparent border-none outline-none text-white px-4 py-2 w-48 font-medium"
              />
              <button 
                onClick={() => setIsConfirmOpen({ type: 'add' })}
                className="p-3 bg-white text-black rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-1 justify-center">
                {daysLabel.map((day, idx) => (
                    <button 
                        key={idx}
                        onClick={() => setNewHabitDays(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx])}
                        className={`w-7 h-7 rounded-lg text-[10px] font-bold transition-all border ${newHabitDays.includes(idx) ? 'bg-white text-black border-white' : 'bg-white/5 text-muted-foreground border-white/10'}`}
                    >
                        {day}
                    </button>
                ))}
            </div>
        </div>
      </header>

      <section className="z-10 flex flex-col gap-6 max-h-[70vh]">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
                    <button 
                        onClick={() => setBatchOffset(prev => prev + 1)}
                        className="p-2 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-white transition-all"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="px-2 text-xs font-black text-white uppercase tracking-widest">
                        {batchOffset === 0 ? "Current" : `${batchOffset * 14}d ago`}
                    </span>
                    <button 
                        onClick={() => setBatchOffset(prev => Math.max(0, prev - 1))}
                        disabled={batchOffset === 0}
                        className="p-2 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-white transition-all disabled:opacity-20"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                <button 
                  onClick={() => setShowInactive(!showInactive)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all border ${showInactive ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-white/5 border-white/10 text-muted-foreground'}`}
                >
                  {showInactive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {showInactive ? "Showing All" : "Hide Inactive"}
                </button>
            </div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground/40">
                14 Day Batch • Batch {batchOffset + 1}
            </div>
        </div>

        {/* HABIT GRID CONTAINER WITH VERTICAL SCROLL */}
        <div className="w-full overflow-x-auto no-scrollbar pb-6">
          <div className="inline-block min-w-full glass rounded-[2.5rem] p-8 border border-white/5 max-h-[500px] overflow-y-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-[#0c0c0e] z-30">
                <tr>
                  <th className="p-4 text-left border-b border-white/5 min-w-[200px] sticky left-0 bg-[#0c0c0e] z-20">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/50">Habit</span>
                  </th>
                  {dates.map((date) => (
                    <th key={date.toString()} className="p-4 border-b border-white/5 min-w-[60px]">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">{format(date, "EEE")}</span>
                        <span className="text-sm font-black text-white">{format(date, "dd")}</span>
                      </div>
                    </th>
                  ))}
                  <th className="p-4 border-b border-white/5"></th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {sortedHabits.map((habit) => (
                    <motion.tr 
                      key={habit.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`group hover:bg-white/[0.02] transition-colors ${!habit.is_active ? 'opacity-40 grayscale' : ''}`}
                    >
                      <td className="p-4 border-b border-white/5 sticky left-0 bg-[#0c0c0e] z-20">
                        <div className="flex flex-col">
                          <span className="text-lg font-bold text-white tracking-tight">{habit.name}</span>
                          {!habit.is_active && <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400">Inactive</span>}
                        </div>
                      </td>
                      {dates.map((date) => {
                        const dateStr = format(date, "yyyy-MM-dd");
                        const isCompleted = logs.some(l => l.habit_id === habit.id && l.log_date === dateStr && l.is_completed);
                        const dayOfWeek = date.getDay();
                        const isScheduled = habit.days_of_week?.includes(dayOfWeek);

                        return (
                          <td key={dateStr} className="p-4 border-b border-white/5">
                            <div className="flex justify-center">
                              {isScheduled ? (
                                  <button
                                    onClick={() => toggleHabit(habit.id, date)}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-90 border-2 ${isCompleted ? 'bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/20' : 'border-white/10 hover:border-white/30'}`}
                                  >
                                    {isCompleted && <CheckCircle2 className="w-5 h-5 text-white" />}
                                  </button>
                              ) : (
                                  <div className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/20 flex items-center justify-center opacity-30">
                                      <div className="w-1 h-1 bg-muted-foreground/40 rounded-full" />
                                  </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td className="p-4 border-b border-white/5 text-right">
                        {habit.is_active && (
                          <button 
                            onClick={() => setIsConfirmOpen({ type: 'delete', id: habit.id })}
                            className="p-2 text-rose-500/30 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CONFIRMATION MODAL */}
      <AnimatePresence>
        {isConfirmOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsConfirmOpen(null)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-md glass p-8 rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col items-center text-center gap-6"
                >
                    <div className={`p-4 rounded-2xl ${isConfirmOpen.type === 'delete' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {isConfirmOpen.type === 'delete' ? <Trash2 className="w-8 h-8" /> : <Plus className="w-8 h-8" />}
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
                            {isConfirmOpen.type === 'delete' ? "Deactivate Habit?" : "Add New Habit?"}
                        </h3>
                        <p className="text-muted-foreground mt-2 font-medium">
                            {isConfirmOpen.type === 'delete' 
                                ? "This habit will be moved to the inactive section. History is preserved."
                                : `Are you sure you want to add "${newHabitName}" to your routine?`}
                        </p>
                    </div>
                    <div className="flex gap-4 w-full">
                        <button 
                            onClick={() => setIsConfirmOpen(null)}
                            className="flex-1 px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={isConfirmOpen.type === 'delete' ? handleDeleteConfirm : handleAddConfirm}
                            className={`flex-1 px-6 py-4 rounded-2xl font-bold transition-all shadow-lg ${isConfirmOpen.type === 'delete' ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-white text-black shadow-white/20'}`}
                        >
                            Confirm
                        </button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      <footer className="mt-auto pt-12 text-center text-muted-foreground text-[10px] uppercase tracking-[0.5em] opacity-20">
        Consistency Is Key
      </footer>
    </main>
  );
}
