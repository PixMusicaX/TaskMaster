"use client";

import { useLayoutEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { prefersReducedMotion } from "@/lib/scroll-fx";

// The daily quote, written in word by word whenever it changes
export default function HeroQuote({ text, author }: { text: string; author: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const full = `“${text}”${author ? ` - ${author}` : ""}`;

  useLayoutEffect(() => {
    const words = ref.current?.querySelectorAll("[data-word]");
    if (!words?.length || prefersReducedMotion()) return;
    const animation = animate(words, {
      opacity: [0, 1],
      translateY: [10, 0],
      duration: 600,
      delay: stagger(35, { start: 150 }),
      ease: "out(3)",
    });
    return () => { animation.revert(); };
  }, [full]);

  return (
    <p ref={ref} aria-label={full} className="text-sm text-center md:text-base font-medium text-tm-blue-gray italic opacity-80 max-w-xl mx-auto -mt-8 mb-12">
      {full.split(" ").map((word, i) => (
        <span key={`${i}-${word}`} aria-hidden data-word className="inline-block whitespace-pre">{word} </span>
      ))}
    </p>
  );
}
