"use client";

import { useState, useEffect } from "react";
import GlassCard from "@/components/glass-card";
import { Plus, Trash2, Check, X, Edit2, Archive, RotateCcw, Search, Swords, Brain, Coins, HeartPulse, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { getHabits, addHabit, updateHabit, archiveHabit, restoreHabit, deleteHabitPermanently, toggleHabitLog, getArchivedHabits } from "@/app/actions/habits";
import { cn } from "@/lib/utils";

export default function HabitsPage() {
  const [habits, setHabits] = useState<any[]>([]);
  const [archivedHabits, setArchivedHabits] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingHabit, setEditingHabit] = useState<any>(null);
  const [showArchive, setShowArchive] = useState(false);
  
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("✨");
  const [newStat, setNewStat] = useState("intelligence");
  const [newFrequency, setNewFrequency] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const DAYS = [
    { label: "M", value: 1 },
    { label: "T", value: 2 },
    { label: "W", value: 3 },
    { label: "T", value: 4 },
    { label: "F", value: 5 },
    { label: "S", value: 6 },
    { label: "S", value: 0 },
  ];

  useEffect(() => {
    fetchHabits();
  }, []);

  async function fetchHabits() {
    const data = await getHabits();
    const archivedData = await getArchivedHabits();
    setHabits(data);
    setArchivedHabits(archivedData);
  }

  async function handleAddHabit() {
    if (!newName) return;
    await addHabit(newName, newIcon, undefined, newFrequency, newStat);
    resetForm();
    fetchHabits();
  }

  async function handleUpdateHabit() {
    if (!newName || !editingHabit) return;
    await updateHabit(editingHabit.id, {
      name: newName,
      icon: newIcon,
      frequency: newFrequency,
      stat: newStat
    });
    resetForm();
    fetchHabits();
  }

  function resetForm() {
    setNewName("");
    setNewIcon("✨");
    setNewStat("intelligence");
    setNewFrequency([0, 1, 2, 3, 4, 5, 6]);
    setShowAdd(false);
    setEditingHabit(null);
  }

  function openEdit(habit: any) {
    setEditingHabit(habit);
    setNewName(habit.name);
    setNewIcon(habit.icon);
    setNewStat(habit.stat || "intelligence");
    setNewFrequency(habit.frequency || [0, 1, 2, 3, 4, 5, 6]);
    setShowAdd(true);
  }

  async function handleArchive(id: string) {
    await archiveHabit(id);
    fetchHabits();
  }

  async function handleRestore(id: string) {
    await restoreHabit(id);
    fetchHabits();
  }

  async function handleDeletePermanent(id: string) {
    if (confirm("Permanently delete this habit and all its logs?")) {
      await deleteHabitPermanently(id);
      fetchHabits();
    }
  }

  async function handleToggle(habitId: string, date: Date, currentStatus: boolean, habitFrequency: number[]) {
    if (!habitFrequency.includes(date.getDay())) return;
    const dateStr = format(date, "yyyy-MM-dd");
    await toggleHabitLog(habitId, dateStr, !currentStatus);
    fetchHabits();
  }

  function getFrequencyLabel(freq: number[]) {
    if (!freq || freq.length === 0) return "Daily";
    if (freq.length === 7) return "Daily";
    if (freq.length === 5 && !freq.includes(0) && !freq.includes(6)) return "Weekdays";
    if (freq.length === 2 && freq.includes(0) && freq.includes(6)) return "Weekends";
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return freq.map(f => labels[f]).join(", ");
  }

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-tm-purple-dark dark:text-tm-yellow">Habit Tracker</h1>
          <p className="text-tm-blue-gray font-medium">Consistency is the key to mastery.</p>
        </div>
        <div className="flex gap-4 relative z-50">
          <button 
            onClick={() => setShowArchive(!showArchive)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl font-black transition-all backdrop-blur-xl border shadow-2xl",
              showArchive 
                ? "bg-tm-purple-dark text-tm-yellow border-tm-purple-dark" 
                : "bg-white/20 dark:bg-white/5 border-white/20 text-tm-purple-dark dark:text-tm-yellow saturate-150"
            )}
          >
            <Archive size={20} /> {showArchive ? "Hide Archive" : "View Archive"}
          </button>
          <button 
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-tm-orange-dark/80 backdrop-blur-xl saturate-150 text-white px-6 py-3 rounded-2xl font-black hover:scale-105 transition-transform shadow-xl border border-tm-orange-dark/30"
          >
            <Plus size={20} /> Add Habit
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm"
          >
            <GlassCard className="w-full max-w-md space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{editingHabit ? "Edit Habit" : "New Habit"}</h2>
                <button onClick={resetForm}><X /></button>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-tm-blue-gray tracking-widest pl-1">Associate Skill</p>
                  <div className="grid grid-cols-5 gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                    {[
                      { id: "strength", icon: Swords },
                      { id: "intelligence", icon: Brain },
                      { id: "wealth", icon: Coins },
                      { id: "vitality", icon: HeartPulse },
                      { id: "charisma", icon: Users },
                    ].map((s) => (
                      <button 
                        key={s.id}
                        onClick={() => setNewStat(s.id)}
                        className={cn(
                          "py-2 rounded-lg flex items-center justify-center transition-all",
                          newStat === s.id ? "bg-tm-yellow text-tm-purple-dark shadow-lg" : "text-tm-blue-gray hover:bg-white/5"
                        )}
                        title={s.id}
                      >
                        <s.icon size={16} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-tm-blue-gray tracking-widest pl-1">Name</p>
                  <input 
                    autoFocus
                    placeholder="E.g. Morning Yoga"
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-tm-yellow font-bold"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-tm-blue-gray tracking-widest pl-1">Emoji Icon</p>
                  <div className="flex gap-2">
                    <input 
                      placeholder="Paste emoji here"
                      className="flex-1 bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-tm-yellow text-2xl text-center"
                      value={newIcon}
                      onChange={(e) => setNewIcon(e.target.value)}
                      maxLength={2}
                    />
                    <div className="flex items-center gap-1 bg-white/5 p-2 rounded-2xl border border-white/10 overflow-x-auto">
                      {["✨", "🧘", "📚", "💪", "🏃", "💧", "🥗", "✍️", "🛌", "🧠"].map(emoji => (
                        <button 
                          key={emoji}
                          onClick={() => setNewIcon(emoji)}
                          className={cn(
                            "text-xl p-2 rounded-lg transition-all",
                            newIcon === emoji ? "bg-tm-yellow/20" : "hover:bg-white/10"
                          )}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[8px] text-tm-blue-gray italic pl-1">Tip: Use Win + . to open emoji picker on Windows</p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-tm-blue-gray tracking-widest pl-1">Repeat on</p>
                  <div className="flex justify-between gap-1">
                    {DAYS.map((day) => {
                      const isSelected = newFrequency.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          onClick={() => {
                            setNewFrequency(prev => 
                              prev.includes(day.value) 
                                ? prev.filter(v => v !== day.value)
                                : [...prev, day.value]
                            );
                          }}
                          className={cn(
                            "w-10 h-10 rounded-xl border font-bold text-xs transition-all",
                            isSelected ? "bg-tm-yellow text-tm-purple-dark border-tm-yellow shadow-md" : "bg-white/5 border-white/10 text-tm-blue-gray"
                          )}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button 
                  onClick={editingHabit ? handleUpdateHabit : handleAddHabit}
                  className="w-full bg-tm-yellow text-tm-purple-dark font-black py-4 rounded-2xl shadow-xl hover:bg-tm-yellow/80 transition-colors"
                >
                  {editingHabit ? "UPDATE HABIT" : "CREATE HABIT"}
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showArchive && archivedHabits.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 pl-2">
              <Archive size={24} className="text-tm-purple-dark dark:text-tm-yellow" />
              <h2 className="text-2xl font-black">Habit Archive</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {archivedHabits.map((habit) => (
                <GlassCard key={habit.id} className="p-4 border-l-4 border-l-tm-blue-gray/30 opacity-70 hover:opacity-100 transition-opacity">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{habit.icon}</span>
                      <div>
                        <h3 className="font-bold text-sm truncate max-w-[150px]">{habit.name}</h3>
                        <p className="text-[10px] text-tm-blue-gray font-black uppercase">{getFrequencyLabel(habit.frequency)}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleRestore(habit.id)}
                        className="p-2 text-tm-yellow hover:bg-tm-yellow/10 rounded-lg transition-all"
                        title="Restore"
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeletePermanent(habit.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete Permanently"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <GlassCard className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-[240px_repeat(7,1fr)] mb-8">
            <div className="font-bold text-tm-blue-gray text-xs uppercase tracking-widest pl-4">Habit</div>
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="text-center space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-tm-blue-gray">
                  {format(day, "EEE")}
                </p>
                <div className={cn(
                  "w-9 h-9 mx-auto rounded-full flex items-center justify-center font-bold text-sm transition-all",
                  isSameDay(day, today) ? "bg-tm-orange-dark text-white shadow-lg shadow-tm-orange-dark/20" : "text-tm-blue-gray bg-tm-blue-gray/5"
                )}>
                  {format(day, "d")}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            {habits.map((habit) => (
              <div key={habit.id} className="grid grid-cols-[240px_repeat(7,1fr)] items-center group">
                <div className="flex items-center gap-4 pl-4 relative">
                  <div className="w-10 h-10 bg-tm-yellow/10 rounded-xl flex items-center justify-center text-xl">
                    {habit.icon}
                  </div>
                  <div className="flex-1 overflow-hidden pr-12">
                    <p className="font-bold text-sm truncate">{habit.name}</p>
                    <p className="text-[10px] text-tm-blue-gray uppercase font-black tracking-tighter truncate">
                      {getFrequencyLabel(habit.frequency)}
                    </p>
                  </div>
                  <div className="absolute right-0 opacity-0 group-hover:opacity-100 flex gap-0.5 transition-all">
                    <button 
                      onClick={() => openEdit(habit)}
                      className="p-2 text-tm-blue-gray hover:text-tm-yellow transition-all hover:bg-tm-yellow/5 rounded-lg"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleArchive(habit.id)}
                      className="p-2 text-tm-blue-gray hover:text-tm-orange-dark transition-all hover:bg-tm-orange-dark/5 rounded-lg"
                    >
                      <Archive size={14} />
                    </button>
                  </div>
                </div>
                {weekDays.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const isDone = habit.logs?.some((l: any) => l.date === dateStr && l.completed);
                  const isActive = !habit.frequency || habit.frequency.includes(day.getDay());
                  
                  return (
                    <div key={day.toISOString()} className="flex justify-center">
                      <button 
                        onClick={() => handleToggle(habit.id, day, isDone, habit.frequency || [0,1,2,3,4,5,6])}
                        disabled={!isActive}
                        className={cn(
                          "relative w-10 h-10 rounded-2xl border-2 transition-all flex items-center justify-center group/check overflow-hidden",
                          !isActive ? "opacity-20 cursor-not-allowed border-transparent bg-tm-blue-gray/5" : (
                            isDone 
                              ? "bg-tm-yellow border-tm-yellow shadow-lg shadow-tm-yellow/20" 
                              : "border-tm-blue-gray/10 hover:border-tm-yellow/40 bg-white/5"
                          )
                        )}
                      >
                        {isActive && (
                          <>
                            <Check 
                              size={20} 
                              className={cn(
                                "transition-all duration-300",
                                isDone ? "text-tm-purple-dark scale-100" : "text-tm-yellow opacity-0 scale-50 group-hover/check:opacity-40"
                              )} 
                            />
                            {isDone && (
                              <motion.div 
                                layoutId={`bubble-${habit.id}-${dateStr}`}
                                className="absolute inset-0 bg-white/20"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                              />
                            )}
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
            {habits.length === 0 && (
              <div className="py-12 text-center text-tm-blue-gray italic opacity-50">
                No active habits. Click "Add Habit" to start!
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-tm-purple-dark dark:text-tm-yellow flex items-center gap-3">
          Consistency Map <span className="text-xs font-medium bg-tm-yellow/10 px-2 py-1 rounded-lg text-tm-yellow">Last 4 Weeks</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {habits.map((habit) => (
            <GlassCard key={habit.id} className="p-4 border-l-4 border-l-tm-yellow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{habit.icon}</span>
                  <h3 className="font-bold text-sm truncate max-w-[150px]">{habit.name}</h3>
                </div>
                <span className="text-[10px] font-black text-tm-yellow">
                  {Math.round((habit.logs?.filter((l:any)=>l.completed).length || 0) / 28 * 100)}%
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 28 }, (_, i) => {
                  const day = subDays(today, i);
                  const dateStr = format(day, "yyyy-MM-dd");
                  const isDone = habit.logs?.some((l:any) => l.date === dateStr && l.completed);
                  return (
                    <motion.div 
                      key={i} 
                      whileHover={{ scale: 1.2 }}
                      className={cn(
                        "aspect-square rounded-md border border-tm-blue-gray/5 transition-colors",
                        isDone ? "bg-tm-yellow" : "bg-tm-blue-gray/10"
                      )} 
                    />
                  );
                }).reverse()}
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}

function subDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}
