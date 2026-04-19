"use client";
import { useState } from "react";
import { X, Calendar as CalendarIcon, CheckCircle2, Clock, AlignLeft, Tags } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface UnifiedAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (type: "task" | "event", data: any) => void;
  selectedDate: Date;
}

export default function UnifiedAddModal({ isOpen, onClose, onAdd, selectedDate }: UnifiedAddModalProps) {
  const [activeTab, setActiveTab] = useState<"task" | "event">("task");
  
  // Task State
  const [taskTitle, setTaskTitle] = useState("");
  
  // Event State
  const [eventTitle, setEventTitle] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [category, setCategory] = useState("Personal");
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "task") {
      onAdd("task", { title: taskTitle });
      setTaskTitle("");
    } else {
      onAdd("event", { 
        event_name: eventTitle, 
        start_time: startTime, 
        end_time: endTime, 
        category, 
        notes 
      });
      setEventTitle("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose} 
      />
      
      <div className="relative glass w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full">
          <X className="w-5 h-5" />
        </button>

        <div className="flex gap-4 mb-8 bg-white/5 p-1 rounded-2xl w-fit">
          <button 
            onClick={() => setActiveTab("task")}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-semibold transition-all",
              activeTab === "task" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:bg-white/5"
            )}
          >
            New Task
          </button>
          <button 
            onClick={() => setActiveTab("event")}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-semibold transition-all",
              activeTab === "event" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:bg-white/5"
            )}
          >
            New Event
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {activeTab === "task" ? (
            <div className="flex flex-col gap-4">
              <div className="relative">
                <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
                <input 
                  autoFocus
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Tell TaskMaster what to do..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="relative">
                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
                <input 
                  autoFocus
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Event Name (e.g. Meet X)"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2">Starts</label>
                  <input 
                    type="time" 
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2">Ends</label>
                  <input 
                    type="time" 
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2">Category</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="Personal">Personal</option>
                  <option value="Social">Social</option>
                  <option value="Work">Work</option>
                  <option value="Cue">Personal Cue</option>
                </select>
              </div>

              <div className="relative">
                <AlignLeft className="absolute left-4 top-4 w-5 h-5 text-muted-foreground/50" />
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes or general details..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none italic"
                />
              </div>
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-primary text-primary-foreground py-4 rounded-2xl text-lg font-bold shadow-xl hover:scale-[1.02] transition-all active:scale-95 mt-4"
          >
            Create {activeTab === "task" ? "Task" : "Event"}
          </button>
        </form>
      </div>
    </div>
  );
}
