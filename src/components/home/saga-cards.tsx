"use client";

import type { HistoryDay } from "@/app/actions/history";
import type { EventRow, NoteRow, Profile, SeasonPace } from "@/lib/types";
import CharacterStatsCard from "./character-stats-card";
import SeasonPaceCard from "./season-pace-card";
import ChronicleCard from "./chronicle-card";
import FutureSightCard from "./future-sight-card";
import StressMetricsCard from "./stress-metrics-card";
import TavernCard from "./tavern-card";
import MapCard from "./map-card";
import type { TavernProps } from "./saga-tavern-scene";

// The growth analytics as plain cards, shown instead of the orbit when motion is reduced. Its own
// module, so everyone else never downloads it (the home page imports it with next/dynamic).
export default function SagaCards({ profile, pace, onThisDay, todayStr, futureEvents, moodData, tavern, completionScore }: {
  profile: Profile | null;
  pace: SeasonPace | null;
  onThisDay: HistoryDay[];
  todayStr: string;
  futureEvents: EventRow[];
  moodData: NoteRow[];
  tavern: TavernProps;
  completionScore: number;
}) {
  return (
    <>
      <CharacterStatsCard profile={profile} />
      <SeasonPaceCard profile={profile} pace={pace} />
      {/* Chronicle only appears when past years have something on today's date */}
      {onThisDay.length > 0 && <ChronicleCard days={onThisDay} todayStr={todayStr} />}
      <FutureSightCard events={futureEvents} />
      <StressMetricsCard moodData={moodData} />
      <TavernCard {...tavern} />
      <MapCard profile={profile} moodData={moodData} completionScore={completionScore} />
    </>
  );
}
