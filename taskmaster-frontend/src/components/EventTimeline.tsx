"use client";
import { Clock, MapPin, MoreVertical, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Event {
  id: number;
  event_name: string;
  start_time: string;
  end_time: string;
  category: string;
  notes?: string;
}

interface EventTimelineProps {
  events: Event[];
  onDelete: (id: number) => void;
}

export default function EventTimeline({ events, onDelete }: EventTimelineProps) {
  const getCategoryStyles = (category: string) => {
    switch (category.toLowerCase()) {
      case "social": return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "work": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "cue": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <div className="w-full glass rounded-3xl p-6 shadow-xl flex flex-col gap-6">
      <h3 className="text-xl font-semibold text-foreground/90 flex items-center gap-2">
        <Clock className="w-5 h-5 text-rose-400" />
        Schedule
      </h3>

      <div className="relative flex flex-col gap-6 pl-4 border-l-2 border-white/5">
        {events.length === 0 ? (
          <p className="text-muted-foreground/50 text-center py-8 text-sm italic">
            Wide open schedule today.
          </p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="relative group">
              <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-rose-400" />
              
              <div className="flex flex-col gap-2 p-4 rounded-2xl glass hover:border-white/10 transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border mb-2 w-fit",
                      getCategoryStyles(event.category)
                    )}>
                      {event.category}
                    </span>
                    <h4 className="text-base font-semibold text-foreground">{event.event_name}</h4>
                  </div>
                  <button 
                    onClick={() => onDelete(event.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-rose-500/10 text-rose-500/70 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 italic">
                    {format(new Date(event.start_time), "h:mm a")} - {format(new Date(event.end_time), "h:mm a")}
                  </span>
                </div>

                {event.notes && (
                  <p className="text-xs text-muted-foreground/70 bg-white/5 p-2 rounded-lg italic">
                    "{event.notes}"
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
