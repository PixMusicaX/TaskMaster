import Link from "next/link";
import { Plus } from "lucide-react";
import GlassCard from "@/components/glass-card";
import { SkeletonRows } from "@/components/loader";
import { cn } from "@/lib/utils";

const ACCENTS = {
  yellow: {
    card: "border-tm-yellow/30 bg-tm-yellow/5",
    dot: "bg-tm-yellow shadow-[0_0_8px_rgba(242,194,48,0.8)]",
    text: "text-tm-yellow",
  },
  orange: {
    card: "border-tm-orange-light/30 bg-tm-orange-light/5",
    dot: "bg-tm-orange-light shadow-[0_0_8px_rgba(249,115,22,0.8)]",
    text: "text-tm-orange-light",
  },
};

interface WidgetCardProps {
  accent: keyof typeof ACCENTS;
  title: string;
  subtitle?: React.ReactNode;
  aside: React.ReactNode;
  loading: boolean;
  loadingContent?: React.ReactNode;
  loadingMinHeight?: string;
  footerHref: string;
  footerLabel: string;
  delay: number;
  className?: string;
  headerClassName?: string;
  children: React.ReactNode;
}

// Top-row dashboard card: pulsing title, loader while fetching, and a footer link
export default function WidgetCard({ accent, title, subtitle, aside, loading, loadingContent = <SkeletonRows rows={3} />, loadingMinHeight = "min-h-[200px]", footerHref, footerLabel, delay, className, headerClassName, children }: WidgetCardProps) {
  const a = ACCENTS[accent];
  return (
    <GlassCard delay={delay} className={cn("flex flex-col gap-5 group relative", a.card, className)}>
      <div className={cn("flex items-center justify-between", headerClassName)}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full animate-pulse", a.dot)} />
            <h2 className={cn("text-2xl font-display font-bold uppercase tracking-tight", a.text)}>{title}</h2>
          </div>
          {typeof subtitle === "string" ? (
            <p className="text-caption font-mono font-semibold text-tm-blue-gray uppercase tracking-[0.12em]">{subtitle}</p>
          ) : subtitle}
        </div>
        {aside}
      </div>

      <div className={cn("flex-1 space-y-4", loading && cn("flex items-center justify-center", loadingMinHeight))}>
        {loading ? loadingContent : <div className="space-y-3">{children}</div>}
      </div>

      <Link href={footerHref} className={cn("mt-auto flex items-center gap-2 font-mono font-semibold text-caption uppercase tracking-[0.12em] hover:underline group/link", a.text)}>
        <Plus size={14} className="group-hover/link:rotate-90 transition-transform" /> {footerLabel}
      </Link>
    </GlassCard>
  );
}
