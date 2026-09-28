import { createElement } from "react";
import { User, Swords, ShieldAlert, Crosshair, Sword, Castle, SunMedium, Crown, Trophy, Gem, type LucideIcon } from "lucide-react";

// Crest shown for each rank (watermark, rank-up ceremony)
export const RANK_ICONS: Record<string, LucideIcon> = {
  Novice: User,
  Squire: Swords,
  Vanguard: ShieldAlert,
  Veteran: Crosshair,
  Knight: Sword,
  Champion: Trophy,
  Sentinel: Castle,
  Paladin: SunMedium,
  Grandmaster: Crown,
  Hero: Gem,
};

export function RankCrest({ rank, ...props }: { rank: string; size?: number | string; strokeWidth?: number; className?: string }) {
  return createElement(RANK_ICONS[rank] ?? User, props);
}
