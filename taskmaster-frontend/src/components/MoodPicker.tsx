"use client";
import { Smile, Frown, Meh, Save } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MoodPickerProps {
  mood: number | null;
  content: string;
  onMoodChange: (mood: number) => void;
  onContentChange: (content: string) => void;
  onSave: () => void;
  minimal?: boolean;
}

export default function MoodPicker({ mood, content, onMoodChange, onContentChange, onSave, minimal }: MoodPickerProps) {
  const moods = [
    { value: 1, icon: Frown, label: "Rough", color: "text-rose-400", bg: "hover:bg-rose-400/20" },
    { value: 3, icon: Meh, label: "Okay", color: "text-amber-400", bg: "hover:bg-amber-400/20" },
    { value: 5, icon: Smile, label: "Great", color: "text-emerald-400", bg: "hover:bg-emerald-400/20" },
  ];

  return (
    <div className={cn("w-full glass rounded-3xl p-6 shadow-xl flex flex-col gap-6", minimal && "bg-transparent border-none shadow-none p-0")}>
      {!minimal && (
        <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-foreground/90">Daily Journal</h3>
            <button 
            onClick={onSave}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 transition-all text-sm font-medium"
            >
            <Save className="w-4 h-4" />
            Save Entry
            </button>
        </div>
      )}

      <div className="flex justify-around gap-4 pb-4">
        {moods.map((m) => (
          <button
            key={m.value}
            onClick={() => onMoodChange(m.value)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-3xl transition-all w-24 border border-transparent",
              m.bg,
              mood === m.value ? "bg-white/10 border-white/20 scale-110 shadow-lg" : "opacity-30 hover:opacity-100"
            )}
          >
            <m.icon className={cn("w-10 h-10 transition-all", m.color, mood === m.value && "scale-110")} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{m.label}</span>
          </button>
        ))}
      </div>

      {!minimal && (
        <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="How was your day? Any special moments..."
            className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none italic text-foreground/80"
        />
      )}
    </div>
  );
}
