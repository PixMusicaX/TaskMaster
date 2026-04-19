"use client";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Calendar from "@/components/Calender";
import TaskSection from "@/components/TaskSection";
import EventTimeline from "@/components/EventTimeline";
import MoodPicker from "@/components/MoodPicker";
import UnifiedAddModal from "@/components/UnifiedAddModal";

export default function ManagementPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyData, setDailyData] = useState({ tasks: [], events: [], diary: null });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [diaryContent, setDiaryContent] = useState("");
  const [mood, setMood] = useState<number | null>(null);

  useEffect(() => {
    fetchDailySummary(selectedDate);
  }, [selectedDate]);

  const fetchDailySummary = async (date: Date) => {
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const res = await fetch(`http://localhost:5059/day/${dateStr}`);
      const data = await res.json();
      setDailyData(data);
      setDiaryContent(data.diary?.content || "");
      setMood(data.diary?.mood_rating || null);
    } catch (err) {
      console.error("Fetch failed", err);
    }
  };

  const handleAddTaskEvent = async (type: "task" | "event", data: any) => {
    try {
      if (type === "task") {
        await fetch("http://localhost:5059/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, target_date: format(selectedDate, "yyyy-MM-dd") }),
        });
      } else {
        const start = new Date(selectedDate);
        const [sh, sm] = data.start_time.split(":");
        start.setHours(parseInt(sh), parseInt(sm));

        const end = new Date(selectedDate);
        const [eh, em] = data.end_time.split(":");
        end.setHours(parseInt(eh), parseInt(em));

        await fetch("http://localhost:5059/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            ...data, 
            start_time: start.toISOString(), 
            end_time: end.toISOString() 
          }),
        });
      }
      setIsAddModalOpen(false);
      fetchDailySummary(selectedDate);
    } catch (err) {
      console.error("Add failed", err);
    }
  };

  const handleToggleTask = async (id: number) => {
    const task = dailyData.tasks.find((t: any) => t.id === id);
    if (!task) return;
    try {
      await fetch(`http://localhost:5059/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...task, is_completed: !task.is_completed }),
      });
      fetchDailySummary(selectedDate);
    } catch (err) {
      console.error("Toggle failed", err);
    }
  };

  const handleDeleteTask = async (id: number) => {
    try {
      await fetch(`http://localhost:5059/tasks/${id}`, { method: "DELETE" });
      fetchDailySummary(selectedDate);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleDeleteEvent = async (id: number) => {
    try {
      await fetch(`http://localhost:5059/events/${id}`, { method: "DELETE" });
      fetchDailySummary(selectedDate);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleSaveDiary = async () => {
    try {
      await fetch("http://localhost:5059/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          entry_date: format(selectedDate, "yyyy-MM-dd"), 
          content: diaryContent, 
          mood_rating: mood 
        }),
      });
      fetchDailySummary(selectedDate);
    } catch (err) {
      console.error("Diary save failed", err);
    }
  };

  return (
    <main className="flex-1 flex flex-col overflow-y-auto no-scrollbar relative p-6 md:p-12 lg:p-20 gap-12 bg-background">
      {/* Background Decorations */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="fixed left-1/4 top-1/4 -z-10 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <section className="flex flex-col md:flex-row gap-12 z-10">
        {/* Left Column: Calendar & Journal */}
        <div className="flex-1 flex flex-col gap-12">
          <header className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <h1 className="text-5xl font-black tracking-tighter text-white text-left shadow-none filter-none">Management</h1>
              <p className="text-muted-foreground font-medium italic opacity-60">"The secret of getting ahead is getting started."</p>
            </div>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="px-6 py-3 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
            >
              New Event
            </button>
          </header>

          <Calendar selectedDate={selectedDate} onDateSelect={setSelectedDate} />
          
          <MoodPicker 
            mood={mood} 
            content={diaryContent} 
            onMoodChange={setMood} 
            onContentChange={setDiaryContent} 
            onSave={handleSaveDiary} 
          />
        </div>

        {/* Right Column: Daily Focus & Timeline */}
        <div className="flex-1 flex flex-col gap-8">
          <div className="flex flex-col gap-1 mb-4">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-rose-500/50" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-rose-500/70">{format(selectedDate, "EEEE")}</span>
            </div>
            <h3 className="text-4xl font-black text-white tracking-tighter mt-2">{format(selectedDate, "MMMM do")}</h3>
          </div>

          <AnimatePresence mode="wait">
            <motion.div 
              key={selectedDate.toString()}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-8"
            >
              <TaskSection 
                tasks={dailyData.tasks} 
                onToggle={handleToggleTask} 
                onDelete={handleDeleteTask} 
                onAdd={() => setIsAddModalOpen(true)} 
              />
              <EventTimeline 
                events={dailyData.events} 
                onDelete={handleDeleteEvent} 
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <UnifiedAddModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={handleAddTaskEvent} 
        selectedDate={selectedDate}
      />
    </main>
  );
}
