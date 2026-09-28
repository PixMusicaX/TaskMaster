"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CompletionCheckProps {
  done: boolean;
  // Box styling (size, radius, border, colours) comes from the caller
  className?: string;
  checkSize?: number;
  checkClassName?: string;
  // Shown while not done
  idle?: React.ReactNode;
}

const SPARKS = 6;

// Checkbox glyph that draws its tick and bursts when it flips to done.
// The burst only plays on a real transition, never on first render.
export default function CompletionCheck({ done, className, checkSize = 16, checkClassName, idle }: CompletionCheckProps) {
  const [prevDone, setPrevDone] = useState(done);
  const [burstKey, setBurstKey] = useState(0);

  // Adjust state during render when the prop flips (no effect round-trip)
  if (done !== prevDone) {
    setPrevDone(done);
    if (done) setBurstKey(k => k + 1);
  }

  return (
    <motion.span
      key={burstKey}
      className={cn("relative inline-flex items-center justify-center shrink-0", className)}
      animate={burstKey ? { scale: [1, 0.8, 1.15, 1] } : undefined}
      transition={{ duration: 0.45, times: [0, 0.25, 0.65, 1] }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {done ? (
          <motion.svg
            key="check"
            width={checkSize}
            height={checkSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={checkClassName}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
          >
            <motion.path
              d="M20 6 9 17l-5-5"
              initial={{ pathLength: burstKey ? 0 : 1 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, delay: 0.08, ease: "easeOut" }}
            />
          </motion.svg>
        ) : (
          <motion.span
            key="idle"
            className="inline-flex"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
          >
            {idle}
          </motion.span>
        )}
      </AnimatePresence>

      {burstKey > 0 && (
        <span aria-hidden className="pointer-events-none absolute inset-0">
          <motion.span
            className="absolute inset-0 rounded-[inherit] border-2 border-tm-yellow"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          />
          {Array.from({ length: SPARKS }).map((_, i) => {
            const angle = (i / SPARKS) * Math.PI * 2 - Math.PI / 2;
            return (
              <motion.span
                key={i}
                className="absolute left-1/2 top-1/2 w-1 h-1 -ml-0.5 -mt-0.5 rounded-full bg-tm-yellow"
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: Math.cos(angle) * 22, y: Math.sin(angle) * 22, opacity: 0, scale: 0.4 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            );
          })}
        </span>
      )}
    </motion.span>
  );
}
