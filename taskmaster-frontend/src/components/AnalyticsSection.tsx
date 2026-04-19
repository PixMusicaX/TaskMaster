"use client";
import { useState, useEffect } from "react";
import Bento from "./Bento";

interface Stats {
  pending_tasks: number;
  completed_tasks: number;
  events_today: number;
  todays_mood: number | null;
}

export default function AnalyticsSection() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("http://localhost:5059/stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  if (!stats) return (
    <div className="w-full flex flex-col items-center justify-center p-20 opacity-30 animate-pulse">
        <h2 className="text-4xl font-black text-white mb-8">Loading Analytics...</h2>
        <div className="grid gap-6 lg:grid-cols-3 w-full max-w-6xl">
            {[1, 2, 3].map(i => <div key={i} className="h-48 glass rounded-[2rem]" />)}
        </div>
    </div>
  );

  return (
    <section
      id="analytics-section"
      className="w-full min-h-screen p-6 md:p-20 flex flex-col items-center relative overflow-hidden"
    >
        {/* Background Decorative Glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center w-full">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tighter">Analytics Dashboard</h2>
            <p className="text-muted-foreground mb-16 text-center max-w-md">Realtime insights into your productivity and wellbeing.</p>
            
            <Bento stats={stats} />
        </div>
    </section>
  );
}
