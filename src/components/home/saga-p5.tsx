"use client";

import { utils, type Timeline } from "animejs";

// Persona 5 days: the growth saga is on the Phantom Thief's smartphone, and the scenes are its apps.
//
// - The orbit is the phone's screen: a black handset with a white edge, a speaker, and a dock of
//   apps whose lit icon follows the scene. It is thrown in from below as the stage arrives.
// - Every app switch: the phone is shaken, spun or tossed (in turn), the app shrinks to a card in
//   the switcher and is swiped away between its neighbours, the next card slides in and opens, and
//   a red and black slash wipes across the screen.
// - Behind it, a jagged burst slams out and stars fly off on every switch.
//
// The scenes drawn on the screen are untouched. Everything is flat fills and transforms. P5 days
// square off `rounded-[..]` classes, so every round corner here is an inline border-radius.

const INK = "#0b0b0b";
const PAPER = "#f5f5f5";
const RED = "#e60012";
const DOCK = 5;

const spikes = (points: number, outer: number, inner: number) =>
  Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 ? inner : outer;
    const a = (i * Math.PI) / points;
    return `${(Math.sin(a) * r).toFixed(1)},${(-Math.cos(a) * r).toFixed(1)}`;
  }).join(" ");

const BURST = spikes(18, 100, 68);
const STAR = spikes(5, 50, 21);

// Where each star flies to, as a share of the stage's width and height from the centre
const STARS = [
  { x: -40, y: -30, size: "9%", color: PAPER },
  { x: 42, y: -34, size: "7%", color: INK },
  { x: 44, y: 18, size: "11%", color: PAPER },
  { x: -43, y: 24, size: "8%", color: INK },
  { x: 8, y: 42, size: "6%", color: PAPER },
];

// Behind the phone: the burst and the stars
export function P5Stage() {
  return (
    <div aria-hidden className="absolute inset-x-0 top-0 bottom-[var(--lift)] overflow-hidden pointer-events-none motion-reduce:hidden">
      <svg data-saga="p5-burst" viewBox="-104 -104 208 208" className="absolute left-1/2 top-1/2 w-[min(135vw,92svh)] aspect-square -ml-[min(67.5vw,46svh)] -mt-[min(67.5vw,46svh)] overflow-visible">
        <polygon points={BURST} fill={INK} stroke={PAPER} strokeWidth="2.5" strokeLinejoin="miter" />
        <polygon points={BURST} fill={RED} transform="scale(0.8) rotate(7)" />
      </svg>
      {STARS.map((s, i) => (
        <svg key={i} data-saga="p5-star" viewBox="-52 -52 104 104" className="absolute left-1/2 top-1/2 aspect-square" style={{ width: s.size, marginLeft: `calc(${s.size} / -2)`, marginTop: `calc(${s.size} / -2)` }}>
          <polygon points={STAR} fill={s.color} stroke={s.color === INK ? PAPER : INK} strokeWidth="5" strokeLinejoin="miter" />
        </svg>
      ))}
    </div>
  );
}

// The handset, behind the picture
export function P5PhoneBack({ scene }: { scene: number }) {
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none motion-reduce:hidden">
      {/* It buzzes while it is shaken */}
      {[-1, 1].map(side => (
        <svg key={side} data-saga="p5-buzz" viewBox="0 0 30 60" className="absolute top-[18%] w-[16%] h-[64%]" style={{ [side < 0 ? "right" : "left"]: "134%", transform: `scaleX(${side})` }} fill="none" stroke={PAPER} strokeWidth="4" strokeLinecap="square">
          <path d="M 4 14 L 12 30 L 4 46" />
          <path d="M 16 6 L 27 30 L 16 54" />
        </svg>
      ))}

      {/* Body, with the red shadow thrown behind it */}
      <div className="absolute -inset-x-[29%] -inset-y-[43%]" style={{ background: RED, borderRadius: "11% / 8%", transform: "translate(3.5%, 2%) rotate(2deg)" }} />
      <div className="absolute -inset-x-[29%] -inset-y-[43%]" style={{ background: INK, borderRadius: "11% / 8%", boxShadow: `inset 0 0 0 0.2em ${PAPER}` }} />

      {/* Speaker and camera */}
      <div className="absolute left-1/2 -top-[38.6%] w-[26%] h-[2.2%] -translate-x-1/2" style={{ background: PAPER, borderRadius: 99 }} />
      <div className="absolute left-[70%] -top-[39.5%] w-[4%] aspect-square" style={{ background: RED, borderRadius: "50%" }} />

      {/* The screen */}
      <div className="absolute -inset-x-[22%] -inset-y-[32%] bg-background" style={{ borderRadius: "5% / 3.5%", boxShadow: `0 0 0 0.14em ${RED}` }} />

      {/* The dock: the lit app is the scene on screen */}
      <div className="absolute -inset-x-[22%] -bottom-[40.5%] h-[6%] flex justify-center gap-[5%]">
        {Array.from({ length: DOCK }, (_, i) => {
          const lit = i === scene % DOCK;
          return (
            <span
              key={i}
              className="h-full aspect-square transition-[transform,background-color] duration-300"
              style={{ background: lit ? RED : "#3a3a3a", borderRadius: "22%", boxShadow: lit ? `0 0 0 0.12em ${PAPER}` : undefined, transform: `rotate(${lit ? -12 : i % 2 ? 4 : -4}deg) scale(${lit ? 1.25 : 1})` }}
            />
          );
        })}
      </div>
    </div>
  );
}

