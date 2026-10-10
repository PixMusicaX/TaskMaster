"use client";

import { useState } from "react";
import { FlaskConical, LogOut } from "lucide-react";
import { endDemo } from "@/app/actions/demo";
import { clearAccountStorage } from "@/components/account-scope";

// Rides along on every page of a demo: says what this is, and offers the two ways out
export default function DemoBanner() {
  const [leaving, setLeaving] = useState(false);

  async function leave(toLogin: boolean) {
    setLeaving(true);
    // The demo's rank and era shouldn't linger in this browser
    clearAccountStorage();
    try { localStorage.removeItem("tm_user"); } catch { /* storage blocked */ }
    await endDemo(toLogin);
  }

  return (
    <div className="fixed z-[95] left-1/2 -translate-x-1/2 bottom-24 lg:bottom-4 w-max max-w-[calc(100vw-1.5rem)] flex items-center gap-2 sm:gap-3 pl-3 pr-1.5 py-1.5 rounded-full bg-tm-purple-dark text-white shadow-xl border border-white/15">
      <FlaskConical size={14} className="text-tm-yellow shrink-0" />
      <p className="text-caption font-mono font-semibold uppercase tracking-[0.12em] truncate">
        Demo<span className="hidden sm:inline"> · nothing here is saved</span>
      </p>
      <button onClick={() => leave(true)} disabled={leaving} className="px-3 py-1.5 rounded-full bg-tm-yellow text-tm-purple-dark text-caption font-mono font-semibold uppercase tracking-[0.12em] hover:scale-[1.04] transition-transform disabled:opacity-60">
        Sign in<span className="hidden sm:inline"> for real</span>
      </button>
      <button onClick={() => leave(false)} disabled={leaving} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-caption font-mono font-semibold uppercase tracking-[0.12em] transition-colors disabled:opacity-60">
        <LogOut size={12} /> {leaving ? "Leaving…" : "Exit"}
      </button>
    </div>
  );
}
