"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Text whose strike-through draws left to right when it's completed
export default function StrikeText({ done, children, className, doneClassName = "opacity-50" }: {
  done: boolean;
  children: React.ReactNode;
  className?: string;
  doneClassName?: string;
}) {
  return (
    <span className={cn("relative inline-block max-w-full transition-opacity duration-300", done && doneClassName, className)}>
      {children}
      <motion.span
        aria-hidden
        className="absolute left-0 right-0 top-1/2 h-[2px] -mt-px bg-current rounded-full origin-left"
        initial={false}
        animate={{ scaleX: done ? 1 : 0 }}
        transition={{ duration: 0.35, ease: [0.65, 0, 0.35, 1] }}
      />
    </span>
  );
}
