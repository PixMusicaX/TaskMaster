"use client";

import GlassCard from "@/components/glass-card";
import { Info, Shield, Zap, Heart, Github, Twitter, Mail, Code2, Palette, Sparkles, Trophy, Star, History, Swords, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getSeasonHistory } from "@/app/actions/gamification";
import { getSmartMissionHistory } from "@/app/actions/smart-missions";
import { getReliefHistory } from "@/app/actions/relief";
import { format } from "date-fns";
import { Music, Film, Coffee, Dumbbell } from "lucide-react";

export default function AboutPage() {
  const [seasonHistory, setSeasonHistory] = useState<any[]>([]);
  const [missionHistory, setMissionHistory] = useState<any[]>([]);
  const [reliefHistory, setReliefHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [seasonsLimit, setSeasonsLimit] = useState(6);
  const [missionsLimit, setMissionsLimit] = useState(5);

  useEffect(() => {
    async function loadData() {
      const [seasons, missions, relief] = await Promise.all([
        getSeasonHistory(50), 
        getSmartMissionHistory(100),
        getReliefHistory(100)
      ]);
      setSeasonHistory(seasons.filter(s => s.xp > 0));
      setMissionHistory(missions);
      setReliefHistory(relief);
      setLoading(false);
    }
    loadData();
  }, []);

  const stats = [
    { label: "Design", value: "Premium", icon: Palette },
    { label: "Performance", value: "Blazing", icon: Zap },
    { label: "Security", value: "Robust", icon: Shield },
    { label: "Built for", value: "Creatives", icon: Sparkles },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-16 pb-24">
      {/* Header section */}
      <div className="text-center space-y-4">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 bg-tm-orange-dark mx-auto rounded-[2rem] flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-tm-orange-dark/20 mb-8"
        >
          T
        </motion.div>
        <h1 className="text-5xl md:text-6xl font-black tracking-tight text-tm-purple-dark dark:text-tm-yellow">
          The Vault
        </h1>
        <p className="text-xl text-tm-blue-gray font-medium max-w-2xl mx-auto uppercase tracking-widest text-[10px] font-black">
          Legacy • History • Achievements
        </p>
      </div>

      {/* Hall of Fame Section */}
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Trophy className="text-tm-yellow" size={32} />
          <h2 className="text-3xl font-black text-tm-purple-dark dark:text-white italic tracking-tighter uppercase">Hall of Fame</h2>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-white/5 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : seasonHistory.length > 0 ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {seasonHistory.slice(0, seasonsLimit).map((season, idx) => (
                <GlassCard key={idx} delay={idx * 0.1} className="p-6 border-tm-blue-gray/10 dark:border-white/5 bg-tm-purple-dark/[0.02] dark:bg-white/5 hover:bg-tm-purple-dark/[0.05] dark:hover:bg-white/10 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-xl font-black text-tm-yellow leading-tight">{season.monthName}</h4>
                      <p className="text-xs font-bold text-tm-blue-gray uppercase tracking-widest">{season.year}</p>
                    </div>
                    <div className="bg-tm-yellow/20 p-2 rounded-xl group-hover:scale-110 transition-transform">
                      <Star className="text-tm-yellow" size={20} fill="currentColor" />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black uppercase text-tm-blue-gray">Final Score</span>
                      <span className="text-2xl font-black text-tm-purple-dark dark:text-white">{season.xp} <span className="text-xs text-tm-blue-gray">XP</span></span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-white/5 rounded text-[8px] font-black uppercase tracking-widest text-tm-yellow border border-white/5">
                        LVL {season.level}
                      </span>
                      <span className="px-2 py-1 bg-white/5 rounded text-[8px] font-black uppercase tracking-widest text-tm-blue-gray border border-white/5">
                        {season.title}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
            {seasonHistory.length > seasonsLimit && (
              <div className="flex justify-center pt-4">
                <button 
                  onClick={() => setSeasonsLimit(prev => prev + 6)}
                  className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-tm-yellow/10 hover:text-tm-yellow transition-all"
                >
                  Load More Seasons
                </button>
              </div>
            )}
          </div>
        ) : (
          <GlassCard className="p-12 text-center border-tm-blue-gray/5">
            <Trophy size={48} className="mx-auto text-tm-blue-gray/20 mb-4" />
            <p className="text-tm-blue-gray font-medium">Your legacy begins today. Complete your first season to enter the Hall of Fame.</p>
          </GlassCard>
        )}
      </div>

      {/* Quest Log Section */}
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <History className="text-tm-orange-light" size={32} />
          <h2 className="text-3xl font-black text-tm-purple-dark dark:text-white italic tracking-tighter uppercase">Quest Log</h2>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : missionHistory.length > 0 ? (
          <div className="space-y-6">
            <div className="space-y-4">
              {missionHistory.slice(0, missionsLimit).map((mission, idx) => (
                <GlassCard key={idx} delay={idx * 0.05} className="p-4 border-tm-blue-gray/10 dark:border-white/5 bg-tm-purple-dark/[0.02] dark:bg-white/5 hover:border-tm-orange-light/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      mission.completed ? "bg-tm-yellow/20 text-tm-yellow" : "bg-white/5 text-tm-blue-gray"
                    )}>
                      {mission.completed ? <CheckCircle2 size={20} /> : <Zap size={20} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-sm leading-tight text-tm-purple-dark dark:text-white">{mission.title}</h4>
                        <span className="text-[10px] font-black text-tm-blue-gray uppercase">{format(new Date(mission.date), "MMM d, yyyy")}</span>
                      </div>
                      <p className="text-xs text-tm-blue-gray/80 line-clamp-1 mt-0.5 italic">{mission.description}</p>
                    </div>
                    {mission.completed && (
                      <div className="text-[10px] font-black text-tm-yellow bg-tm-yellow/10 px-2 py-1 rounded-lg">
                        +25 XP
                      </div>
                    )}
                  </div>
                </GlassCard>
              ))}
            </div>
            {missionHistory.length > missionsLimit && (
              <div className="flex justify-center pt-4">
                <button 
                  onClick={() => setMissionsLimit(prev => prev + 5)}
                  className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-tm-orange-light/10 hover:text-tm-orange-light transition-all"
                >
                  Load More Quests
                </button>
              </div>
            )}
          </div>
        ) : (
          <GlassCard className="p-12 text-center border-tm-blue-gray/5">
            <History size={48} className="mx-auto text-tm-blue-gray/20 mb-4" />
            <p className="text-tm-blue-gray font-medium">Your quest history is empty. Check your Attention widget on the home page!</p>
          </GlassCard>
        )}
      </div>

      {/* Relief Log Section */}
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Heart className="text-tm-orange-dark" size={32} />
          <h2 className="text-3xl font-black text-tm-purple-dark dark:text-white italic tracking-tighter uppercase">Relief Log</h2>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : reliefHistory.length > 0 ? (
          <div className="space-y-4">
            {reliefHistory.slice(0, 10).map((r, idx) => (
              <GlassCard key={idx} delay={idx * 0.05} className="p-4 border-tm-blue-gray/10 dark:border-white/5 bg-tm-purple-dark/[0.02] dark:bg-white/5 hover:bg-tm-purple-dark/[0.05] dark:hover:bg-white/10 transition-all">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    r.completed || r.alt1Completed || r.alt2Completed ? "bg-tm-yellow/20 text-tm-yellow" : "bg-white/5 text-tm-blue-gray"
                  )}>
                    {r.type === 'movie' && <Film size={20} />}
                    {r.type === 'song' && <Music size={20} />}
                    {r.type === 'food' && <Coffee size={20} />}
                    {r.type === 'activity' && <Dumbbell size={20} />}
                    {!r.type && <Heart size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-sm leading-tight truncate text-tm-purple-dark dark:text-white">{r.title}</h4>
                      <span className="text-[10px] font-black text-tm-blue-gray uppercase shrink-0">{format(new Date(r.date), "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      {[
                        { label: "Main", done: r.completed },
                        { label: "Alt 1", done: r.alt1Completed },
                        { label: "Alt 2", done: r.alt2Completed }
                      ].map((task, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className={cn("w-1.5 h-1.5 rounded-full", task.done ? "bg-tm-yellow" : "bg-white/10")} />
                          <span className={cn("text-[8px] font-black uppercase tracking-widest", task.done ? "text-tm-yellow" : "text-tm-blue-gray/40")}>
                            {task.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] font-black text-tm-blue-gray/60 uppercase tracking-tighter italic">{r.location || "Global"}</span>
                    <div className="text-[10px] font-black text-tm-yellow bg-tm-yellow/10 px-2 py-0.5 rounded-lg border border-tm-yellow/20">
                      +{([r.completed, r.alt1Completed, r.alt2Completed].filter(Boolean).length * 5)} XP
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        ) : (
          <GlassCard className="p-12 text-center border-tm-blue-gray/5">
            <Heart size={48} className="mx-auto text-tm-blue-gray/20 mb-4" />
            <p className="text-tm-blue-gray font-medium">No relief recommendations logged yet. Take a break today!</p>
          </GlassCard>
        )}
      </div>

      {/* Footer / Connect */}
      <div className="pt-12 text-center space-y-8 border-t border-tm-blue-gray/10">
        <h3 className="text-xl font-bold text-tm-purple-dark dark:text-white">Connect with the Creator</h3>
        <div className="flex justify-center gap-6">
          <a href="#" className="p-4 bg-tm-purple-dark/5 dark:bg-white/5 rounded-2xl hover:bg-tm-yellow/10 hover:text-tm-yellow transition-all border border-tm-blue-gray/10 dark:border-white/10">
            <Github size={24} />
          </a>
          <a href="#" className="p-4 bg-tm-purple-dark/5 dark:bg-white/5 rounded-2xl hover:bg-tm-blue-gray/10 hover:text-tm-blue-gray transition-all border border-tm-blue-gray/10 dark:border-white/10">
            <Twitter size={24} />
          </a>
          <a href="#" className="p-4 bg-tm-purple-dark/5 dark:bg-white/5 rounded-2xl hover:bg-tm-orange-light/10 hover:text-tm-orange-light transition-all border border-tm-blue-gray/10 dark:border-white/10">
            <Mail size={24} />
          </a>
        </div>
        <p className="text-xs font-black uppercase text-tm-blue-gray tracking-[0.3em]">
          Version 1.2.0 • © 2026 TaskMaster
        </p>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
