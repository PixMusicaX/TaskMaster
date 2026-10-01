import { useEffect, type RefObject } from "react";
import { animate, onScroll } from "animejs";

// Scroll-linked effects run on anime.js; entrances and gestures stay on framer-motion (lib/motion.ts).
// Keep them to transform/opacity, and skip them entirely for reduced motion.

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Height of the sticky navbar plus a little air: the line an element dissolves against
const NAV_LINE = 88;

// Shrinks and fades an element as it slides under the navbar
export function useScrollDissolve(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const animation = animate(el, {
      opacity: [1, 0],
      scale: [1, 0.9],
      translateY: [0, 24],
      ease: "linear",
      autoplay: onScroll({
        target: el,
        enter: { container: NAV_LINE, target: "top" },
        leave: { container: NAV_LINE, target: "bottom" },
        sync: true,
      }),
    });
    return () => { animation.revert(); };
  }, [ref]);
}
