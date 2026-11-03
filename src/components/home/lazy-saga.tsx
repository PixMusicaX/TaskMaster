"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import type GrowthSagaComponent from "./growth-saga";

// The Growth Orbit sits below the fold, and it is most of the home page's code (the scenes, the
// map generator, the Persona dressings), so it isn't part of first paint: it loads once the
// browser is idle, or as soon as the page is scrolled near it, whichever comes first.

// Stands where the saga will be: a screen tall, enough to scroll into before it arrives
function SagaPlaceholder({ ref }: { ref?: React.Ref<HTMLElement> }) {
  return <section ref={ref} aria-label="Growth analytics" aria-busy="true" className="relative w-full min-h-svh" />;
}

const GrowthSaga = dynamic(() => import("./growth-saga"), { ssr: false, loading: () => <SagaPlaceholder /> });

// How far ahead of the viewport scrolling starts the load, and the longest it waits for idle time
const NEAR = "150% 0px";
const IDLE_TIMEOUT_MS = 3_000;

export default function LazyGrowthSaga(props: ComponentProps<typeof GrowthSagaComponent>) {
  const placeholder = useRef<HTMLElement>(null);
  const [wanted, setWanted] = useState(false);

  useEffect(() => {
    if (wanted) return;
    const want = () => setWanted(true);
    // Safari has no requestIdleCallback (the DOM types say every browser does); a timer stands in
    const hasIdle = typeof window.requestIdleCallback === "function";
    const idle = hasIdle ? window.requestIdleCallback(want, { timeout: IDLE_TIMEOUT_MS }) : window.setTimeout(want, 1_500);
    const observer = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) want(); }, { rootMargin: NEAR });
    if (placeholder.current) observer.observe(placeholder.current);
    return () => {
      if (hasIdle) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      observer.disconnect();
    };
  }, [wanted]);

  return wanted ? <GrowthSaga {...props} /> : <SagaPlaceholder ref={placeholder} />;
}
