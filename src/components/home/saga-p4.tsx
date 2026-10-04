"use client";

import { motion } from "framer-motion";
import { stagger, utils, type Timeline } from "animejs";

// Persona 4 days: the growth saga is what's on the Midnight Channel, and the scenes are channels.
//
// - The orbit is the picture on an old TV set (antennae, a channel knob, the rainbow stripe), with
//   the remote beside it. The set powers on from a white line as the stage arrives.
// - Every channel change: the remote presses and fires at the set, static crackles, and the picture
//   does one of three things in turn (collapses to a line and reopens, rolls vertically, or holds
//   on a white screen) before colour bars collapse into the new channel and its number shows.
// - Around the set, a rainbow draws across the stage and flowers pop out and drift away.
//
// The scenes drawn on the screen are untouched. Everything is flat fills and transforms.

const RAINBOW = ["#ef3b2c", "#ff8a1f", "#ffe100", "#2fd14b", "#2be0e0", "#2a4bff", "#ff4fa3"];
const pad = (n: number) => String(n).padStart(2, "0");

// The game's six-petal flower
function Flower({ color }: { color: string }) {
  return (
    <svg viewBox="-50 -50 100 100" className="w-full h-full">
      {[0, 60, 120, 180, 240, 300].map(a => (
        <path key={a} d="M 0 -6 C -16 -22 -15 -46 0 -46 C 15 -46 16 -22 0 -6 Z" fill={color} transform={`rotate(${a})`} />
      ))}
      <circle r="9" fill={color} />
    </svg>
  );
}

// Behind the set: the rainbow, the flowers and the remote
export function P4Stage() {
  return (
    <div aria-hidden className="absolute inset-x-0 top-0 bottom-[var(--lift)] overflow-hidden pointer-events-none motion-reduce:hidden">
      {/* The rainbow: seven arcs over the set, drawn left to right on every channel change */}
      <svg viewBox="0 0 200 110" className="absolute left-1/2 top-1/2 w-[150%] sm:w-[110%] max-w-[1100px] -translate-x-1/2 -translate-y-[62%] overflow-visible" fill="none">
        {RAINBOW.map((color, i) => (
          <path
            key={color}
            data-saga="p4-arc"
            d={`M ${6 + i * 3.2} 110 A ${94 - i * 3.2} ${94 - i * 3.2} 0 0 1 ${194 - i * 3.2} 110`}
            stroke={color} strokeWidth="3.3" pathLength={1} strokeDasharray="1"
          />
        ))}
      </svg>

      {/* Flowers that pop out round the set */}
      {[
        { x: "8%", y: "24%", size: "9%", color: "#fffdf2" },
        { x: "84%", y: "20%", size: "11%", color: "#181512" },
        { x: "90%", y: "58%", size: "8%", color: "#ef5f00" },
        { x: "4%", y: "70%", size: "12%", color: "#ef5f00" },
        { x: "72%", y: "78%", size: "7%", color: "#fffdf2" },
      ].map((f, i) => (
        <div key={i} data-saga="p4-flower" className="absolute aspect-square" style={{ left: f.x, top: f.y, width: f.size }}>
          <Flower color={f.color} />
        </div>
      ))}

      {/* The remote, to the left of the set, with its infrared pulses */}
      <div data-saga="p4-remote" className="absolute top-1/2 w-[clamp(26px,7.5vw,46px)] aspect-[1/2.7] -translate-y-[30%] origin-bottom" style={{ left: "calc(50% - min(62vw, 40svh, 400px) * var(--z) * 0.895 - clamp(26px, 7.5vw, 46px) - 1.5vw)" }}>
        <div className="relative h-full w-full bg-[#181512] border-2 border-[#fffdf2] flex flex-col items-center gap-[6%] pt-[14%]" style={{ borderRadius: "22%", boxShadow: "0.25em 0.25em 0 #ef5f00" }}>
          <span data-saga="p4-led" className="w-[22%] aspect-square bg-[#ef3b2c]" style={{ borderRadius: "50%" }} />
          <span data-saga="p4-thumb" className="w-[54%] aspect-square bg-[#ffe100]" style={{ borderRadius: "50%" }} />
          <span className="w-[66%] grid grid-cols-2 gap-[12%]">
            {[0, 1, 2, 3, 4, 5].map(i => <span key={i} className="aspect-square bg-[#fffdf2]/75" style={{ borderRadius: "20%" }} />)}
          </span>
        </div>
        {[0, 1, 2].map(i => (
          <span key={i} data-saga="p4-ir" className="absolute left-full top-[6%] ml-[10%] w-[26%] aspect-square bg-[#ef3b2c]" style={{ borderRadius: "50%" }} />
        ))}
      </div>
    </div>
  );
}

