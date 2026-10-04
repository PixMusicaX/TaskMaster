"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { PersonaStyle } from "@/lib/persona";
import { sfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";
import { PERSONA_MENU_ITEMS } from "./persona-menu-items";

// The game's pause menu, with the protagonist's portrait: Makoto drifting upside down underwater
// (P3 Reload), Yu on the TV-yellow screen (P4 Golden), Joker on the red slash (P5). The art is in
// public/persona; see CREDITS.md.
export default function PersonaPauseMenu({ style, dark, open, onClose }: { style: PersonaStyle; dark: boolean; open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    sfx.swoosh();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="pause"
          className="fixed inset-0 z-[420] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          {style === "p3" && <P3Menu pathname={pathname} dark={dark} onClose={onClose} />}
          {style === "p4" && <P4Menu pathname={pathname} onClose={onClose} />}
          {style === "p5" && <P5Menu pathname={pathname} onClose={onClose} />}
          <button
            onClick={onClose}
            aria-label="Close menu"
            className={cn(
              "absolute top-4 right-4 z-10 p-2.5 transition-transform active:scale-90",
              style === "p5" && "bg-black text-white border-2 border-white -rotate-6",
              style === "p4" && "bg-[#181512] text-[#ffe100] rounded-lg",
              style === "p3" && "text-white/80 hover:text-white"
            )}
          >
            <X size={22} strokeWidth={2.5} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------- P3 Reload: sinking into your own mind ----------------

function P3Menu({ pathname, dark, onClose }: { pathname: string; dark: boolean; onClose: () => void }) {
  const deep = dark ? "#021a0e" : "#04245e";
  const mid = dark ? "#0b5a36" : "#0a5fc4";
  const glow = dark ? "#5cff9a" : "#7fd4ff";
  return (
    <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${mid} 0%, ${deep} 75%)` }}>
      {/* Light from the surface, and caustics (static) */}
      <div className="absolute inset-0 opacity-60" style={{ background: `repeating-linear-gradient(100deg, transparent 0 7%, ${glow}22 7% 9%, transparent 9% 16%)`, WebkitMaskImage: "linear-gradient(180deg, #000, transparent 70%)", maskImage: "linear-gradient(180deg, #000, transparent 70%)" }} />
      <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(30% 12% at 30% 4%, ${glow}, transparent 70%), radial-gradient(25% 10% at 70% 2%, #ffffff, transparent 70%)` }} />

      {/* Makoto, upside down, swaying with the water */}
      <motion.div
        className="absolute right-[4%] sm:right-[16%] top-[-6%] h-[92%] aspect-[232/889] origin-top"
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1, rotate: [-2.5, 2.5, -2.5] }}
        transition={{ y: { duration: 1.2, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0.8 }, rotate: { duration: 7, repeat: Infinity, ease: "easeInOut" } }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a static asset; next/image adds nothing here */}
        <img src="/persona/p3-makoto.webp" alt="" className="h-full w-full object-contain" style={{ filter: dark ? "sepia(0.4) hue-rotate(70deg) saturate(1.3) brightness(0.85)" : "saturate(0.85) brightness(0.95) hue-rotate(-8deg)" }} draggable={false} />
      </motion.div>

      {/* Rising bubbles (small, cheap) */}
      {[12, 28, 47, 63, 81].map((left, i) => (
        <motion.span
          key={left}
          className="absolute bottom-0 w-2 h-2 rounded-full border border-white/50"
          style={{ left: `${left}%` }}
          animate={{ y: [0, -900], opacity: [0, 0.8, 0] }}
          transition={{ duration: 6 + i, repeat: Infinity, delay: i * 1.3, ease: "easeOut" }}
        />
      ))}

      <nav className="absolute left-[6%] top-1/2 -translate-y-1/2 flex flex-col gap-1 sm:gap-2">
        {PERSONA_MENU_ITEMS.map((item, i) => {
          const active = pathname === item.href;
          return (
            <motion.div key={item.href} initial={{ x: -60, opacity: 0 }} animate={{ x: i * 14, opacity: 1 }} transition={{ delay: 0.15 + i * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
              <Link href={item.href} onClick={onClose} className="group relative block px-3 py-0.5">
                <span className={cn("absolute inset-0 -skew-x-[20deg] transition-transform origin-left", active ? "bg-white scale-x-100" : "bg-white/90 scale-x-0 group-hover:scale-x-100")} />
                <span className={cn("relative block text-[34px] sm:text-[52px] leading-[1.05] italic font-bold uppercase tracking-tight transition-colors", active ? "text-[#04245e]" : "text-white group-hover:text-[#04245e]")} style={{ fontFamily: "var(--font-space-grotesk)" }}>
                  {item.labels.p3}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </nav>
      <p className="p3-hud absolute bottom-5 right-5 text-[11px] uppercase tracking-[0.3em]" style={{ color: glow }}>
        {dark ? "The Dark Hour" : "Memento mori"}
      </p>
    </div>
  );
}

// ---------------- P4 Golden: TV yellow ----------------

function P4Menu({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  return (
    <div className="absolute inset-0 bg-[#ffe100]">
      <div className="absolute inset-0" style={{ background: "repeating-linear-gradient(0deg, transparent 0 3px, rgb(0 0 0 / 0.05) 3px 4px)" }} />
      <div className="absolute inset-y-0 left-0 w-[46%] bg-[#181512]" style={{ clipPath: "polygon(0 0, 100% 0, 78% 100%, 0 100%)" }} />
      <div className="absolute inset-y-0 left-0 w-[46%] p-static opacity-[0.12]" style={{ clipPath: "polygon(0 0, 100% 0, 78% 100%, 0 100%)" }} />

      <motion.div
        className="absolute left-[2%] bottom-0 h-[96%] aspect-[634/1200]"
        initial={{ x: -120, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 160, damping: 20 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a static asset; next/image adds nothing here */}
        <img src="/persona/p4-yu.webp" alt="" className="h-full w-full object-contain object-bottom drop-shadow-[8px_0_0_#ef5f00]" draggable={false} />
      </motion.div>

      <nav className="absolute right-[5%] top-1/2 -translate-y-1/2 flex flex-col gap-2.5 items-end">
        {PERSONA_MENU_ITEMS.map((item, i) => {
          const active = pathname === item.href;
          return (
            <motion.div key={item.href} initial={{ x: 80, opacity: 0, scale: 0.8 }} animate={{ x: 0, opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.05, type: "spring", stiffness: 500, damping: 20 }}>
              <Link
                href={item.href}
                onClick={onClose}
                className={cn(
                  "block min-w-[180px] sm:min-w-[240px] text-right px-5 py-1.5 rounded-xl border-[3px] border-[#181512] font-display text-[22px] sm:text-[30px] uppercase italic transition-transform hover:-translate-x-2",
                  active ? "bg-white text-[#181512] shadow-[5px_5px_0_#ef5f00]" : "bg-[#181512] text-[#ffe100] shadow-[5px_5px_0_rgb(0_0_0_/_0.25)]"
                )}
              >
                {item.labels.p4}
              </Link>
            </motion.div>
          );
        })}
      </nav>
    </div>
  );
}

// ---------------- P5: the red slash ----------------

function P5Menu({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  return (
    <div className="absolute inset-0 bg-[#0b0b0b]">
      <motion.div
        className="absolute -left-[20%] top-[18%] h-[64%] w-[140%] bg-[#e5001b]"
        style={{ rotate: -16 }}
        initial={{ x: "-110%" }}
        animate={{ x: 0 }}
        transition={{ duration: 0.35, ease: [0.7, 0, 0.3, 1] }}
      />
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle, rgb(0 0 0 / 0.3) 1.3px, transparent 1.8px) 0 0 / 9px 9px" }} />

      <motion.div
        className="absolute left-[-4%] sm:left-[4%] bottom-0 h-[88%] aspect-[786/912]"
        initial={{ x: -160, opacity: 0, rotate: -6 }}
        animate={{ x: 0, opacity: 1, rotate: 0 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 20 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a static asset; next/image adds nothing here */}
        <img
          src="/persona/p5-joker.webp"
          alt=""
          className="h-full w-full object-contain object-bottom"
          style={{ filter: "drop-shadow(5px 0 0 #fff) drop-shadow(-5px 0 0 #fff) drop-shadow(0 5px 0 #fff) drop-shadow(0 -5px 0 #fff) drop-shadow(10px 10px 0 #000)" }}
          draggable={false}
        />
      </motion.div>

      <nav className="absolute right-[4%] top-1/2 -translate-y-1/2 flex flex-col items-end gap-1">
        {PERSONA_MENU_ITEMS.map((item, i) => {
          const active = pathname === item.href;
          const tilt = [-8, 5, -4, 7, -6, 4][i % 6];
          return (
            <motion.div
              key={item.href}
              initial={{ x: 120, opacity: 0, rotate: tilt * 2 }}
              animate={{ x: -(i % 2) * 28, opacity: 1, rotate: tilt }}
              transition={{ delay: 0.2 + i * 0.045, type: "spring", stiffness: 520, damping: 22 }}
            >
              <Link href={item.href} onClick={onClose} className="group relative block px-4 py-0.5">
                <span
                  className={cn("absolute inset-0 transition-transform", active ? "bg-white scale-100" : "bg-white scale-0 group-hover:scale-100")}
                  style={{ clipPath: "polygon(3% 10%, 100% 0, 96% 90%, 0 100%)" }}
                />
                <span
                  className={cn("relative block font-display text-[36px] sm:text-[56px] uppercase leading-none transition-colors", active ? "text-[#e5001b]" : "text-white group-hover:text-[#e5001b]")}
                  style={{ WebkitTextStroke: active ? "0" : "1.5px #000", textShadow: active ? "4px 4px 0 #000" : "4px 4px 0 #e5001b" }}
                >
                  {item.labels.p5}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </nav>
    </div>
  );
}
