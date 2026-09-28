import { cn } from "@/lib/utils";

// Shimmering placeholder rows shaped like list items
export function SkeletonRows({ rows = 3, className, caption }: { rows?: number; className?: string; caption?: string }) {
  return (
    <div className={cn("w-full space-y-3", className)} aria-busy="true" aria-label={caption ?? "Loading"}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-[1.5rem] border border-tm-blue-gray/10">
          <div className="tm-skeleton w-8 h-8 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="tm-skeleton h-3" style={{ width: `${70 - i * 12}%` }} />
            <div className="tm-skeleton h-2 w-1/3" />
          </div>
        </div>
      ))}
      {caption && (
        <p className="text-caption font-mono font-semibold uppercase text-tm-blue-gray tracking-[0.12em] text-center pt-1">{caption}</p>
      )}
    </div>
  );
}

// Full-page placeholder: title block plus two content panels
export function PageSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading">
      <div className="space-y-3">
        <div className="tm-skeleton h-9 w-56" />
        <div className="tm-skeleton h-4 w-72 max-w-full" />
        <div className="tm-skeleton h-7 w-40" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
        <div className="tm-skeleton h-[420px] rounded-3xl" />
        <SkeletonRows rows={4} />
      </div>
    </div>
  );
}

// Kept for existing call sites
export function PremiumLoader({ caption }: { caption?: string }) {
  return <SkeletonRows rows={3} caption={caption} />;
}

export function SkeletonCard() {
  return <div className="tm-skeleton w-full h-48 rounded-3xl" />;
}
