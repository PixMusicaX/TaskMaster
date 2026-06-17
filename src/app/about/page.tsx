"use client";

import GlassCard from "@/components/glass-card";
import { Info, Shield, Zap, Heart, Github, Twitter, Mail, Code2, Palette, Sparkles, Trophy, Star, History, Swords, CheckCircle2, Library, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getSeasonHistory } from "@/app/actions/gamification";
import { getSmartMissionHistory } from "@/app/actions/smart-missions";
import { getReliefHistory } from "@/app/actions/relief";
import { getPreparationTipHistory } from "@/app/actions/preparation";
import { format, subDays } from "date-fns";
import { Music, Film, Coffee, Dumbbell, Database, Download, AlertTriangle, Brain, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { generatePruneArchive, deletePrunedData } from "@/app/actions/prune";
import TabularViewModal from "@/components/TabularViewModal";

export default function AboutPage() {
  const { theme } = useTheme();
  const [seasonHistory, setSeasonHistory] = useState<any[]>([]);
  const [missionHistory, setMissionHistory] = useState<any[]>([]);
  const [reliefHistory, setReliefHistory] = useState<any[]>([]);
  const [preparationHistory, setPreparationHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isSeasonsModalOpen, setIsSeasonsModalOpen] = useState(false);
  const [isMissionsModalOpen, setIsMissionsModalOpen] = useState(false);
  const [isPrepsModalOpen, setIsPrepsModalOpen] = useState(false);
  const [isReliefsModalOpen, setIsReliefsModalOpen] = useState(false);

  const [seasonsLimit, setSeasonsLimit] = useState(6);
  const [pruneLoading, setPruneLoading] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string>("default");
  const [locationPermission, setLocationPermission] = useState<string>("default");

  async function handlePrune() {
    if (!confirm("Are you sure? This will download your data older than 5 years as a CSV and permanently delete it from the cloud database.")) return;

    setPruneLoading(true);
    try {
      const csvData = await generatePruneArchive();
      if (csvData) {
        const blob = new Blob([csvData], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `archive_${format(new Date(), "yyyy-MM-dd")}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

        await deletePrunedData();
        alert("Old data has been archived and successfully pruned from the cloud database.");
      } else {
        alert("No data older than 5 years was found to prune.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to prune database.");
    }
    setPruneLoading(false);
  }

  useEffect(() => {
    async function loadData() {
      const oneYearAgo = format(subDays(new Date(), 365), "yyyy-MM-dd");
      const [seasons, missions, relief, prep] = await Promise.all([
        getSeasonHistory(50),
        getSmartMissionHistory(oneYearAgo),
        getReliefHistory(oneYearAgo),
        getPreparationTipHistory(oneYearAgo)
      ]);
      setSeasonHistory(seasons.filter(s => s.xp > 0));
      setMissionHistory(missions);
      setReliefHistory(relief);
      setPreparationHistory(prep);
      setLoading(false);
    }
    loadData();

    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }

    if ("permissions" in navigator) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        setLocationPermission(result.state);
        result.onchange = () => {
          setLocationPermission(result.state);
        };
      }).catch(() => {
        // Fallback for browsers that don't support geolocation permission querying
      });
    }
  }, []);

  async function handleEnableNotifications() {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === "granted") {
      new Notification("Notifications Enabled!", {
        body: "You'll now receive updates from TaskMaster.",
        icon: "/favicon.ico"
      });
    }
  }

  function handleEnableLocation() {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if ("permissions" in navigator) {
             navigator.permissions.query({ name: 'geolocation' as PermissionName }).then(res => setLocationPermission(res.state)).catch(() => setLocationPermission("granted"));
          } else {
             setLocationPermission("granted");
          }
        },
        (err) => {
          console.error(err);
          if (err.code === err.PERMISSION_DENIED) {
             alert("Location permission is blocked in your browser settings. Please enable it manually by clicking the lock icon next to the URL.");
             setLocationPermission("denied");
          } else {
             alert("Failed to access location. Please check your browser or device settings.");
          }
        },
        { timeout: 5000 }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }

  const stats = [
    { label: "Design", value: "Premium", icon: Palette },
    { label: "Performance", value: "Blazing", icon: Zap },
    { label: "Security", value: "Robust", icon: Shield },
    { label: "Built for", value: "Creatives", icon: Sparkles },
  ];

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-16 pb-24">
      {/* Header section */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 mx-auto rounded-[2rem] flex items-center justify-center shadow-2xl shadow-tm-orange-dark/20 mb-8 overflow-hidden border border-white/5"
        >
          <img src="/logo.png" alt="TaskMaster Logo" className="w-full h-full object-cover dark:invert-0 dark:hue-rotate-0 invert hue-rotate-180 transition-all" />
        </motion.div>
        <h1 className="text-5xl md:text-6xl font-black tracking-tight text-tm-purple-dark dark:text-tm-yellow">
          The Vault
        </h1>
        <p className="text-tm-blue-gray dark:text-tm-blue-gray/80 font-medium max-w-2xl mx-auto uppercase tracking-widest text-[10px] font-black">
          Legacy • History • Achievements
        </p>
      </div>

      {/* Gallery Section */}
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Palette className="text-tm-red" size={32} />
          <h2 style={{ color: theme === 'light' ? '#1a1a1a' : undefined }} className="text-3xl font-black dark:text-tm-red italic tracking-tighter uppercase">Gallery</h2>
        </div>

        <a
          href="https://pinakipsingha.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="block group"
        >
          <GlassCard className="p-6 border-tm-blue-gray/20 dark:border-white/5 bg-tm-purple-dark/[0.03] dark:bg-white/5 hover:border-tm-orange-light/40 transition-all">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 rounded-2xl bg-tm-orange-light/20 text-tm-orange-light flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Library size={24} />
              </div>
              <div className="flex-1">
                <h4 style={{ color: theme === 'light' ? '#1a1a1a' : undefined }} className="text-xl font-black dark:text-white leading-tight">Library</h4>
                <p className="text-sm text-tm-blue-gray font-medium mt-1">Explore the curated collection of assets and resources.</p>
              </div>
              <ExternalLink size={20} className="text-tm-blue-gray group-hover:text-tm-orange-light transition-colors" />
            </div>
          </GlassCard>
        </a>
      </div>

      {/* Hall of Fame Section */}
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Trophy className="text-tm-yellow" size={32} />
          <h2 style={{ color: theme === 'light' ? '#1a1a1a' : undefined }} className="text-3xl font-black dark:text-tm-yellow italic tracking-tighter uppercase">Hall of Fame</h2>
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
              {seasonHistory.slice(0, 3).map((season, idx) => (
                <GlassCard key={idx} delay={idx * 0.1} className="p-6 border-tm-blue-gray/20 dark:border-white/5 bg-tm-purple-dark/[0.04] dark:bg-white/5 hover:bg-tm-purple-dark/[0.06] dark:hover:bg-white/10 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 style={{ color: theme === 'light' ? '#1a1a1a' : undefined }} className="text-xl font-black dark:text-tm-yellow leading-tight">{season.monthName}</h4>
                      <p className="text-xs font-bold text-tm-blue-gray uppercase tracking-widest">{season.year}</p>
                    </div>
                    <div className="bg-tm-yellow/20 p-2 rounded-xl group-hover:scale-110 transition-transform">
                      <Star className="text-tm-yellow" size={20} fill="currentColor" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black uppercase text-tm-blue-gray">Final Score</span>
                      <span style={{ color: theme === 'light' ? '#1a1a1a' : undefined }} className="text-2xl font-black dark:text-white">{season.xp} <span className="text-xs text-tm-blue-gray">XP</span></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-tm-yellow/10 rounded text-[8px] font-black uppercase tracking-widest text-tm-yellow border border-tm-yellow/20">
                        LVL {season.level}
                      </span>
                      <span className="px-2 py-1 bg-tm-blue-gray/10 rounded text-[8px] font-black uppercase tracking-widest text-tm-blue-gray border border-tm-blue-gray/20">
                        {season.title}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setIsSeasonsModalOpen(true)}
                className="px-8 py-4 bg-white/5 border border-tm-blue-gray/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-tm-yellow/10 hover:text-tm-yellow transition-all flex items-center gap-3 group"
              >
                <Search size={16} className="group-hover:scale-110 transition-transform" />
                View Full Hall of Fame
              </button>
            </div>
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
          <h2 className="text-3xl font-black text-foreground dark:text-tm-orange-light italic tracking-tighter uppercase">Smart Quest Log</h2>
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
              {missionHistory.slice(0, 5).map((mission, idx) => (
                <GlassCard key={idx} delay={idx * 0.05} className="p-4 border-tm-blue-gray/20 dark:border-white/5 bg-tm-purple-dark/[0.03] dark:bg-white/5 hover:border-tm-orange-light/40 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      mission.completed ? "bg-tm-yellow/20 text-tm-yellow" : "bg-tm-blue-gray/10 text-tm-blue-gray"
                    )}>
                      {mission.completed ? <CheckCircle2 size={20} /> : <Zap size={20} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 style={{ color: theme === 'light' ? '#1a1a1a' : undefined }} className="font-bold text-sm leading-tight dark:text-white">{mission.title}</h4>
                        <span className="text-[10px] font-black text-tm-blue-gray uppercase">{format(new Date(mission.date), "MMM d, yyyy")}</span>
                      </div>
                      <p className="text-xs text-tm-blue-gray/90 line-clamp-1 mt-0.5 italic">{mission.description}</p>
                    </div>
                    {mission.completed && (
                      <div className="text-[10px] font-black text-tm-yellow bg-tm-yellow/10 px-2 py-1 rounded-lg border border-tm-yellow/20">
                        +50 XP
                      </div>
                    )}
                  </div>
                </GlassCard>
              ))}
            </div>
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setIsMissionsModalOpen(true)}
                className="px-8 py-4 bg-white/5 border border-tm-blue-gray/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-tm-orange-light/10 hover:text-tm-orange-light transition-all flex items-center gap-3 group"
              >
                <Search size={16} className="group-hover:scale-110 transition-transform" />
                View All Quests
              </button>
            </div>
          </div>
        ) : (
          <GlassCard className="p-12 text-center border-tm-blue-gray/5">
            <History size={48} className="mx-auto text-tm-blue-gray/20 mb-4" />
            <p className="text-tm-blue-gray font-medium">Your quest history is empty. Check your Attention widget on the home page!</p>
          </GlassCard>
        )}
      </div>

      {/* Preparation History Section */}
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Brain className="text-tm-purple-dark dark:text-tm-yellow" size={32} />
          <h2 style={{ color: theme === 'light' ? '#1a1a1a' : undefined }} className="text-3xl font-black dark:text-tm-yellow italic tracking-tighter uppercase">Strategic Prep Log</h2>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : preparationHistory.length > 0 ? (
          <div className="space-y-6">
            <div className="space-y-4">
              {preparationHistory.slice(0, 5).map((p, idx) => (
                <GlassCard key={idx} delay={idx * 0.05} className="p-4 border-tm-blue-gray/20 dark:border-white/5 bg-tm-purple-dark/[0.03] dark:bg-white/5 hover:border-tm-yellow/40 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      p.completed ? "bg-tm-yellow/20 text-tm-yellow" : "bg-tm-blue-gray/10 text-tm-blue-gray"
                    )}>
                      <Brain size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start gap-2">
                        <h4 style={{ color: theme === 'light' ? '#1a1a1a' : undefined }} className="font-bold text-sm leading-tight dark:text-white">{p.title}</h4>
                        <span className="text-[10px] font-black text-tm-blue-gray uppercase shrink-0">{format(new Date(p.date), "MMM d, yyyy")}</span>
                      </div>
                      <p className="text-xs text-tm-blue-gray/90 line-clamp-1 mt-0.5 italic">{p.description}</p>
                    </div>
                    {p.completed && (
                      <div className="text-[10px] font-black text-tm-yellow bg-tm-yellow/10 px-2 py-1 rounded-lg border border-tm-yellow/20 shrink-0">
                        +25 XP
                      </div>
                    )}
                  </div>
                </GlassCard>
              ))}
            </div>
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setIsPrepsModalOpen(true)}
                className="px-8 py-4 bg-white/5 border border-tm-blue-gray/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-tm-yellow/10 hover:text-tm-yellow transition-all flex items-center gap-3 group"
              >
                <Search size={16} className="group-hover:scale-110 transition-transform" />
                View All Strategies
              </button>
            </div>
          </div>
        ) : (
          <GlassCard className="p-12 text-center border-tm-blue-gray/5">
            <Brain size={48} className="mx-auto text-tm-blue-gray/20 mb-4" />
            <p className="text-tm-blue-gray font-medium">No strategic preparations logged yet. Check your Attention widget!</p>
          </GlassCard>
        )}
      </div>

      {/* Relief Log Section */}
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Heart className="text-tm-orange-dark" size={32} />
          <h2 className="text-3xl font-black text-foreground dark:text-tm-orange-dark italic tracking-tighter uppercase">Relief Log</h2>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : reliefHistory.length > 0 ? (
          <div className="space-y-6">
            <div className="space-y-4">
              {reliefHistory.slice(0, 5).map((r, idx) => (
                <GlassCard key={idx} delay={idx * 0.05} className="p-4 border-tm-blue-gray/20 dark:border-white/5 bg-tm-purple-dark/[0.03] dark:bg-white/5 hover:bg-tm-purple-dark/[0.06] dark:hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      r.completed || r.alt1Completed || r.alt2Completed ? "bg-tm-yellow/20 text-tm-yellow" : "bg-tm-blue-gray/10 text-tm-blue-gray"
                    )}>
                      {r.type === 'movie' && <Film size={20} />}
                      {r.type === 'song' && <Music size={20} />}
                      {r.type === 'food' && <Coffee size={20} />}
                      {r.type === 'activity' && <Dumbbell size={20} />}
                      {!r.type && <Heart size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h4 style={{ color: theme === 'light' ? '#1a1a1a' : undefined }} className="font-bold text-sm leading-tight truncate dark:text-white">{r.title}</h4>
                        <span className="text-[10px] font-black text-tm-blue-gray uppercase shrink-0">{format(new Date(r.date), "MMM d, yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        {[
                          { label: "Main", done: r.completed },
                          { label: "Alt 1", done: r.alt1Completed },
                          { label: "Alt 2", done: r.alt2Completed }
                        ].map((task, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <div className={cn("w-1.5 h-1.5 rounded-full", task.done ? "bg-tm-yellow" : "bg-tm-blue-gray/20")} />
                            <span className={cn("text-[8px] font-black uppercase tracking-widest", task.done ? "text-tm-yellow" : "text-tm-blue-gray/50")}>
                              {task.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] font-black text-tm-blue-gray/70 uppercase tracking-tighter italic">{r.location || "Global"}</span>
                      <div className="text-[10px] font-black text-tm-yellow bg-tm-yellow/10 px-2 py-0.5 rounded-lg border border-tm-yellow/20">
                        +{([r.completed, r.alt1Completed, r.alt2Completed].filter(Boolean).length * 10)} XP
                      </div>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setIsReliefsModalOpen(true)}
                className="px-8 py-4 bg-white/5 border border-tm-blue-gray/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-tm-orange-dark/10 hover:text-tm-orange-dark transition-all flex items-center gap-3 group"
              >
                <Search size={16} className="group-hover:scale-110 transition-transform" />
                View Full Relief Log
              </button>
            </div>
          </div>
        ) : (
          <GlassCard className="p-12 text-center border-tm-blue-gray/5">
            <Heart size={48} className="mx-auto text-tm-blue-gray/20 mb-4" />
            <p className="text-tm-blue-gray font-medium">No relief recommendations logged yet. Take a break today!</p>
          </GlassCard>
        )}
      </div>

      {/* Storage Management Section */}
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Database className="text-tm-blue-gray" size={32} />
          <h2 style={{ color: theme === 'light' ? '#1a1a1a' : undefined }} className="text-3xl font-black dark:text-tm-blue-gray italic tracking-tighter uppercase">Cloud Storage</h2>
        </div>

        <GlassCard className="p-6 md:p-8 border-tm-blue-gray/20 dark:border-white/5 bg-tm-purple-dark/[0.03] dark:bg-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <Database size={120} />
          </div>
          <div className="relative z-10 space-y-6">
            <div>
              <h3 style={{ color: theme === 'light' ? '#1a1a1a' : undefined }} className="text-2xl font-black dark:text-white leading-tight">Database Archiving</h3>
              <p className="text-sm text-tm-blue-gray mt-2 max-w-2xl font-medium">
                Keep your cloud database fast and storage-efficient. This tool will automatically bundle all your records (Habits, Notes, Quests) older than 5 years into a CSV file, download it to your local device, and safely delete the old rows from the cloud.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
              <button
                onClick={handlePrune}
                disabled={pruneLoading}
                className={cn(
                  "flex items-center gap-3 px-6 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all",
                  pruneLoading
                    ? "bg-tm-blue-gray/20 text-tm-blue-gray cursor-not-allowed"
                    : "bg-tm-yellow/10 hover:bg-tm-yellow/20 text-tm-yellow border border-tm-yellow/20 hover:border-tm-yellow/40"
                )}
              >
                {pruneLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-tm-blue-gray border-t-transparent rounded-full animate-spin" />
                    Processing Archive...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Download Archive & Prune DB
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-tm-blue-gray tracking-widest px-4 py-2 bg-tm-blue-gray/10 rounded-lg">
                <AlertTriangle size={12} className="text-tm-orange-light" />
                <span>Cannot be undone</span>
                <span>Do not prune unless necessary!</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* App Settings Section */}
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Zap className="text-tm-yellow" size={32} />
          <h2 style={{ color: theme === 'light' ? '#1a1a1a' : undefined }} className="text-3xl font-black dark:text-tm-yellow italic tracking-tighter uppercase">App Settings</h2>
        </div>

        <GlassCard className="p-6 md:p-8 border-tm-blue-gray/20 dark:border-white/5 bg-tm-purple-dark/[0.03] dark:bg-white/5 relative overflow-hidden flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 style={{ color: theme === 'light' ? '#1a1a1a' : undefined }} className="text-xl font-black dark:text-white leading-tight">Browser Notifications</h3>
              <p className="text-sm text-tm-blue-gray mt-1 max-w-2xl font-medium">Enable browser notifications to receive alerts for your smart missions and habit reminders.</p>
            </div>
            <button
              onClick={handleEnableNotifications}
              disabled={notificationPermission === "granted"}
              className={cn(
                "px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all whitespace-nowrap",
                notificationPermission === "granted"
                  ? "bg-tm-yellow/5 text-tm-yellow/50 border border-tm-yellow/10 cursor-default"
                  : "bg-tm-yellow/10 hover:bg-tm-yellow/20 text-tm-yellow border border-tm-yellow/20 hover:scale-105"
              )}
            >
              {notificationPermission === "granted" ? "Notifications Enabled" : "Enable Notifications"}
            </button>
          </div>

          <div className="w-full h-[1px] bg-tm-blue-gray/10" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 style={{ color: theme === 'light' ? '#1a1a1a' : undefined }} className="text-xl font-black dark:text-white leading-tight">Location Services</h3>
              <p className="text-sm text-tm-blue-gray mt-1 max-w-2xl font-medium">Allow access to your location to enable weather-based relief recommendations in the Tavern widget.</p>
            </div>
            <button
              onClick={handleEnableLocation}
              disabled={locationPermission === "granted"}
              className={cn(
                "px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all whitespace-nowrap",
                locationPermission === "granted"
                  ? "bg-tm-yellow/5 text-tm-yellow/50 border border-tm-yellow/10 cursor-default"
                  : locationPermission === "denied"
                  ? "bg-tm-red/10 text-tm-red border border-tm-red/20 cursor-not-allowed"
                  : "bg-tm-yellow/10 hover:bg-tm-yellow/20 text-tm-yellow border border-tm-yellow/20 hover:scale-105"
              )}
            >
              {locationPermission === "granted" ? "Location Enabled" : locationPermission === "denied" ? "Location Blocked" : "Enable Location"}
            </button>
          </div>
        </GlassCard>
      </div>

      {/* Footer */}
      <div className="pt-12 text-center space-y-4 border-t border-tm-blue-gray/10">
        <p className="text-xs font-black uppercase text-tm-blue-gray tracking-[0.3em]">
          Version 4.1.2 • TaskMaster • By Pinaki AKA PiX
        </p>
      </div>

      {/* Tabular Modals */}
      <TabularViewModal
        title="Hall of Fame"
        isOpen={isSeasonsModalOpen}
        onClose={() => setIsSeasonsModalOpen(false)}
        data={seasonHistory}
        columns={[
          { header: "Year", key: "year" },
          { header: "Month", key: "monthName" },
          { header: "XP", key: "xp" },
          { header: "Level", key: "level" },
          { header: "Title", key: "title" }
        ]}
      />

      <TabularViewModal
        title="Smart Quest Log"
        isOpen={isMissionsModalOpen}
        onClose={() => setIsMissionsModalOpen(false)}
        data={missionHistory}
        columns={[
          {
            header: "Date", key: "date", render: (val) => {
              const d = new Date(val);
              return (
                <span className="font-mono text-tm-blue-gray whitespace-nowrap">
                  <span className="sm:hidden flex flex-col leading-tight">
                    <span className="text-[10px] opacity-50">{d.getFullYear()}</span>
                    <span>{format(d, "MMM d")}</span>
                  </span>
                  <span className="hidden sm:inline">{format(d, "yyyy-MM-dd")}</span>
                </span>
              );
            }
          },
          { header: "Title", key: "title", wrap: true, className: "w-[25%]" },
          { header: "Description", key: "description", wrap: true, className: "w-[50%]" },
          {
            header: "Status", key: "completed", render: (val) => (
              <span className="flex items-center gap-2">
                <span>{val ? "✅" : "❌"}</span>
                <span className="hidden sm:inline">{val ? "Completed" : "Incomplete"}</span>
              </span>
            )
          }
        ]}
      />

      <TabularViewModal
        title="Strategic Prep Log"
        isOpen={isPrepsModalOpen}
        onClose={() => setIsPrepsModalOpen(false)}
        data={preparationHistory}
        columns={[
          {
            header: "Date", key: "date", render: (val) => {
              const d = new Date(val);
              return (
                <span className="font-mono text-tm-blue-gray whitespace-nowrap">
                  <span className="sm:hidden flex flex-col leading-tight">
                    <span className="text-[10px] opacity-50">{d.getFullYear()}</span>
                    <span>{format(d, "MMM d")}</span>
                  </span>
                  <span className="hidden sm:inline">{format(d, "yyyy-MM-dd")}</span>
                </span>
              );
            }
          },
          { header: "Strategy", key: "title", wrap: true, className: "w-[25%]" },
          { header: "Directive", key: "description", wrap: true, className: "w-[50%]" },
          {
            header: "Status", key: "completed", render: (val) => (
              <span className="flex items-center gap-2">
                <span>{val ? "⚔️" : "🛡️"}</span>
                <span className="hidden sm:inline">{val ? "Victorious" : "Planned"}</span>
              </span>
            )
          }
        ]}
      />

      <TabularViewModal
        title="Relief Log"
        isOpen={isReliefsModalOpen}
        onClose={() => setIsReliefsModalOpen(false)}
        data={reliefHistory}
        columns={[
          {
            header: "Date", key: "date", render: (val) => {
              const d = new Date(val);
              return (
                <span className="font-mono text-tm-blue-gray whitespace-nowrap">
                  <span className="sm:hidden flex flex-col leading-tight">
                    <span className="text-[10px] opacity-50">{d.getFullYear()}</span>
                    <span>{format(d, "MMM d")}</span>
                  </span>
                  <span className="hidden sm:inline">{format(d, "yyyy-MM-dd")}</span>
                </span>
              );
            }
          },
          { header: "Title", key: "title", wrap: true, className: "w-[30%]" },
          { header: "Type", key: "type", render: (val) => val?.toUpperCase() },
          { header: "Location", key: "location" },
          {
            header: "Status",
            key: "completed",
            render: (_, r) => {
              const done = [r.completed, r.alt1Completed, r.alt2Completed].filter(Boolean).length;
              return (
                <span className="flex items-center gap-2">
                  <span>{done === 3 ? "🏆" : done > 0 ? "🏃" : "🛌"}</span>
                  <span className="hidden sm:inline">{done}/3 Done</span>
                </span>
              );
            }
          }
        ]}
      />
    </div>
  );
}
