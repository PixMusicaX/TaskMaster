import { SPECIAL_DAYS, type SpecialId } from "@/lib/special-days";
import { cn } from "@/lib/utils";
import { SPECIAL_LOOKS } from "./special-themes";

// Each theme's own colours, fixed, so a sticker looks the same whatever palette the app is in
const STICKERS: Record<SpecialId, string> = {
  snow: "bg-[#dff0ff] text-[#1b5e9a] ring-[#1b5e9a]/40",
  cafe: "bg-[#f6d9cf] text-[#9c2f3f] ring-[#9c2f3f]/40",
  garden: "bg-[#dcf2cf] text-[#2f7d32] ring-[#2f7d32]/40",
  glitch: "bg-[#0b0b12] text-[#00f0ff] ring-[#ff2bd6]/70",
  sakura: "bg-[#ffd9e6] text-[#b03a6e] ring-[#b03a6e]/40",
  beach: "bg-[#cdf1f3] text-[#0e7f8a] ring-[#e0623a]/50",
  space: "bg-[#131540] text-[#9d8cff] ring-[#5cc8ff]/60",
  maps: "bg-[#efdcb0] text-[#7a4f12] ring-[#a23b22]/50",
  library: "bg-[#dcebe2] text-[#2f6b4f] ring-[#8c2f2f]/40",
  halloween: "bg-[#241333] text-[#ff8a1f] ring-[#b46bff]/60",
  leaves: "bg-[#fbdcb6] text-[#a63a1e] ring-[#a63a1e]/40",
  cabin: "bg-[#f3d6d2] text-[#8e2a26] ring-[#2f6b4a]/50",
};

// Marks the month's special day on the calendar: the theme's icon on a slightly turned sticker
export function SpecialDayBadge({ id, size = 14, className }: { id: SpecialId; size?: number; className?: string }) {
  const Icon = SPECIAL_LOOKS[id].icon;
  const label = `${SPECIAL_DAYS[id].name} day`;
  return (
    <span
      className={cn("inline-flex items-center justify-center shrink-0 rounded-full ring-1 rotate-6 shadow-sm", STICKERS[id], className)}
      style={{ width: size + 6, height: size + 6 }}
      title={label}
      aria-label={label}
    >
      <Icon size={size - 2} strokeWidth={2.4} />
    </span>
  );
}
