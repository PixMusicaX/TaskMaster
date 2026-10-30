"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Info, X } from "lucide-react";
import GlassCard from "@/components/glass-card";
import { cn } from "@/lib/utils";

const RULES = [
  ["Imports", "Google events appear from the day you first synced. Older ones don't."],
  ["XP", "Imported events earn nothing until you add them to TaskMaster as a task or event."],
  ["AI", "The AI can't see imported events until you add them to TaskMaster."],
  ["New items", "Tasks and events you create here go to Google unless you turn off Sync to Google."],
  ["Editing", "If an item changes in both places between syncs, TaskMaster's version wins."],
  ["Deleting here", "This only removes the Google copy if the item began in TaskMaster. Anything that began in Google stays there and won't return here."],
  ["Deleting in Google", "This removes the item here too, except completed tasks, which keep their XP."],
  ["Ticking off a task", "This doesn't change anything in Google."],
  ["Not synced", "Holidays, special days and yearly repeats."],
  ["Invites you don't own", "These can't be edited here, and declined ones aren't imported."],
  ["Multi-day events", "These show on every day as Day 1/3 and so on. They're still one event, so editing or deleting any day changes the whole event."],
  ["Timing", "Google changes arrive within about a minute while TaskMaster is open, or straight away when you press Sync."],
];

// A small button that explains what syncing with Google does, and what it can change
export default function SyncLogic({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn("inline-flex items-center gap-1.5 text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray hover:text-foreground transition-colors", className)}
      >
        <Info size={12} /> Sync logic
      </button>

      {/* Portalled because a glass card's backdrop filter would trap a fixed overlay inside the card */}
      {open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="How sync works"
          data-swipe-ignore="true"
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-6 bg-black/40 backdrop-blur-md"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          {/* The card stays still and only its inside scrolls: its edge layers fill the card's box, so they'd scroll through the text */}
          <GlassCard className="w-full max-w-lg max-h-[85vh] flex flex-col p-0 md:p-0">
            <div className="relative shrink-0 flex items-center justify-between gap-4 p-5 md:p-6 pb-4 md:pb-4 border-b border-tm-blue-gray/10">
              <h2 className="text-2xl font-bold">How sync works</h2>
              <button onClick={() => setOpen(false)} aria-label="Close"><X /></button>
            </div>

            <div className="relative min-h-0 overflow-y-auto thin-scrollbar p-5 md:p-6 space-y-5">
            <div role="alert" className="flex gap-3 p-4 rounded-2xl bg-tm-orange-dark/10 border border-tm-orange-dark/30">
              <AlertTriangle size={18} className="text-tm-orange-dark shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-foreground">
                <strong className="font-black">Edits here change the real Google event.</strong> If you rename or reschedule a synced item in TaskMaster, the Google event changes too. For a meeting you organise, guests will see the new details on their calendars.
              </p>
            </div>

            <dl className="space-y-3">
              {RULES.map(([term, detail]) => (
                <div key={term}>
                  <dt className="text-sm font-black text-foreground">{term}</dt>
                  <dd className="text-sm font-medium text-tm-blue-gray">{detail}</dd>
                </div>
              ))}
            </dl>
            </div>
          </GlassCard>
        </div>,
        document.body
      )}
    </>
  );
}