// The set itself, behind the picture
export function P4TvBack({ scene, count }: { scene: number; count: number }) {
  return (
    <div data-saga="p4-set" aria-hidden className="absolute inset-0 pointer-events-none motion-reduce:hidden">
      {/* Antennae */}
      <div data-saga="p4-antenna" className="absolute left-[44%] -top-[43%] w-[44%] h-[22%] -translate-x-1/2 origin-bottom">
        <svg viewBox="0 0 100 60" className="w-full h-full overflow-visible" fill="none" stroke="#181512" strokeWidth="3" strokeLinecap="round">
          <path d="M 50 60 L 10 4 M 50 60 L 90 4" />
          <circle cx="10" cy="4" r="4" fill="#ef5f00" stroke="none" />
          <circle cx="90" cy="4" r="4" fill="#ef5f00" stroke="none" />
        </svg>
      </div>

      {/* Body, feet and the rainbow stripe of the logo */}
      <div className="absolute -left-[27%] -right-[52%] -top-[22%] -bottom-[26%] bg-[#181512]" style={{ borderRadius: "9%", boxShadow: "0.5em 0.5em 0 #ef5f00" }} />
      <div className="absolute -bottom-[33%] -left-[18%] w-[12%] h-[8%] bg-[#181512]" style={{ borderRadius: "0 0 30% 30%" }} />
      <div className="absolute -bottom-[33%] -right-[42%] w-[12%] h-[8%] bg-[#181512]" style={{ borderRadius: "0 0 30% 30%" }} />
      <div className="absolute -left-[22%] -right-[47%] -bottom-[22.5%] h-[2.4%] flex overflow-hidden" style={{ borderRadius: 99 }}>
        {RAINBOW.map(c => <span key={c} className="flex-1" style={{ background: c }} />)}
      </div>

      {/* The screen */}
      <div className="absolute -inset-y-[16%] -inset-x-[21%] bg-[#fffdf2]" style={{ borderRadius: "9% / 10%", boxShadow: "inset 0 0 0 0.3em #ffe100" }} />

      {/* Control panel: the channel knob points at the scene on stage */}
      <div className="absolute -right-[47%] -top-[6%] w-[20%] flex flex-col items-center gap-[0.55em]">
        <span className="relative w-full aspect-square bg-[#ffe100] border-2 border-[#fffdf2]" style={{ borderRadius: "50%" }}>
          <span className="absolute left-1/2 top-1/2 w-[12%] h-[44%] origin-top bg-[#181512] transition-transform duration-500" style={{ transform: `translateX(-50%) rotate(${180 + (scene / count) * 360}deg)` }} />
        </span>
        <span className="w-[62%] aspect-square bg-[#ef5f00]" style={{ borderRadius: "50%" }} />
        <span className="w-full flex flex-col gap-[3px] mt-[0.3em]">
          {[0, 1, 2, 3, 4].map(i => <span key={i} className="h-[2px] bg-[#fffdf2]/55" />)}
        </span>
        {/* Power light */}
        <motion.span className="w-[22%] aspect-square bg-[#2fd14b] mt-[0.3em]" style={{ borderRadius: "50%" }} animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 2.4, repeat: Infinity }} />
      </div>
    </div>
  );
}

