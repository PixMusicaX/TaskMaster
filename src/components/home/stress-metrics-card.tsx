import { Zap } from "lucide-react";
import MoodRadar from "@/components/mood-radar";
import { cn } from "@/lib/utils";
import type { NoteRow } from "@/lib/types";
import InsightCard, { Pill } from "./insight-card";

export default function StressMetricsCard({ moodData }: { moodData: Pick<NoteRow, "mood">[] }) {
  const joy = moodData.filter(m => m.mood === "good").length;
  const steady = moodData.filter(m => m.mood === "neutral").length;
  const stress = moodData.filter(m => m.mood === "bad").length;

  const tiles = [
    { label: 'Joy', value: joy, dot: 'bg-tm-yellow', bg: 'bg-tm-yellow/10 dark:bg-tm-yellow/5' },
    { label: 'Steady', value: steady, dot: 'bg-tm-blue-gray', bg: 'bg-tm-blue-gray/10 dark:bg-tm-blue-gray/5' },
    { label: 'Stress', value: stress, dot: 'bg-tm-orange-dark', bg: 'bg-tm-orange-dark/10 dark:bg-tm-orange-dark/5' },
  ];

  return (
    <InsightCard
      icon={Zap}
      iconClassName="text-tm-orange-light"
      title="Stress Metrics"
      subtitle="30-Day Emotional Signature"
      aside={<Pill className="hidden sm:block">Live Data</Pill>}
      delay={0.6}
      className="border-tm-blue-gray/10 bg-white/5"
    >
      <div className="flex-1 flex items-center justify-center relative z-10 min-h-[220px]">
        {moodData.length > 0 ? (
          <MoodRadar size={240} data={{ joy, steady, stress }} />
        ) : (
          <div className="text-center opacity-40">
            <div className="w-16 h-16 border-2 border-dashed border-tm-blue-gray rounded-full mx-auto mb-4 animate-spin-slow" />
            <p className="text-caption font-mono font-semibold uppercase tracking-[0.12em]">Awaiting Pulse...</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 relative z-10">
        {tiles.map(tile => (
          <div key={tile.label} className={cn("p-4 rounded-3xl border border-tm-blue-gray/5 dark:border-white/5 flex flex-col items-center gap-1", tile.bg)}>
            <div className={cn("w-2 h-2 rounded-full", tile.dot)} />
            <span className="text-caption font-mono font-semibold uppercase text-tm-blue-gray/60 dark:text-tm-blue-gray/70 tracking-[0.12em]">{tile.label}</span>
            <span className="text-2xl font-display font-bold text-foreground">{tile.value}</span>
          </div>
        ))}
      </div>
    </InsightCard>
  );
}
