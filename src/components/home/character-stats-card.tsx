import { Crown } from "lucide-react";
import CharacterStatsRadar from "@/components/character-stats-radar";
import type { Profile } from "@/lib/types";
import InsightCard, { Pill } from "./insight-card";

export default function CharacterStatsCard({ profile }: { profile: Profile | null }) {
  const stats = {
    strength: profile?.strength || 0,
    intelligence: profile?.intelligence || 0,
    wealth: profile?.wealth || 0,
    vitality: profile?.vitality || 0,
    charisma: profile?.charisma || 0,
  };

  return (
    <InsightCard
      icon={Crown}
      iconClassName="text-tm-yellow"
      title="Character Stats"
      subtitle="Current Attribute Progression"
      aside={<Pill className="hidden sm:block">Live Data</Pill>}
      delay={0.2}
      className="border-tm-purple-dark/20"
    >
      <div className="flex-1 flex items-center justify-center">
        {profile && (
          <CharacterStatsRadar
            size={240}
            data={stats}
            totalXP={Object.values(stats).reduce((a, b) => a + b, 0)}
          />
        )}
      </div>
    </InsightCard>
  );
}