// What passes over the picture: scanlines, static, the white screen, the colour bars, the readout
export function P4TvFront({ scene }: { scene: number }) {
  return (
    <div aria-hidden className="absolute -inset-y-[16%] -inset-x-[21%] overflow-hidden pointer-events-none motion-reduce:hidden" style={{ borderRadius: "9% / 10%" }}>
      <div className="absolute inset-0 opacity-40" style={{ background: "repeating-linear-gradient(0deg, transparent 0 3px, rgb(0 0 0 / 0.08) 3px 4px)" }} />
      <div data-saga="p4-static" className="absolute inset-0 p-static bg-[#181512]" />
      <div data-saga="p4-flash" className="absolute inset-0 bg-white" />
      <div data-saga="p4-bars" className="absolute inset-0 flex">
        {["#f4f4f4", ...RAINBOW].map(c => <span key={c} className="flex-1" style={{ background: c }} />)}
      </div>
      {/* The channel readout, top right, like an old set's on-screen display */}
      <span data-saga="p4-osd" className="absolute top-[5%] right-[7%] font-display italic text-[clamp(13px,3.6vw,22px)] leading-none text-[#17b53a]" style={{ textShadow: "0.08em 0.08em 0 #0b3d17" }}>
        CH {pad(scene + 1)}
      </span>
    </div>
  );
}

