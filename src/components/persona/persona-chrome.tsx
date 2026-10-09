"use client";

import dynamic from "next/dynamic";
import { usePersona, useSpecial, useTheme } from "@/components/theme-provider";

// Persona code only downloads on Persona days
const PersonaNav = dynamic(() => import("./persona-nav"), { ssr: false });
const PersonaTransition = dynamic(() => import("./persona-transition"), { ssr: false });
const PersonaIntro = dynamic(() => import("./persona-intro"), { ssr: false });

// Normal-day chrome (nav, era ambient, watermark). Hidden by CSS before hydration on a Persona or
// special day (html[data-persona] / html[data-special] .tm-normal-only), then unmounted so nothing
// keeps animating underneath.
export function NormalOnly({ children }: { children: React.ReactNode }) {
  const persona = usePersona();
  const special = useSpecial();
  if (persona || special) return null;
  return <div className="tm-normal-only contents">{children}</div>;
}

// The game's menu bar, page wipes and the day's intro, on Persona days only
export default function PersonaChrome() {
  const persona = usePersona();
  const { theme } = useTheme();
  if (!persona) return null;
  const dark = theme === "dark";
  return (
    <>
      <PersonaNav key={persona} style={persona} />
      <PersonaTransition style={persona} dark={dark} />
      <PersonaIntro key={`intro-${persona}`} style={persona} dark={dark} />
    </>
  );
}
