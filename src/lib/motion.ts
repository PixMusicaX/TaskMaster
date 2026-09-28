import type { Transition, Variants } from "framer-motion";

// Shared motion vocabulary. Keep animations to transform/opacity so they stay cheap on mobile.

export const EASE = {
  out: [0.16, 1, 0.3, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
};

export const DURATION = {
  fast: 0.18,
  base: 0.35,
  slow: 0.8,
};

export const SPRING = {
  snappy: { type: "spring", stiffness: 500, damping: 30 } satisfies Transition,
  soft: { type: "spring", stiffness: 220, damping: 26 } satisfies Transition,
  bubble: { type: "spring", bounce: 0.2, duration: 0.6 } satisfies Transition,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Tactile press feedback for touch-first buttons
export const press = {
  whileTap: { scale: 0.97 },
  transition: SPRING.snappy,
};
