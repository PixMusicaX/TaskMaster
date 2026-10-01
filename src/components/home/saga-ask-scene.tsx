import Image from "next/image";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { CAPTION, TITLE } from "./saga-kit";

// The growth saga's closing scene: the orbit comes back whole with the way to the Taskmaster at
// its centre, behind the app's own crest. The scroll script animates the pieces through their data-saga names.

export function AskTitle() {
  return (
    <div data-saga="ask-title" className="col-start-1 row-start-1 self-end flex flex-col items-center gap-1 motion-reduce:hidden">
      <p className={cn(TITLE, "text-3xl sm:text-4xl")}>The Taskmaster</p>
      <p className={CAPTION}>Need guidance?</p>
    </div>
  );
}

export function AskEmblem({ onAsk, active }: { onAsk: () => void; active: boolean }) {
  return (
    <div data-saga="ask" className="absolute inset-0 flex items-center justify-center motion-reduce:hidden">
      {/* Slow ripples out from the centre */}
      <span aria-hidden className="absolute w-[46%] aspect-square rounded-full border border-tm-yellow/50 animate-ping [animation-duration:2.8s]" />
      <span aria-hidden className="absolute w-[46%] aspect-square rounded-full border border-tm-yellow/30 animate-ping [animation-duration:2.8s] [animation-delay:1.4s]" />
      <button
        type="button"
        onClick={onAsk}
        tabIndex={active ? undefined : -1}
        aria-label="Ask The Taskmaster"
        className={cn(
          "group relative w-[46%] aspect-square rounded-full overflow-hidden flex items-center justify-center bg-tm-purple-dark border border-tm-yellow/40 text-tm-yellow shadow-[0_0_40px_rgba(242,194,48,0.25)] hover:shadow-[0_0_56px_rgba(242,194,48,0.45)] active:scale-95 transition",
          active && "pointer-events-auto"
        )}
      >
        <Image src="/logo.png" alt="" width={240} height={240} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        <span className="absolute inset-0 bg-gradient-to-r from-tm-yellow/0 via-tm-yellow/20 to-tm-yellow/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </button>
    </div>
  );
}

export function AskDetails({ onAsk, active }: { onAsk: () => void; active: boolean }) {
  return (
    <div data-saga="ask-details" className="col-start-1 row-start-1 flex flex-col items-center gap-3 motion-reduce:hidden">
      <button
        type="button"
        data-saga="ask-row"
        onClick={onAsk}
        tabIndex={active ? undefined : -1}
        className={cn(
          "px-6 py-3 rounded-full bg-tm-purple-dark border border-tm-yellow/30 text-lg font-bold italic tracking-tight text-white hover:border-tm-yellow/60 active:scale-95 transition",
          active && "pointer-events-auto"
        )}
      >
        Ask The Taskmaster
      </button>
      <p data-saga="ask-row" className={CAPTION}>Your day, read back to you</p>
    </div>
  );
}

// The plain button, for when motion is reduced and the scenes are not drawn
export function AskTaskmasterButton({ onAsk }: { onAsk: () => void }) {
  return (
    <button
      onClick={onAsk}
      className="group relative px-8 py-4 bg-tm-purple-dark border border-tm-yellow/30 rounded-[2rem] hover:bg-tm-purple-dark/80 transition-all shadow-[0_0_30px_rgba(242,194,48,0.15)] hover:shadow-[0_0_40px_rgba(242,194,48,0.3)] flex items-center gap-4 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-tm-yellow/0 via-tm-yellow/10 to-tm-yellow/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      <div className="w-10 h-10 rounded-xl bg-tm-yellow/20 flex items-center justify-center relative z-10">
        <MessageSquare className="text-tm-yellow" size={20} />
      </div>
      <div className="text-left relative z-10">
        <p className="text-xs font-mono font-semibold text-tm-yellow tracking-[0.12em] uppercase">Need Guidance?</p>
        <p className="text-lg font-bold text-white italic tracking-tight">Ask The Taskmaster</p>
      </div>
    </button>
  );
}
