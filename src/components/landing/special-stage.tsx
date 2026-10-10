"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { SPECIAL_DAYS, SPECIAL_FONTS_URL, nextDateOf, type SpecialId } from "@/lib/special-days";
import SpecialBackdrop from "@/components/special/special-backdrop";
import { SpecialMenuBody } from "@/components/special/special-menu";
import { SPECIAL_WIPE_MS, SpecialWipe } from "@/components/special/special-transition";
import { SPECIAL_LOOKS } from "@/components/special/special-themes";

export type SpecialShow = { id: SpecialId; selected: number } | null;

const noop = () => {};

// The Special days scene's backdrop: one of the twelve days as the app wears it, full size. The
// day's own menu, with its six renamed pages, over the day's drifting backdrop, all in the day's
// palette (the scene carries data-special-scope, see app/special.css). The landing script decides
// when it is up and which page is lit; this mounts it. It arrives and leaves behind the wipe the
// app plays between pages on that day. For looking at: inert and silent.
export default function SpecialStage({ register }: { register: (set: (show: SpecialShow) => void) => void }) {
  const [show, setShow] = useState<SpecialShow>(null);
  // Which page is lit. Kept apart from `show`, so it stays put while the menu wipes away
  const [selected, setSelected] = useState(0);
  const want = show?.id ?? null;

  // `up` trails `want`: the wipe starts first and the menu changes underneath it
  const [up, setUp] = useState<SpecialId | null>(null);
  const [wipe, setWipe] = useState<{ id: SpecialId; run: number } | null>(null);
  const [prevWant, setPrevWant] = useState(want);
  if (want !== prevWant) {
    setPrevWant(want);
    const id = want ?? prevWant;
    if (id) setWipe(current => ({ id, run: (current?.run ?? 0) + 1 }));
  }

  useEffect(() => {
    register(next => {
      setShow(next);
      if (next) setSelected(next.selected);
    });
  }, [register]);

  useEffect(() => {
    const swap = setTimeout(() => setUp(want), 230);
    const done = setTimeout(() => setWipe(null), SPECIAL_WIPE_MS);
    return () => { clearTimeout(swap); clearTimeout(done); };
  }, [want]);

  // The days' typefaces are normally loaded on special days only
  const needed = want !== null;
  useEffect(() => {
    if (!needed || document.querySelector(`link[href="${SPECIAL_FONTS_URL}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = SPECIAL_FONTS_URL;
    document.head.appendChild(link);
  }, [needed]);

  if (!up && !wipe) return null;
  const date = up ? nextDateOf(up) : null;

  return (
    <div className="absolute inset-0 overflow-hidden select-none pointer-events-none">
      {up && date && (
        <div key={up} inert className="tm-special-frame absolute inset-0 overflow-hidden bg-background text-foreground">
          <SpecialMenuBody
            id={up}
            selected={selected}
            current={-1}
            select={noop}
            onClose={noop}
            date={date}
            level={12}
            backdrop={<SpecialBackdrop id={up} contained />}
            // Room for the caption card: under the menu on a phone, beside it on wide screens
            className="max-md:pb-44"
          />
          <p className="hidden md:block absolute top-5 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-black/70 text-white text-caption font-mono font-semibold uppercase tracking-[0.12em] whitespace-nowrap">
            One of twelve: {SPECIAL_DAYS[up].name}, {format(date, "MMMM d")}
          </p>
        </div>
      )}
      {wipe && (
        <div key={wipe.run} className="absolute inset-0 z-20 overflow-hidden" aria-hidden>
          <SpecialWipe kind={SPECIAL_LOOKS[wipe.id].wipe} />
        </div>
      )}
    </div>
  );
}
