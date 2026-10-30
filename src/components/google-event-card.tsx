"use client";

import { useState } from "react";
import { Clock, Edit2, Plus, Trash2, X } from "lucide-react";
import { GOOGLE, GOOGLE_STRIPE, GoogleMark } from "@/components/google-mark";
import type { EventRow } from "@/lib/types";

// One choice for each of Google's colours
const CHOICES = [
  { label: "Task", type: "task", color: GOOGLE.blue, ink: "#FFFFFF" },
  { label: "Side event", type: "event", tier: "side", color: GOOGLE.red, ink: "#FFFFFF" },
  { label: "Main event", type: "event", tier: "main", color: GOOGLE.yellow, ink: GOOGLE.text },
  { label: "Epic event", type: "event", tier: "epic", color: GOOGLE.green, ink: "#FFFFFF" },
] as const;

interface GoogleEventCardProps {
  event: EventRow;
  title: string;
  time: string;
  onEdit: () => void;
  onDelete: () => void;
  onAdd: (type: "task" | "event", tier?: string) => void;
}

// An imported event on the day list. It looks the same in every theme until it's added to
// TaskMaster, so it can't be mistaken for something that earns XP.
export default function GoogleEventCard({ event, title, time, onEdit, onDelete, onAdd }: GoogleEventCardProps) {
  const [adding, setAdding] = useState(false);

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border p-4 pt-5 space-y-3 shadow-sm"
      style={{ background: GOOGLE.surface, borderColor: GOOGLE.border, color: GOOGLE.text }}
    >
      <div aria-hidden className="absolute top-0 inset-x-0 h-1" style={{ background: GOOGLE_STRIPE }} />

      <div className="flex items-center justify-between gap-3">
        <h4 className="font-bold text-sm min-w-0 break-words">{title}</h4>
        <div className="flex gap-2 items-center shrink-0" style={{ color: GOOGLE.muted }}>
          {!event.gcalReadOnly && (
            <button onClick={onEdit} aria-label={`Edit ${event.title}`} className="opacity-100 lg:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 p-1 transition-opacity">
              <Edit2 size={14} />
            </button>
          )}
          <button onClick={onDelete} aria-label={`Delete ${event.title}`} className="opacity-100 lg:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 p-1 transition-opacity">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {event.description && <p className="text-xs line-clamp-2" style={{ color: GOOGLE.muted }}>{event.description}</p>}

      <div className="flex items-center gap-4 text-caption font-mono font-semibold uppercase tracking-[0.12em]" style={{ color: GOOGLE.muted }}>
        <span className="flex items-center gap-1.5"><Clock size={12} /> {time}</span>
        <span className="flex items-center gap-1.5"><GoogleMark size={12} /> Google</span>
      </div>

      {adding ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-caption font-mono font-semibold uppercase tracking-[0.12em]" style={{ color: GOOGLE.muted }}>Add as</span>
          {CHOICES.map(choice => (
            <button
              key={choice.label}
              onClick={() => { setAdding(false); onAdd(choice.type, "tier" in choice ? choice.tier : undefined); }}
              className="px-2.5 py-1 rounded-full text-xs font-bold transition-transform hover:scale-105 active:scale-95"
              style={{ background: choice.color, color: choice.ink }}
            >
              {choice.label}
            </button>
          ))}
          <button onClick={() => setAdding(false)} aria-label="Cancel" className="p-1" style={{ color: GOOGLE.muted }}><X size={14} /></button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 text-caption font-mono font-semibold uppercase tracking-[0.12em] transition-opacity hover:opacity-80"
          style={{ color: GOOGLE.blue }}
        >
          <Plus size={12} /> Add to TaskMaster
        </button>
      )}
    </div>
  );
}
