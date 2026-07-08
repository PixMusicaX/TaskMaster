"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  onClick?: () => void;
}

export default function GlassCard({ children, className, delay = 0, onClick }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-tm-blue-gray/10 bg-white/70 dark:bg-white/5 dark:border-white/10 backdrop-blur-2xl p-4 md:p-6 shadow-xl",
        "before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-br before:from-tm-yellow/5 before:to-tm-orange-dark/5",
        onClick && "cursor-pointer hover:border-tm-yellow/50 transition-colors",
        className
      )}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
