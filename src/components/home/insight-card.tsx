import type { LucideIcon } from "lucide-react";
import GlassCard from "@/components/glass-card";
import { cn } from "@/lib/utils";

export function Pill({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("px-3 py-1 bg-white/5 rounded-full border border-white/10 text-tiny font-black uppercase tracking-widest text-tm-blue-gray whitespace-nowrap", className)}>
      {children}
    </div>
  );
}

interface InsightCardProps {
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  subtitle: React.ReactNode;
  aside?: React.ReactNode;
  delay: number;
  className?: string;
  children: React.ReactNode;
}

// Analytics-section card: faded watermark icon, title row and an optional right-side badge
export default function InsightCard({ icon: Icon, iconClassName, title, subtitle, aside, delay, className, children }: InsightCardProps) {
  return (
    <GlassCard delay={delay} className={cn("p-6 md:p-8 flex flex-col gap-8 group relative overflow-hidden", className)}>
      <div className="absolute top-0 right-0 p-6 md:p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
        <Icon size={120} />
      </div>

      <div className="flex items-center justify-between relative z-10">
        <div className="flex flex-col gap-1">
          <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
            <Icon className={iconClassName} size={24} /> {title}
          </h3>
          {typeof subtitle === "string" ? (
            <p className="text-caption font-black uppercase text-tm-blue-gray/40 tracking-[0.3em]">{subtitle}</p>
          ) : subtitle}
        </div>
        {aside}
      </div>

      {children}
    </GlassCard>
  );
}
