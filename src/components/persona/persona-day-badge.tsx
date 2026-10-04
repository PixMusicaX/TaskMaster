import { Moon, Tv, VenetianMask } from "lucide-react";
import { PERSONA_NAMES, type PersonaStyle } from "@/lib/persona";
import { cn } from "@/lib/utils";

const BADGES: Record<PersonaStyle, { icon: typeof Moon; className: string }> = {
  p3: { icon: Moon, className: "bg-[#1463d6] text-white" },
  p4: { icon: Tv, className: "bg-[#ffe100] text-[#181512] ring-1 ring-[#181512]/40" },
  p5: { icon: VenetianMask, className: "bg-[#e5001b] text-white" },
};

// Marks a Persona day on the calendar, in that game's colours
export function PersonaDayBadge({ style, size = 14, className }: { style: PersonaStyle; size?: number; className?: string }) {
  const { icon: Icon, className: tone } = BADGES[style];
  return (
    <span
      className={cn("inline-flex items-center justify-center shrink-0", style === "p5" ? "-rotate-6" : style === "p3" ? "-skew-x-6" : "rounded", tone, className)}
      style={{ width: size + 6, height: size + 6, borderRadius: style === "p4" ? 4 : 0 }}
      title={`${PERSONA_NAMES[style]} day`}
      aria-label={`${PERSONA_NAMES[style]} day`}
    >
      <Icon size={size - 2} strokeWidth={2.4} />
    </span>
  );
}
