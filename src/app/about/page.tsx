"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { format, subDays } from "date-fns";
import { Database, Download, AlertTriangle, ExternalLink, Library, Palette } from "lucide-react";
import GlassCard from "@/components/glass-card";
import TabularViewModal from "@/components/TabularViewModal";
import VaultHero from "@/components/vault/vault-hero";
import HallOfFame from "@/components/vault/hall-of-fame";
import Chronicle, { type ChronicleKind } from "@/components/vault/chronicle";
import SettingsPanel from "@/components/vault/settings-panel";
import VaultSection from "@/components/vault/vault-section";
import { getSeasonTimeline } from "@/app/actions/gamification";
import { eraAt } from "@/lib/eras";
import { getSmartMissionHistory, toggleSmartMission } from "@/app/actions/smart-missions";
import { getReliefHistory, toggleReliefRecommendation } from "@/app/actions/relief";
import { getPreparationTipHistory, togglePreparationTip } from "@/app/actions/preparation";
import { generatePruneArchive, deletePrunedData } from "@/app/actions/prune";
import { cn } from "@/lib/utils";
import type { PrepTipRow, ReliefRow, SmartMissionRow, TimelineSeason } from "@/lib/types";

const flip = <T extends { id: string; completed: boolean }>(list: T[], id: string) =>
  list.map(item => item.id === id ? { ...item, completed: !item.completed } : item);

const noopSubscribe = () => () => {};
const readNotificationPermission = () => ("Notification" in window ? Notification.permission : "default");

function renderDate(val: string) {
  const d = new Date(val);
  return (
    <span className="font-mono text-tm-blue-gray whitespace-nowrap">
      <span className="sm:hidden flex flex-col leading-tight">
        <span className="text-caption opacity-50">{d.getFullYear()}</span>
        <span>{format(d, "MMM d")}</span>
      </span>
      <span className="hidden sm:inline">{format(d, "yyyy-MM-dd")}</span>
    </span>
  );
}