// The app's own card, which only shows in the app switcher. It sits inside `device`, so it
// shrinks and is swiped away with the picture.
export function P5AppCard() {
  return (
    <div data-saga="p5-frame" aria-hidden className="absolute -inset-x-[22%] -inset-y-[32%] pointer-events-none motion-reduce:hidden" style={{ background: "#1c1c1c", borderRadius: "6% / 4.5%", boxShadow: `inset 0 0 0 0.22em ${PAPER}, 0.5em 0.5em 0 ${RED}` }}>
      <span className="absolute left-[8%] top-[5%] w-[34%] h-[3.5%]" style={{ background: RED }} />
      <span className="absolute right-[8%] top-[5%] w-[8%] h-[3.5%]" style={{ background: PAPER }} />
    </div>
  );
}

// What passes over the picture: the neighbouring cards in the app switcher, and the slash
export function P5PhoneFront() {
  return (
    <div aria-hidden className="absolute -inset-x-[22%] -inset-y-[32%] overflow-hidden pointer-events-none motion-reduce:hidden" style={{ borderRadius: "5% / 3.5%" }}>
      <div data-saga="p5-cards" className="absolute inset-0">
        {[-1, 1].map(side => (
          <div key={side} className="absolute inset-y-[19%] w-[62%]" style={{ left: `${19 + side * 70}%`, background: side < 0 ? PAPER : RED, borderRadius: "6%", boxShadow: `inset 0 0 0 0.18em ${side < 0 ? INK : PAPER}`, transform: `rotate(${side * 3}deg)` }}>
            <span className="absolute left-[12%] top-[10%] w-[40%] h-[5%]" style={{ background: side < 0 ? INK : PAPER }} />
            <span className="absolute left-[12%] top-[20%] w-[62%] h-[3%] opacity-60" style={{ background: side < 0 ? INK : PAPER }} />
            <span className="absolute left-[12%] top-[27%] w-[50%] h-[3%] opacity-60" style={{ background: side < 0 ? INK : PAPER }} />
          </div>
        ))}
      </div>
      <div data-saga="p5-wipe" className="absolute -inset-y-[10%] -inset-x-[20%] flex" style={{ transform: "translateX(-130%)" }}>
        <span className="h-full w-[18%] -skew-x-[18deg]" style={{ background: PAPER }} />
        <span className="h-full flex-1 -skew-x-[18deg] -ml-px" style={{ background: RED }} />
        <span className="h-full w-[30%] -skew-x-[18deg] -ml-px" style={{ background: INK }} />
      </div>
    </div>
  );
}

