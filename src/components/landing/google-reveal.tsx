"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./landing.css";

// The sign-in transition, shared by the landing page (which closes it over the screen) and the
// login page (which opens it again): a spiral in Google's four colours.
export const GOOGLE_WIPE_MS = 700;
const WIPE_FLAG = "tm_google_wipe";
// Rings from the rim to the centre, each turned a step further than the one outside it, which is
// what makes four pie slices read as a spiral
const RINGS = 7;

// "in" grows from the centre of the screen until it covers it; "out" winds back down to nothing
export function GoogleSpiral({ phase }: { phase: "in" | "out" }) {
  return (
    <div className="fixed inset-0 z-[60] overflow-hidden pointer-events-none" aria-hidden>
      <div className={`tm-spiral tm-spiral-${phase}`}>
        {Array.from({ length: RINGS }, (_, i) => (
          <div key={i} className="tm-spiral-ring" style={{ inset: `${i * (50 / RINGS)}%`, ["--turn" as string]: `${i * 32}deg` }} />
        ))}
      </div>
    </div>
  );
}

// Called by the landing page just before it sends the visitor to the login page
export function markGoogleWipe() {
  try { sessionStorage.setItem(WIPE_FLAG, "1"); } catch { /* storage blocked: the spiral just doesn't reopen */ }
}

// The second half of the transition: when the login page is reached through the landing page's
// spiral, it starts covered by it, and the spiral winds down into the middle of the page
export default function GoogleReveal() {
  const [open, setOpen] = useState(() => {
    try { return typeof window !== "undefined" && sessionStorage.getItem(WIPE_FLAG) === "1"; } catch { return false; }
  });

  useEffect(() => {
    if (!open) return;
    try { sessionStorage.removeItem(WIPE_FLAG); } catch { /* nothing to clear */ }
    const done = setTimeout(() => setOpen(false), GOOGLE_WIPE_MS + 80);
    return () => clearTimeout(done);
  }, [open]);

  if (!open) return null;
  // Into <body>: the page transition wrapper is transformed while it plays, and a fixed element
  // inside it would only cover that wrapper, not the screen
  return createPortal(<GoogleSpiral phase="out" />, document.body);
}