// The moves, added to the saga's scroll script. `froms` are the moments each scene takes the stage
// (the first is the opening, so channel changes start from the second). Times are in the script's
// units (svh of scroll), like everything else in it.
export function addP4Script(timeline: Timeline, froms: number[]) {
  utils.set("[data-saga=p4-static], [data-saga=p4-flash], [data-saga=p4-bars], [data-saga=p4-osd], [data-saga=p4-ir], [data-saga=p4-arc]", { opacity: 0 });
  utils.set("[data-saga=p4-arc]", { strokeDashoffset: 1 });
  utils.set("[data-saga=p4-flower]", { scale: 0 });

  // The rainbow draws across; it fades again a little later
  const rainbow = (at: number) => {
    timeline
      .add("[data-saga=p4-arc]", { opacity: [0, 1], duration: 2, ease: "linear" }, at)
      .add("[data-saga=p4-arc]", { strokeDashoffset: [1, 0], duration: 18, delay: stagger(1.2), ease: "inOut(2)" }, at)
      .add("[data-saga=p4-arc]", { opacity: [1, 0], duration: 10, ease: "linear" }, at + 30);
  };

  // The opening: the set rises in, the antennae spring up, the remote slides in, the picture
  // opens from a white line, and the first rainbow draws
  timeline
    .add("[data-saga=p4-set]", { opacity: [0, 1], translateY: ["30%", "0%"], duration: 22 }, 0)
    .add("[data-saga=p4-antenna]", { scaleY: [0, 1.25, 1], rotate: [-10, 6, 0], duration: 20 }, 6)
    .add("[data-saga=p4-remote]", { translateX: ["-320%", "0%"], rotate: [-40, 8, 0], duration: 24 }, 6)
    .add("[data-saga=device]", { scaleY: [0.012, 1], duration: 12, ease: "out(4)" }, 12)
    .add("[data-saga=p4-flash]", { opacity: [1, 0], duration: 16, ease: "linear" }, 12)
    .add("[data-saga=p4-osd]", { opacity: [0, 1], duration: 4 }, 22)
    .add("[data-saga=p4-osd]", { opacity: [1, 0], duration: 8 }, 62);
  rainbow(16);

  froms.slice(1).forEach((at, i) => {
    const way = i % 2 ? -1 : 1;
    const move = i % 3;
    timeline
      // The remote: a press, its light, and three infrared pulses to the set
      .add("[data-saga=p4-remote]", { rotate: [0, 16, 0], translateY: [0, -10, 0], duration: 14, ease: "inOut(2)" }, at - 16)
      .add("[data-saga=p4-thumb]", { scale: [1, 0.7, 1], duration: 8 }, at - 15)
      .add("[data-saga=p4-led]", { scale: [1, 2.2, 1], duration: 8 }, at - 15)
      .add("[data-saga=p4-ir]", { opacity: [0, 1, 0], translateX: ["0%", "620%"], translateY: ["0%", "-140%"], duration: 9, delay: stagger(2.2), ease: "linear" }, at - 15)
      .add("[data-saga=p4-antenna]", { rotate: [0, 8 * way, -6 * way, 3 * way, 0], duration: 20, ease: "inOut(2)" }, at - 9)
      // Static while the tuner hunts
      .add("[data-saga=p4-static]", { opacity: [0, 0.75, 0.4, 0.75, 0], duration: 16, ease: "linear" }, at - 11);

    // The picture: three moves in turn
    if (move === 0) {
      // Collapse to a line, and reopen
      timeline
        .add("[data-saga=device]", { scaleY: [1, 0.012], duration: 6, ease: "in(3)" }, at - 10)
        .add("[data-saga=device]", { scaleY: [0.012, 1.06, 1], duration: 12, ease: "out(3)" }, at - 2);
    } else if (move === 1) {
      // Lose vertical hold: the picture rolls up and comes round from below
      timeline
        .add("[data-saga=device]", { translateY: ["0%", "-46%"], opacity: [1, 0], duration: 7, ease: "in(2)" }, at - 10)
        .add("[data-saga=device]", { translateY: ["46%", "-8%", "3%", "0%"], opacity: [0, 1, 1, 1], duration: 16, ease: "out(2)" }, at - 2);
    } else {
      // Skew out sideways, as if the signal tore
      timeline
        .add("[data-saga=device]", { skewX: [0, 24 * way], scaleX: [1, 1.3], opacity: [1, 0], duration: 7, ease: "in(2)" }, at - 10)
        .add("[data-saga=device]", { skewX: [-24 * way, 0], scaleX: [1.3, 1], opacity: [0, 1], duration: 12, ease: "out(3)" }, at - 2);
    }

    timeline
      // The white screen (it holds longer on the third move), then the colour bars collapse
      .add("[data-saga=p4-flash]", { opacity: [0, 1], duration: 3, ease: "linear" }, at - 8)
      .add("[data-saga=p4-flash]", { opacity: [1, 0], duration: move === 2 ? 14 : 8, ease: "linear" }, at - 3)
      .add("[data-saga=p4-bars]", { opacity: [0, 1], scaleY: [1, 1], duration: 2, ease: "linear" }, at - 5)
      .add("[data-saga=p4-bars]", { scaleY: [1, 0.02], duration: 7, ease: "in(3)" }, at - 1)
      .add("[data-saga=p4-bars]", { opacity: [1, 0], duration: 2, ease: "linear" }, at + 6)
      // The channel number shows, then fades
      .add("[data-saga=p4-osd]", { opacity: [0, 1], duration: 3 }, at + 4)
      .add("[data-saga=p4-osd]", { opacity: [1, 0], duration: 8 }, at + 30)
      // Flowers pop out round the set, then drift down and away
      .add("[data-saga=p4-flower]", { scale: [0, 1.25, 1], rotate: [-120 * way, 0], translateY: [0, 0], opacity: [1, 1], duration: 16, delay: stagger(2.4) }, at - 2)
      .add("[data-saga=p4-flower]", { translateY: [0, 70], rotate: [0, 90 * way], opacity: [1, 0], duration: 18, delay: stagger(1.5), ease: "in(2)" }, at + 20);
    rainbow(at - 4);
  });
}
