"use client";

import { useEffect, useState } from "react";
import type { PersonaStyle } from "@/lib/persona";

// The growth saga's Persona-day dressing (saga-p3/p4/p5.tsx), downloaded only on the day it's
// worn. Until it arrives the saga plays as on a normal day, and it rebuilds its script once it has
// it (it is far below the fold by then).
export type PersonaKit =
  | ({ style: "p3" } & typeof import("./saga-p3"))
  | ({ style: "p4" } & typeof import("./saga-p4"))
  | ({ style: "p5" } & typeof import("./saga-p5"));

function loadKit(style: PersonaStyle): Promise<PersonaKit> {
  if (style === "p3") return import("./saga-p3").then(kit => ({ style, ...kit }));
  if (style === "p4") return import("./saga-p4").then(kit => ({ style, ...kit }));
  return import("./saga-p5").then(kit => ({ style, ...kit }));
}

export function usePersonaKit(style: PersonaStyle | null): PersonaKit | null {
  const [kit, setKit] = useState<PersonaKit | null>(null);
  useEffect(() => {
    if (!style) return;
    let live = true;
    loadKit(style).then(loaded => { if (live) setKit(loaded); }).catch(e => console.error("Persona saga failed to load:", e));
    return () => { live = false; };
  }, [style]);
  // A kit left over from another style (the dev override, or midnight) is not worn
  return kit && kit.style === style ? kit : null;
}