// The moves, added to the saga's scroll script. `froms` are the moments each scene takes the stage
// (the first is the opening, so app switches start from the second). Times are in the script's
// units (svh of scroll), like everything else in it.
export function addP5Script(timeline: Timeline, froms: number[]) {
  utils.set("[data-saga=p5-frame], [data-saga=p5-cards], [data-saga=p5-buzz], [data-saga=p5-burst], [data-saga=p5-star]", { opacity: 0 });
  const stars = utils.$("[data-saga=p5-star]");

  // The burst slams out behind the phone and the stars fly off; both fade a little later
  const impact = (at: number, way: number) => {
    timeline
      .add("[data-saga=p5-burst]", { opacity: [0, 1], scale: [0, 1.15, 1], rotate: [-50 * way, 0], duration: 12, ease: "out(3)" }, at)
      .add("[data-saga=p5-burst]", { opacity: [1, 0], scale: [1, 1.25], rotate: [0, 14 * way], duration: 16, ease: "in(2)" }, at + 22);
    stars.forEach((star, i) => {
      const to = STARS[i];
      timeline
        .add(star, { opacity: [0, 1], translateX: ["0vw", `${to.x}vw`], translateY: ["0svh", `${to.y}svh`], rotate: [0, 300 * way * (i % 2 ? -1 : 1)], scale: [0.2, 1], duration: 16, ease: "out(3)" }, at + 1 + i)
        .add(star, { opacity: [1, 0], scale: [1, 0.4], duration: 12, ease: "in(2)" }, at + 24 + i);
    });
  };

  // The opening: the phone is thrown in from below, the slash crosses the screen as it wakes
  timeline
    .add("[data-saga=rig]", { translateY: ["130%", "0%"], rotate: [-28, 7, -3, 0], duration: 28, ease: "out(3)" }, 0)
    .add("[data-saga=p5-wipe]", { translateX: ["-130%", "130%"], duration: 14, ease: "inOut(2)" }, 12);
  impact(10, 1);

  froms.slice(1).forEach((at, i) => {
    const way = i % 2 ? -1 : 1;
    const move = i % 3;

    // The phone itself: three moves in turn
    if (move === 0) {
      // Shaken
      timeline
        .add("[data-saga=rig]", { rotate: [0, -11, 10, -8, 6, -3, 0], translateX: [0, -16, 14, -10, 7, -3, 0], duration: 18, ease: "linear" }, at - 19)
        .add("[data-saga=p5-buzz]", { opacity: [0, 1, 0.2, 1, 0.2, 1, 0], duration: 18, ease: "linear" }, at - 19);
    } else if (move === 1) {
      // Spun round in the hand
      timeline
        .add("[data-saga=rig]", { rotate: [0, 360 * way], duration: 18, ease: "inOut(3)" }, at - 17)
        .add("[data-saga=rig]", { scale: [1, 0.8, 1], duration: 18, ease: "inOut(2)" }, at - 17);
    } else {
      // Tossed up and caught
      timeline.add("[data-saga=rig]", { translateY: ["0%", "-20%", "0%", "3%", "0%"], rotate: [0, -14 * way, 0, 3 * way, 0], duration: 22, ease: "inOut(2)" }, at - 17);
    }

    timeline
      // The app switcher: the app shrinks to a card, is swiped away, and the next one opens
      .add("[data-saga=device]", { scale: [1, 0.62], duration: 6, ease: "inOut(2)" }, at - 13)
      .add("[data-saga=device]", { translateX: ["0%", `${-150 * way}%`], duration: 6, ease: "in(2)" }, at - 7)
      .add("[data-saga=device]", { translateX: [`${150 * way}%`, "0%"], duration: 7, ease: "out(3)" }, at - 1)
      .add("[data-saga=device]", { scale: [0.62, 1.04, 1], duration: 8, ease: "out(2)" }, at + 6)
      .add("[data-saga=p5-frame]", { opacity: [0, 1], duration: 4, ease: "linear" }, at - 13)
      .add("[data-saga=p5-frame]", { opacity: [1, 0], duration: 6, ease: "linear" }, at + 8)
      .add("[data-saga=p5-cards]", { opacity: [0, 1], duration: 4, ease: "linear" }, at - 13)
      .add("[data-saga=p5-cards]", { translateX: [`${26 * way}%`, `${-26 * way}%`], duration: 21, ease: "inOut(2)" }, at - 13)
      .add("[data-saga=p5-cards]", { opacity: [1, 0], duration: 5, ease: "linear" }, at + 6)
      // The slash across the screen
      .add("[data-saga=p5-wipe]", { translateX: [`${-130 * way}%`, `${130 * way}%`], duration: 13, ease: "inOut(2)" }, at - 6);
    impact(at - 6, way);
  });
}
