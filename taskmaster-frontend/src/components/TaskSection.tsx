"use client";
import { CheckCircle2, Circle, Trash2, PlusCircle } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Task {
  id: number;
  title: string;
  is_completed: boolean;
  target_date: string;
}

interface TaskSectionProps {
  tasks: Task[];
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onAdd: () => void;
}

export default function TaskSection({ tasks, onToggle, onDelete, onAdd }: TaskSectionProps) {
  return (
    <div className="w-full glass rounded-3xl p-6 shadow-xl flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-foreground/90 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          Daily Focus
        </h3>
        <button 
          onClick={onAdd}
          className="p-1.5 hover:bg-emerald-400/10 text-emerald-400 rounded-full transition-all"
        >
          <PlusCircle className="w-6 h-6" />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {tasks.length === 0 ? (
          <p className="text-muted-foreground/50 text-center py-8 text-sm italic">
            No tasks for today. Relax!
          </p>
        ) : (
          tasks.map((task) => (
            <div 
              key={task.id}
              className={cn(
                "group flex items-center justify-between p-4 rounded-2xl transition-all border border-transparent",
                task.is_completed ? "bg-white/5 opacity-50" : "glass hover:border-white/10 hover:shadow-lg"
              )}
            >
              <div 
                className="flex items-center gap-3 cursor-pointer flex-1"
                onClick={() => onToggle(task.id)}
              >
                {task.is_completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground/30 shrink-0" />
                )}
                <span className={cn(
                  "text-sm font-medium transition-all",
                  task.is_completed && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </span>
              </div>
              <button 
                onClick={() => onDelete(task.id)}
                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-rose-500/10 text-rose-500/70 rounded-xl transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
