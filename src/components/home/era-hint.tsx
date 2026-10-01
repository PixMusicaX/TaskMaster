import { eraAt, MAX_ERA } from "@/lib/eras";
import type { EraStanding } from "@/components/progress/era-standing";

// How to move in the era system from here (eras follow pace against last month; see lib/eras.ts)
export default function EraHint({ standing, xp }: { standing: EraStanding; xp: number }) {
  const ahead = standing.index > standing.startIndex;
  const text = ahead
    ? `Ahead of ${standing.lastMonthName}'s pace`
    : standing.startIndex >= MAX_ERA
      ? "Final era"
      : `Pass ${standing.lastMonthName}'s pace for Era ${eraAt(standing.startIndex + 1).numeral} (${Math.max(0, standing.lastMonthPaceXP - xp + 1).toLocaleString()} XP)`;
  return <p className="text-caption font-bold text-tm-blue-gray">{text}</p>;
}
