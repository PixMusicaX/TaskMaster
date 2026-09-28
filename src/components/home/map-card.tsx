"use client";

import { useState } from "react";
import { Map as MapIcon, RotateCw } from "lucide-react";
import { WorldMapWidget } from "@/components/map-generator";
import InsightCard, { Pill } from "./insight-card";

export default function MapCard({ profile, moodData, completionScore }: { profile: any, moodData: any[], completionScore: number }) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <InsightCard
      icon={MapIcon}
      iconClassName="text-tm-blue-gray"
      title="THE MAP"
      subtitle="Feel The Journey"
      aside={
        <div className="hidden sm:flex items-center gap-2">
          {process.env.NODE_ENV === 'development' && (
            <button onClick={() => setRefreshKey(k => k + 1)} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-tm-blue-gray hover:text-tm-yellow transition-all" title="Reload Map">
              <RotateCw size={12} />
            </button>
          )}
          <Pill className="bg-tm-yellow/10 border-tm-yellow/20 text-tm-yellow">En Route</Pill>
        </div>
      }
      delay={1.0}
      className="border-tm-blue-gray/10 bg-white/5 h-full"
    >
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] pointer-events-none" />
      <div className="flex-1 flex flex-col relative z-10 min-h-[300px]">
        <WorldMapWidget key={refreshKey} profile={profile} moodData={moodData} completionScore={completionScore} />
      </div>
    </InsightCard>
  );
}