export default function AboutPage() {
  const [seasonHistory, setSeasonHistory] = useState<TimelineSeason[]>([]);
  const [missionHistory, setMissionHistory] = useState<SmartMissionRow[]>([]);
  const [reliefHistory, setReliefHistory] = useState<ReliefRow[]>([]);
  const [preparationHistory, setPreparationHistory] = useState<PrepTipRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [openTable, setOpenTable] = useState<"seasons" | ChronicleKind | null>(null);
  const [pruneLoading, setPruneLoading] = useState(false);
  // The browser's current permission, overridden by the answer to our own request
  const browserNotificationPermission = useSyncExternalStore(noopSubscribe, readNotificationPermission, () => "default");
  const [requestedPermission, setRequestedPermission] = useState<string | null>(null);
  const notificationPermission = requestedPermission ?? browserNotificationPermission;
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

  async function handleToggle(kind: ChronicleKind, id: string) {
    if (kind === "quests") {
      const item = missionHistory.find(m => m.id === id);
      if (!item) return;
      setMissionHistory(prev => flip(prev, id));
      await toggleSmartMission(id, !item.completed);
    } else if (kind === "prep") {
      const item = preparationHistory.find(p => p.id === id);
      if (!item) return;
      setPreparationHistory(prev => flip(prev, id));
      await togglePreparationTip(id, !item.completed);
    } else {
      // Relief rows toggle their main suggestion
      const item = reliefHistory.find(r => r.id === id);
      if (!item) return;
      setReliefHistory(prev => flip(prev, id));
      await toggleReliefRecommendation(id, !item.completed, 0);
    }
    window.dispatchEvent(new Event("profile-updated"));
  }

  useEffect(() => {
    async function loadData() {
      const oneYearAgo = format(subDays(new Date(), 365), "yyyy-MM-dd");
      const [timeline, missions, relief, prep] = await Promise.all([
        getSeasonTimeline(format(new Date(), "yyyy-MM-dd")),
        getSmartMissionHistory(oneYearAgo),
        getReliefHistory(oneYearAgo),
        getPreparationTipHistory(oneYearAgo)
      ]);
      setSeasonHistory(timeline.seasons.filter(s => s.xp > 0));
      setMissionHistory(missions);
      setReliefHistory(relief);
      setPreparationHistory(prep);
      setLoading(false);
    }
    loadData();

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
    setRequestedPermission(permission);
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
        () => {
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

  const closeTable = () => setOpenTable(null);

  return (
    <div className="p-4 pt-12 md:p-12 md:pt-16 max-w-5xl mx-auto space-y-16 pb-24">
      <VaultHero />

      <HallOfFame seasons={seasonHistory} loading={loading} onViewAll={() => setOpenTable("seasons")} />

      <Chronicle
        missions={missionHistory}
        preps={preparationHistory}
        reliefs={reliefHistory}
        loading={loading}
        onToggle={handleToggle}
        onViewAll={setOpenTable}
      />

      <SettingsPanel
        notificationPermission={notificationPermission}
        locationPermission={locationPermission}
        onEnableNotifications={handleEnableNotifications}
        onEnableLocation={handleEnableLocation}
      />

      <VaultSection icon={Database} iconClassName="text-tm-blue-gray" title="Cloud Storage">
        <GlassCard className="p-5 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <Database size={120} />
          </div>
          <div className="relative z-10 space-y-5">
            <div>
              <h3 className="text-xl font-bold text-foreground leading-tight">Database Archiving</h3>
              <p className="text-sm text-tm-blue-gray mt-2 max-w-2xl font-medium">
                Keep your cloud database fast and storage-efficient. This tool will automatically bundle all your records (Habits, Notes, Quests) older than 5 years into a CSV file, download it to your local device, and safely delete the old rows from the cloud.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <button
                onClick={handlePrune}
                disabled={pruneLoading}
                className={cn(
                  "flex items-center gap-3 px-6 py-4 rounded-xl font-mono font-semibold uppercase tracking-[0.12em] text-caption transition-all active:scale-95",
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

              <div className="flex items-center gap-2 text-caption font-mono font-semibold uppercase text-tm-blue-gray tracking-[0.12em] px-4 py-2 bg-tm-blue-gray/10 rounded-lg">
                <AlertTriangle size={12} className="text-tm-orange-light" />
                <span>Cannot be undone. Do not prune unless necessary!</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </VaultSection>

      <VaultSection icon={Palette} iconClassName="text-tm-red" title="Gallery">
        <a href="https://pinakipsingha.vercel.app" target="_blank" rel="noopener noreferrer" className="block group">
          <GlassCard className="p-5 md:p-6 hover:border-tm-orange-light/40 transition-colors">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-tm-orange-light/20 text-tm-orange-light flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Library size={24} />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-foreground leading-tight">Library</h4>
                <p className="text-sm text-tm-blue-gray font-medium mt-1">Explore the curated collection of assets and resources.</p>
              </div>
              <ExternalLink size={20} className="text-tm-blue-gray group-hover:text-tm-orange-light group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
          </GlassCard>
        </a>
      </VaultSection>

      {/* Footer */}
      <div className="pt-12 text-center border-t border-tm-blue-gray/10">
        <p className="text-xs font-mono font-semibold uppercase text-tm-blue-gray tracking-[0.12em]">
          Version 6.1.0 • TaskMaster • By Pinaki AKA PiX
        </p>
      </div>

      {/* Tabular Modals */}
      <TabularViewModal
        title="Hall of Fame"
        isOpen={openTable === "seasons"}
        onClose={closeTable}
        data={seasonHistory.map(s => ({ ...s, era: eraAt(s.eraEnd ?? s.eraStart).numeral }))}
        columns={[
          { header: "Year", key: "year" },
          { header: "Month", key: "monthName" },
          { header: "XP", key: "xp" },
          { header: "Level", key: "level" },
          { header: "Title", key: "title" },
          { header: "Era", key: "era" }
        ]}
      />

      <TabularViewModal
        title="Smart Quest Log"
        isOpen={openTable === "quests"}
        onClose={closeTable}
        data={missionHistory}
        columns={[
          { header: "Date", key: "date", render: renderDate },
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
        isOpen={openTable === "prep"}
        onClose={closeTable}
        data={preparationHistory}
        columns={[
          { header: "Date", key: "date", render: renderDate },
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
        isOpen={openTable === "relief"}
        onClose={closeTable}
        data={reliefHistory}
        columns={[
          { header: "Date", key: "date", render: renderDate },
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
