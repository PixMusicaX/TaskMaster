"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DURATION, EASE, SPRING, press } from "@/lib/motion";
import { useEra } from "./theme-provider";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  onClick?: () => void;
}

// Material, silhouette, edge and sweep come from the current era (see app/eras.css)
export default function GlassCard({ children, className, delay = 0, onClick }: GlassCardProps) {
  const era = useEra();
  const { entryY, entryScale, hoverLift, spring } = era.motion;

  return (
    <motion.div
      initial={{ opacity: 0, y: entryY, scale: entryScale }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={spring
        ? { type: "spring", stiffness: 180, damping: 18, delay }
        : { duration: DURATION.slow, delay, ease: EASE.out }}
      // framer-motion ignores touch-emulated hover, so the lift is pointer-only
      whileHover={hoverLift ? { y: -hoverLift, transition: SPRING.soft } : undefined}
      whileTap={onClick ? press.whileTap : undefined}
      className={cn(
        "tm-card relative overflow-hidden border border-tm-blue-gray/10 dark:border-white/10 p-4 md:p-6",
        onClick && "cursor-pointer hover:border-tm-yellow/50 transition-colors",
        className
      )}
      style={{ "--sweep-delay": `${delay * 2}s` } as React.CSSProperties}
      onClick={onClick}
    >
      <span aria-hidden className="tm-card-fx">
        <span className="tm-card-edge" />
        <span className="tm-card-ring" />
        <span className="tm-card-sweep" />
        <span className="tm-card-corners"><span /></span>
      </span>
      {children}
    </motion.div>
  );
}
