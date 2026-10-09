"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { animate, createScope, createTimeline, onScroll, stagger, utils, type AnimationParams } from "animejs";
import {
  ArrowDown, ArrowRight, Bot, Calendar, Check, CheckSquare, Database, FileText, Flame, Github, KeyRound, Lock,
  Moon, Shield, Sparkles, TrendingUp, Tv, UserRound, VenetianMask, WifiOff, Zap, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { prefersReducedMotion } from "@/lib/scroll-fx";
import { useMounted } from "@/lib/use-mounted";
import { RPG_TITLES } from "@/lib/constants";
import { RankCrest } from "@/lib/rank-icons";
import { APP_VERSION, CREATOR_URL, REPO_URL } from "@/lib/version";
import "./landing.css";

// The front door, as one pinned scroll sequence (the same idea as the home page's Growth Orbit).
// The stage holds still while the page scrolls underneath it, and a single anime.js script, tied
// to the scroll position, flies each feature in as a 3D prop built from the app's own cards,
// plays it, and flies it out again: a calendar lying in space with its busy days lifting off,
// a stack of note sheets, habit tokens that flip, ranks on a turning carousel, a quest card that
// turns over, two doors, a hand of Persona cards. Scrolling back rewinds all of it.
//
// One prop is on stage at a time and the others are hidden outright, which keeps the number of
// live 3D layers small on phones. With reduced motion there is no stage: the sections are a list.

type SceneId = "top" | "calendar" | "notes" | "habits" | "seasons" | "guide" | "privacy" | "themes" | "version";

const FEATURES: { id: Exclude<SceneId, "top" | "version">; label: string; icon: LucideIcon; number: string; eyebrow: string; title: string; body: string; points: string[]; side: "left" | "right" }[] = [
  {
    id: "calendar", label: "Calendar", icon: Calendar, number: "01", eyebrow: "Calendar", title: "Every day accounted for", side: "right",
    body: "Tasks, events and special days share one calendar. Finish a task and it earns XP; show up to an event and it does too.",
    points: ["Side, main and epic quests, each worth more", "Yearly repeats and holidays filled in for you", "Reminders for the things with a time on them"],
  },
  {
    id: "notes", label: "Notes", icon: FileText, number: "02", eyebrow: "Notes", title: "A line a day", side: "left",
    body: "A journal that asks for one line, not a page. Tag the day's mood and watch a month of them turn into a pattern.",
    points: ["Saves as you type", "Every line is XP for your mind", "What you wrote on this day in years past"],
  },
  {
    id: "habits", label: "Habits", icon: CheckSquare, number: "03", eyebrow: "Habits", title: "Streaks that mean something", side: "right",
    body: "Pick the days each habit belongs to and tick it off. Checks build streaks, streaks build vitality, and yesterday's gaps are flagged before they pile up.",
    points: ["Per-habit schedules, icons and colours", "A seven-day view on the home page", "Archive a habit without losing its history"],
  },
  {
    id: "seasons", label: "Seasons", icon: TrendingUp, number: "04", eyebrow: "Seasons", title: "Each month is a season", side: "left",
    body: "Everything you do earns XP in one of five stats. Level up to climb ten ranks and the whole app changes its look as you rise. Then the month ends and you earn it again.",
    points: ["Race last month's pace, day by day", "Five eras that reshape the interface", "A season recap and a Hall of Fame"],
  },
  {
    id: "guide", label: "AI guide", icon: Bot, number: "05", eyebrow: "AI guide · optional", title: "A quest written for you", side: "right",
    body: "Connect your own Gemini, Claude or Groq key and each morning brings a smart mission, a preparation tip and a way to unwind, all building charisma. No key? The same cards arrive from a built-in set.",
    points: ["Your key, stored encrypted, used only for you", "Offline missions that don't repeat for weeks", "Ask the Taskmaster about your own history"],
  },
  {
    id: "privacy", label: "Privacy", icon: Shield, number: "06", eyebrow: "Privacy", title: "Yours, either way", side: "left",
    body: "Sign in with Google and your planner is private to your account. Or take the code and run the whole thing on your own database.",
    points: ["No password to remember, none stored", "See and sign out every device", "Open source, top to bottom"],
  },
  {
    id: "themes", label: "Themes", icon: Sparkles, number: "07", eyebrow: "Themes", title: "Some days it dresses up", side: "right",
    body: "Six days a month, if you switch them on, the app turns into Persona 3, 4 or 5: fonts, menus, ceremonies, even the AI's voice. Light by day and dark by night the rest of the time.",
    points: ["Persona days: a full takeover, never the same dates twice", "Ranks and eras restyle everything as you level", "Special days are next"],
  },
];

const SCENES: { id: SceneId; label: string }[] = [
  { id: "top", label: "Start" },
  ...FEATURES.map(f => ({ id: f.id as SceneId, label: f.label })),
  { id: "version", label: "Version" },
];

// The script's clock. The opening leaves by HERO_OUT; after that a scene starts every STEP,
// plays for a little longer than that, and overlaps the next one's arrival.
const FIRST_AT = 60;
const STEP = 90;
const sceneStart = (index: number) => (index === 0 ? 0 : FIRST_AT + (index - 1) * STEP);
// Where a scene is at rest, for the dots to jump to
const sceneRest = (index: number) => (index === 0 ? 0 : sceneStart(index) + 52);
const SCROLL_PER_UNIT = 1.25; // vh of scrolling per unit of script

const LABEL = "text-caption font-mono font-semibold uppercase tracking-[0.12em]";
const CTA = cn(LABEL, "inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-tm-yellow text-tm-purple-dark text-sm transition-transform hover:scale-[1.03] active:scale-95");
const BOARD = "tm-card tm-board relative border border-tm-blue-gray/10 dark:border-white/10";

const subscribeReducedMotion = (onChange: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

// Repeatable "random" numbers, so the title's letters scatter the same way every time
const scatter = (i: number, salt: number, spread: number) => Math.sin(i * 12.9898 + salt * 78.233) * spread;

export default function Landing() {
  const reduced = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);
  const mounted = useMounted();
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const total = useRef(1);
  const [active, setActive] = useState(0);

  useLayoutEffect(() => {
    const el = root.current;
    const trackEl = track.current;
    if (!el || !trackEl || reduced) return;

    const layers = SCENES.map(scene => el.querySelector<HTMLElement>(`[data-scene="${scene.id}"]`));
    const within = (id: SceneId) => (selector: string) => Array.from(el.querySelectorAll<HTMLElement>(`[data-scene="${id}"] ${selector}`));
    let shown = -1;

    // Only the scene on stage (and its neighbour mid-handover) is drawn or clickable
    const stage = (time: number) => {
      let current = 0;
      layers.forEach((layer, i) => {
        if (!layer) return;
        const from = sceneStart(i) - 1;
        const until = i === 0 ? FIRST_AT + 12 : i === SCENES.length - 1 ? Infinity : sceneStart(i) + STEP + 12;
        const on = time >= from && time <= until;
        layer.style.visibility = on ? "visible" : "hidden";
        // Clickable only while it is at rest, not while flying in or out
        const settled = i === 0 ? time <= 22 : time >= from + 22 && (i === SCENES.length - 1 || time <= from + 80);
        layer.style.pointerEvents = on && settled ? "auto" : "none";
        if (time >= from + 1) current = i;
      });
      if (current !== shown) { shown = current; setActive(current); }
      if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, time / total.current)})`;
    };

    const scope = createScope({ root: el }).add(() => {
      // The opening writes itself in once, without waiting for a scroll
      animate("[data-intro=letter]", { opacity: [0, 1], translateY: [56, 0], rotate: [12, 0], duration: 900, delay: stagger(55), ease: "out(4)" });
      animate("[data-intro=rise]", { opacity: [0, 1], translateY: [22, 0], duration: 800, delay: stagger(130, { start: 550 }), ease: "out(3)" });
      animate("[data-intro=cue]", { translateY: [0, 8], duration: 900, loop: true, alternate: true, ease: "inOut(2)" });

      // A timeline only applies a tween's starting values once it reaches it, so hide the later beats up front
      utils.set("[data-line], [data-title], [data-obj], [data-x], [data-row]", { opacity: 0 });
      utils.set("[data-grow]", { scaleX: 0 });
      utils.set("[data-card]", { translateY: "110%" });

      const timeline = createTimeline({
        defaults: { ease: "out(3)" },
        autoplay: onScroll({ target: trackEl, enter: "top top", leave: "bottom bottom", sync: 0.8 }),
        onUpdate: ({ currentTime }) => stage(currentTime),
      });
      const add = (targets: HTMLElement[], params: AnimationParams, at: number) => {
        if (targets.length) timeline.add(targets, params, at);
      };

      // ── Opening: the title's letters blow apart and the rest lifts away
      const top = within("top");
      top("[data-letter]").forEach((letter, i) => {
        add([letter], {
          translateX: [0, scatter(i, 1, 520)], translateY: [0, -220 + scatter(i, 2, 260)], translateZ: [0, 300 + scatter(i, 3, 300)],
          rotate: [0, scatter(i, 4, 140)], opacity: [1, 0], duration: 40, ease: "in(2)",
        }, 14 + i * 1.3);
      });
      add(top("[data-hero-line]"), { opacity: [1, 0], translateY: [0, -70], duration: 26, delay: stagger(2), ease: "in(2)" }, 14);

      // ── What every feature scene shares: its words, and its prop fading up and away.
      // The prop's fades are kept short: a 3D prop is flattened while it is see-through.
      SCENES.forEach((scene, i) => {
        if (i === 0) return;
        const at = sceneStart(i);
        const q = within(scene.id);
        const last = i === SCENES.length - 1;
        add(q("[data-title]"), { opacity: [0, 1], rotateX: [-85, 0], translateY: [40, 0], duration: 22, ease: "out(4)" }, at + 6);
        add(q("[data-line]"), { opacity: [0, 1], translateY: [40, 0], duration: 16, delay: stagger(3) }, at + 10);
        add(q("[data-obj]"), { opacity: [0, 1], duration: 9, ease: "linear" }, at);
        if (last) return;
        add(q("[data-title]"), { opacity: [1, 0], rotateX: [0, 70], translateY: [0, -40], duration: 14, ease: "in(2)" }, at + 78);
        add(q("[data-line]"), { opacity: [1, 0], translateY: [0, -40], duration: 12, delay: stagger(1.5), ease: "in(2)" }, at + 78);
        add(q("[data-obj]"), { opacity: [1, 0], duration: 9, ease: "linear" }, at + STEP + 1);
      });

      // ── Calendar: a month lying in space, sliding in from the corner. The busy days lift off
      // its surface like pins, today highest, then it tips up and leaves over the top.
      {
        const at = sceneStart(1);
        const q = within("calendar");
        add(q("[data-obj]"), { translateX: ["-55%", "0%"], translateY: ["65%", "0%"], rotateX: [80, 58], rotateZ: [-46, -22], duration: 34 }, at);
        add(q("[data-pin]"), { translateZ: [0, 46], duration: 16, delay: stagger(2.2), ease: "out(4)" }, at + 24);
        add(q("[data-today]"), { translateZ: [0, 110], scale: [1, 1.3], duration: 20, ease: "out(4)" }, at + 30);
        add(q("[data-obj]"), { rotateX: [58, 50], rotateZ: [-22, -12], duration: 42, ease: "linear" }, at + 34);
        add(q("[data-today]"), { translateZ: [110, 0], scale: [1.3, 1], duration: 10, ease: "in(2)" }, at + 68);
        add(q("[data-pin]"), { translateZ: [46, 0], duration: 10, delay: stagger(0.6), ease: "in(2)" }, at + 68);
        add(q("[data-obj]"), { translateX: ["0%", "-20%"], translateY: ["0%", "-150%"], rotateX: [50, 86], rotateZ: [-12, 16], duration: 24, ease: "in(2)" }, at + 76);
      }

      // ── Notes: three sheets drop onto a tilted stack, the top one is written on, then they
      // are dealt off to the side one at a time
      {
        const at = sceneStart(2);
        const q = within("notes");
        add(q("[data-obj]"), { rotateY: [-58, -24], rotateX: [22, 10], translateX: ["60%", "0%"], duration: 30 }, at);
        const sheets = q("[data-sheet]");
        sheets.forEach((sheet, i) => {
          const lean = -8 + i * 7;
          add([sheet], { translateY: ["-170%", "0%"], translateZ: [i * 30, i * 30], rotateZ: [lean - 30, lean], duration: 26 }, at + 4 + i * 6);
          add([sheet], { translateX: ["0%", "190%"], rotateZ: [lean, lean + 28], duration: 18, ease: "in(2)" }, at + 72 + (sheets.length - 1 - i) * 5);
        });
        add(q("[data-row]"), { opacity: [0, 1], translateX: [-26, 0], duration: 10, delay: stagger(4.5) }, at + 34);
        add(q("[data-x]"), { opacity: [0, 1], scale: [0.4, 1], duration: 10, delay: stagger(2) }, at + 54);
      }

      // ── Habits: a board swings in on its edge and the week's tokens flip over, one by one
      {
        const at = sceneStart(3);
        const q = within("habits");
        add(q("[data-obj]"), { translateX: ["-80%", "0%"], rotateY: [78, 26], rotateX: [0, 8], duration: 32 }, at);
        add(q("[data-flip]"), { rotateY: [0, 180], duration: 14, delay: stagger(1.7), ease: "inOut(2)" }, at + 26);
        add(q("[data-obj]"), { rotateY: [26, 12], duration: 42, ease: "linear" }, at + 32);
        add(q("[data-x]"), { opacity: [0, 1], scale: [0.3, 1], duration: 10, delay: stagger(4) }, at + 56);
        add(q("[data-obj]"), { translateX: ["0%", "-110%"], rotateY: [12, -84], duration: 24, ease: "in(2)" }, at + 76);
      }

      // ── Seasons: the ten ranks stand in a ring that turns, rank after rank passing the front,
      // while the season's XP fills. It leaves by flying straight through the viewer.
      {
        const at = sceneStart(4);
        const q = within("seasons");
        add(q("[data-obj]"), { scale: [0.3, 1], rotateY: [120, 0], translateY: ["45%", "0%"], duration: 30 }, at);
        add(q("[data-obj]"), { rotateY: [0, -252], duration: 46, ease: "inOut(2)" }, at + 30);
        add(q("[data-grow]"), { scaleX: [0, 1], duration: 46, ease: "inOut(2)" }, at + 30);
        add(q("[data-x]"), { opacity: [0, 1], translateY: [16, 0], duration: 12, delay: stagger(3) }, at + 22);
        add(q("[data-x]"), { opacity: [1, 0], duration: 10, ease: "linear" }, at + 78);
        add(q("[data-obj]"), { scale: [1, 2.6], rotateY: [-252, -300], duration: 22, ease: "in(3)" }, at + 76);
      }

      // ── AI guide: a quest card rises, then turns over to show the quest you get with no AI at all
      {
        const at = sceneStart(5);
        const q = within("guide");
        add(q("[data-obj]"), { translateY: ["90%", "0%"], rotateY: [-46, 0], rotateX: [34, 6], duration: 30 }, at);
        add(q("[data-x]"), { opacity: [0, 1], scale: [0.3, 1], duration: 10, delay: stagger(3) }, at + 26);
        add(q("[data-obj]"), { rotateY: [0, 180], duration: 24, ease: "inOut(3)" }, at + 42);
        add(q("[data-x]"), { opacity: [1, 0], duration: 8, ease: "linear" }, at + 76);
        add(q("[data-obj]"), { translateY: ["0%", "-150%"], rotateX: [6, -46], duration: 24, ease: "in(2)" }, at + 76);
      }

      // ── Privacy: two doors swing shut into place, a lock drops between them, and both sink away
      {
        const at = sceneStart(6);
        const q = within("privacy");
        add(q("[data-door=left]"), { rotateY: [-112, 0], duration: 28, ease: "out(4)" }, at);
        add(q("[data-door=right]"), { rotateY: [112, 0], duration: 38, ease: "out(4)" }, at);
        add(q("[data-x]"), { opacity: [0, 1], translateY: [-60, 0], scale: [1.6, 1], duration: 14, ease: "out(4)" }, at + 36);
        add(q("[data-x]"), { opacity: [1, 0], duration: 8, ease: "linear" }, at + 74);
        add(q("[data-door]"), { translateZ: [0, -700], translateY: ["0%", "40%"], duration: 24, delay: stagger(3), ease: "in(2)" }, at + 76);
      }

      // ── Themes: a hand of three cards fans open, each lifts in turn, then they are thrown
      {
        const at = sceneStart(7);
        const q = within("themes");
        q("[data-card]").forEach((card, i) => {
          const spread = (i - 1) * 19;
          add([card], { translateY: ["110%", "0%"], rotateZ: [0, spread], duration: 28, ease: "out(4)" }, at + 2 + i * 4);
          add([card], { translateY: ["0%", "-12%", "0%"], duration: 16, ease: "inOut(2)" }, at + 38 + i * 9);
          add([card], { translateX: ["0%", `${(i - 1) * 190}%`], translateY: ["0%", "-170%"], rotateZ: [spread, (i - 1) * 80], duration: 22, ease: "in(2)" }, at + 76 + i * 2);
        });
        add(q("[data-x]"), { opacity: [0, 1], scale: [0.3, 1], duration: 10, delay: stagger(2) }, at + 30);
        add(q("[data-x]"), { opacity: [1, 0], duration: 8, ease: "linear" }, at + 76);
      }

      // ── Version: the number arrives from far away and stays
      {
        const at = sceneStart(8);
        const q = within("version");
        add(q("[data-obj]"), { scale: [0.15, 1], translateZ: [-900, 0], duration: 34, ease: "out(4)" }, at);
        add(q("[data-x]"), { opacity: [0, 1], translateY: [20, 0], duration: 12, delay: stagger(4) }, at + 30);
      }

      total.current = timeline.duration;
      stage(0);
    });

    return () => {
      scope.revert();
      layers.forEach(layer => { if (layer) { layer.style.visibility = ""; layer.style.pointerEvents = ""; } });
    };
  }, [reduced]);

  // Keep the dots honest in the plain (reduced motion) layout too
  useEffect(() => {
    const el = root.current;
    if (!el || !reduced) return;
    const observer = new IntersectionObserver(
      entries => entries.forEach(entry => {
        if (entry.isIntersecting) setActive(SCENES.findIndex(s => s.id === entry.target.getAttribute("data-scene")));
      }),
      { rootMargin: "-45% 0px -45% 0px" }
    );
    el.querySelectorAll("[data-scene]").forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, [reduced]);

  function goTo(index: number) {
    if (reduced) {
      root.current?.querySelector(`[data-scene="${SCENES[index].id}"]`)?.scrollIntoView();
      return;
    }
    const trackEl = track.current;
    if (!trackEl) return;
    const top = trackEl.getBoundingClientRect().top + window.scrollY;
    const travel = trackEl.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + (sceneRest(index) / total.current) * travel, behavior: "smooth" });
  }

  const chrome = mounted && createPortal(
    // Fixed chrome goes straight into <body>: the page transition wrapper is transformed while
    // it plays, and position: fixed would be measured against it
    <>
      <div className="fixed top-0 inset-x-0 z-50 h-0.5 pointer-events-none">
        <div ref={bar} className="h-full origin-left bg-tm-yellow" style={{ transform: "scaleX(0)" }} />
      </div>
      <header className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-5 py-3 md:px-8">
        <button onClick={() => goTo(0)} className="font-display font-bold tracking-tight uppercase text-tm-purple-dark dark:text-tm-yellow">TaskMaster</button>
        <Link href="/login" className={cn(LABEL, "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-tm-yellow text-tm-purple-dark transition-transform hover:scale-[1.04] active:scale-95")}>
          Sign in <ArrowRight size={14} />
        </Link>
      </header>
      <nav aria-label="Sections" className="hidden md:flex fixed right-5 top-1/2 -translate-y-1/2 z-40 flex-col gap-3">
        {SCENES.map((scene, i) => (
          <button key={scene.id} onClick={() => goTo(i)} aria-label={scene.label} aria-current={active === i} className="group flex items-center justify-end gap-3">
            <span className={cn(LABEL, "transition-opacity", active === i ? "opacity-100 text-foreground" : "opacity-0 group-hover:opacity-100 text-tm-blue-gray")}>{scene.label}</span>
            <span className={cn("block rounded-full transition-all", active === i ? "w-2.5 h-2.5 bg-tm-yellow" : "w-1.5 h-1.5 bg-tm-blue-gray/40 group-hover:bg-tm-blue-gray")} />
          </button>
        ))}
      </nav>
    </>,
    document.body
  );

  if (reduced) {
    return (
      <div ref={root} className="flex-1">
        {chrome}
        <PlainLanding />
      </div>
    );
  }

  return (
    <div ref={root} className="flex-1">
      {chrome}
      <div ref={track} style={{ height: `${(sceneStart(SCENES.length - 1) + 60) * SCROLL_PER_UNIT}vh` }}>
        <div className="sticky top-0 h-[100svh] overflow-hidden">

          {/* Opening */}
          <div data-scene="top" className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <div className="space-y-7 max-w-4xl [perspective:1200px]">
              <div data-intro="rise"><p data-hero-line className={cn(LABEL, "text-tm-blue-gray")}>Your personal planner</p></div>
              <h1 aria-label="TaskMaster" className="tm-3d text-[15vw] leading-none md:text-9xl font-display font-bold tracking-tight uppercase text-tm-purple-dark dark:text-tm-yellow">
                {"TaskMaster".split("").map((letter, i) => (
                  <span key={i} aria-hidden data-intro="letter" className="tm-3d inline-block"><span data-letter className="inline-block">{letter}</span></span>
                ))}
              </h1>
              <div data-intro="rise"><p data-hero-line className="max-w-xl mx-auto text-base md:text-xl font-medium text-tm-blue-gray">Habits, notes and a calendar that turn your month into a season worth winning.</p></div>
              <div data-intro="rise"><div data-hero-line><Link href="/login" className={CTA}>Sign in <ArrowRight size={18} /></Link></div></div>
            </div>
            <div data-intro="rise" className="absolute bottom-8 inset-x-0 flex justify-center">
              <button data-hero-line onClick={() => goTo(1)} className={cn(LABEL, "flex flex-col items-center gap-2 text-tm-blue-gray")}>
                Scroll for more
                <span data-intro="cue"><ArrowDown size={16} /></span>
              </button>
            </div>
          </div>

          {/* Calendar: lying in the bottom corner, cropped by the edge of the screen */}
          <FeatureScene feature={FEATURES[0]}>
            <div className="absolute left-[-24vw] bottom-[-6svh] w-[150vw] md:left-[-7vw] md:bottom-[-16vh] md:w-[60vw] max-w-[940px] [perspective:1600px]">
              <div data-obj className={cn(BOARD, "tm-board-3d p-4 md:p-7")}>
                <CardFx />
                <CalendarProp />
              </div>
            </div>
          </FeatureScene>

          {/* Notes */}
          <FeatureScene feature={FEATURES[1]}>
            <div className="absolute right-[4vw] bottom-[5svh] w-[70vw] md:right-[9vw] md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:w-[30vw] max-w-[420px] [perspective:1400px]">
              <div data-obj className="tm-3d relative aspect-[4/5]">
                <NotesProp />
              </div>
            </div>
          </FeatureScene>

          {/* Habits */}
          <FeatureScene feature={FEATURES[2]}>
            <div className="absolute left-[5vw] bottom-[6svh] w-[90vw] md:left-[7vw] md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:w-[36vw] max-w-[520px] [perspective:1400px]">
              <div data-obj className={cn(BOARD, "tm-board-3d p-4 md:p-6")}>
                <CardFx />
                <HabitsProp />
              </div>
            </div>
          </FeatureScene>

          {/* Seasons */}
          <FeatureScene feature={FEATURES[3]}>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[9svh] md:left-auto md:translate-x-0 md:right-[13vw] md:bottom-auto md:top-1/2 md:-translate-y-1/2 w-[150px] md:w-[180px]">
              <SeasonsProp />
            </div>
          </FeatureScene>

          {/* AI guide */}
          <FeatureScene feature={FEATURES[4]}>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[7svh] w-[84vw] md:left-[9vw] md:translate-x-0 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:w-[32vw] max-w-[440px]">
              <GuideProp />
            </div>
          </FeatureScene>

          {/* Privacy */}
          <FeatureScene feature={FEATURES[5]}>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[7svh] w-[90vw] md:left-auto md:translate-x-0 md:right-[8vw] md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:w-[38vw] max-w-[540px]">
              <PrivacyProp />
            </div>
          </FeatureScene>

          {/* Themes */}
          <FeatureScene feature={FEATURES[6]}>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[10svh] md:left-[23vw] md:bottom-auto md:top-1/2 md:-translate-y-1/2 w-[150px] md:w-[200px]">
              <ThemesProp />
            </div>
          </FeatureScene>

          {/* Version */}
          <div data-scene="version" className="invisible absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <div className="space-y-7 max-w-2xl [perspective:1200px]">
              <p data-line className={cn(LABEL, "text-tm-blue-gray")}>Version</p>
              <p data-obj className="text-7xl md:text-9xl font-display font-bold tracking-tight text-tm-purple-dark dark:text-tm-yellow">{APP_VERSION}</p>
              <p data-x className="text-base md:text-lg font-medium text-tm-blue-gray">Accounts, your own AI key and this front door are new in this one. Made by Pinaki, also known as PiX.</p>
              <div data-x><Link href="/login" className={CTA}>Start your season <ArrowRight size={18} /></Link></div>
              <VersionLinks />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared pieces ────────────────────────────────────────────────────────────

// The decorative layer every in-app card carries (edge light, ring, corners), minus the sweep
function CardFx() {
  return (
    <span aria-hidden className="tm-card-fx">
      <span className="tm-card-edge" />
      <span className="tm-card-ring" />
      <span className="tm-card-corners"><span /></span>
    </span>
  );
}

function FeatureCopy({ feature, staged }: { feature: (typeof FEATURES)[number]; staged: boolean }) {
  const Icon = feature.icon;
  return (
    <>
      <p data-line className={cn(LABEL, "flex items-center gap-3 text-tm-blue-gray")}>
        <span className="text-tm-yellow">{feature.number}</span>
        <span className="h-px w-8 bg-tm-blue-gray/30" />
        <Icon size={14} /> {feature.eyebrow}
      </p>
      <h2 data-title className="origin-bottom text-4xl md:text-6xl font-display font-bold tracking-tight uppercase leading-[1.05] text-tm-purple-dark dark:text-tm-yellow">{feature.title}</h2>
      <p data-line className="text-sm md:text-lg font-medium text-tm-blue-gray max-w-lg">{feature.body}</p>
      {/* On a phone the stage is short: the points give way to the prop */}
      <ul className={cn("space-y-2.5 pt-1", staged && "hidden md:block")}>
        {feature.points.map(point => (
          <li key={point} data-line className="flex items-start gap-3 text-sm font-medium text-foreground/80">
            <Check size={16} className="text-tm-yellow shrink-0 mt-0.5" />
            {point}
          </li>
        ))}
      </ul>
    </>
  );
}

// One feature on the stage: its words on one side, its prop (the children) placed by the caller
function FeatureScene({ feature, children }: { feature: (typeof FEATURES)[number]; children: React.ReactNode }) {
  return (
    <div data-scene={feature.id} className="invisible absolute inset-0">
      <div className={cn(
        "absolute top-20 inset-x-6 space-y-3 md:space-y-5 [perspective:900px]",
        "md:top-1/2 md:-translate-y-1/2 md:inset-x-auto md:w-[36vw] md:max-w-xl",
        feature.side === "right" ? "md:right-[9vw]" : "md:left-[8vw]"
      )}>
        <FeatureCopy feature={feature} staged />
      </div>
      {children}
    </div>
  );
}

function VersionLinks() {
  return (
    <div data-x className={cn(LABEL, "flex flex-wrap items-center justify-center gap-6 text-tm-blue-gray")}>
      <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-foreground transition-colors"><Github size={14} /> Source</a>
      <a href={CREATOR_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-foreground transition-colors"><UserRound size={14} /> Creator</a>
    </div>
  );
}

// With reduced motion: the same words as a plain page, no stage and no props in flight
function PlainLanding() {
  return (
    <>
      <section data-scene="top" className="min-h-[100svh] flex flex-col items-center justify-center px-6 pt-20 pb-10 text-center space-y-7">
        <p className={cn(LABEL, "text-tm-blue-gray")}>Your personal planner</p>
        <h1 className="text-[15vw] leading-none md:text-9xl font-display font-bold tracking-tight uppercase text-tm-purple-dark dark:text-tm-yellow">TaskMaster</h1>
        <p className="max-w-xl mx-auto text-base md:text-xl font-medium text-tm-blue-gray">Habits, notes and a calendar that turn your month into a season worth winning.</p>
        <Link href="/login" className={CTA}>Sign in <ArrowRight size={18} /></Link>
      </section>
      {FEATURES.map(feature => (
        <section key={feature.id} data-scene={feature.id} className="px-6 py-16 md:px-16">
          <div className="max-w-3xl mx-auto space-y-5">
            <FeatureCopy feature={feature} staged={false} />
          </div>
        </section>
      ))}
      <section data-scene="version" className="px-6 py-24 text-center space-y-7">
        <p className={cn(LABEL, "text-tm-blue-gray")}>Version</p>
        <p className="text-7xl md:text-9xl font-display font-bold tracking-tight text-tm-purple-dark dark:text-tm-yellow">{APP_VERSION}</p>
        <div><Link href="/login" className={CTA}>Start your season <ArrowRight size={18} /></Link></div>
        <VersionLinks />
      </section>
    </>
  );
}

// ─── The props ────────────────────────────────────────────────────────────────

// Day of month → what is on it
const CALENDAR_MARKS: Record<number, string[]> = {
  3: ["task"], 6: ["event"], 12: ["special"], 14: ["task"], 17: ["task", "event"],
  20: ["event"], 23: ["task"], 26: ["task", "event"], 29: ["special"],
};
const MARK_COLOR: Record<string, string> = { task: "bg-tm-yellow", event: "bg-tm-orange-light", special: "bg-tm-red" };
const TODAY = 9;

function CalendarProp() {
  return (
    <>
      <div className="flex items-center justify-between mb-3 md:mb-5">
        <p className="font-display font-bold text-xl md:text-3xl uppercase text-tm-purple-dark dark:text-tm-yellow">October</p>
        <p className={cn(LABEL, "text-tm-blue-gray")}>3 quests today</p>
      </div>
      <div className="tm-3d grid grid-cols-7 gap-1.5 md:gap-2.5">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
          <span key={day} className={cn(LABEL, "text-center text-tm-blue-gray/60 pb-1")}>{day}</span>
        ))}
        {Array.from({ length: 35 }, (_, i) => {
          const day = i - 2; // the month starts on a Thursday
          const inMonth = day >= 1 && day <= 31;
          const marks = CALENDAR_MARKS[day];
          const today = day === TODAY;
          return (
            <div key={i} data-pin={marks && !today ? "" : undefined} data-today={today ? "" : undefined} className={cn(
              "aspect-[5/4] rounded-xl flex flex-col items-center justify-center gap-1 text-sm md:text-lg font-bold border",
              !inMonth ? "border-transparent text-tm-blue-gray/20"
                : today ? "bg-tm-orange-dark border-tm-orange-dark text-white shadow-lg shadow-tm-orange-dark/30"
                  : marks ? "bg-background border-tm-yellow/40 text-foreground shadow-md" : "bg-tm-blue-gray/5 border-tm-blue-gray/5 text-foreground/70"
            )}>
              {inMonth ? day : ""}
              <span className="flex gap-1 h-1.5">
                {(today ? ["task", "event", "task"] : marks ?? []).map((mark, n) => (
                  <span key={n} className={cn("w-1.5 h-1.5 rounded-full", today ? "bg-white" : MARK_COLOR[mark])} />
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

const NOTE_LINES = ["Shipped the release before lunch", "Walked the long way home", "Called Ma. She sounded happy", "Guitar: finally got that bridge"];

function NotesProp() {
  return (
    <>
      {[0, 1, 2].map(sheet => (
        <div key={sheet} data-sheet className={cn(BOARD, "absolute inset-0 p-5 md:p-6 flex flex-col gap-4")}>
          <CardFx />
          {sheet === 2 ? (
            <>
              <div className="flex items-center justify-between">
                <p className="font-display font-bold text-lg uppercase text-tm-purple-dark dark:text-tm-yellow">Thursday, Oct 9</p>
                <p className={cn(LABEL, "text-tm-yellow")}>+40 XP</p>
              </div>
              <ul className="space-y-3 flex-1">
                {NOTE_LINES.map(line => (
                  <li key={line} data-row className="flex items-center gap-3 text-sm font-medium text-foreground/85">
                    <span className="w-2 h-2 rounded-full border-2 border-tm-yellow shrink-0" />
                    {line}
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-2">
                {["Good", "Neutral", "Bad"].map((mood, i) => (
                  <span key={mood} data-x className={cn(LABEL, "px-3 py-1.5 rounded-full border", i === 0 ? "bg-tm-yellow text-tm-purple-dark border-tm-yellow" : "border-tm-blue-gray/20 text-tm-blue-gray")}>{mood}</span>
                ))}
              </div>
            </>
          ) : (
            // The sheets underneath: yesterday and the day before, already filled
            <div className="space-y-3 opacity-40">
              <div className="h-4 w-1/2 rounded bg-tm-blue-gray/30" />
              {[0.9, 0.7, 0.8, 0.5].map((width, i) => <div key={i} className="h-2.5 rounded bg-tm-blue-gray/20" style={{ width: `${width * 100}%` }} />)}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

const HABITS = [
  { name: "Read 10 pages", done: [1, 1, 1, 1, 1, 1, 1], streak: 21 },
  { name: "Guitar practice", done: [1, 1, 0, 1, 1, 1, 1], streak: 4 },
  { name: "Morning walk", done: [1, 0, 1, 1, 0, 1, 1], streak: 2 },
];

function HabitsProp() {
  return (
    <div className="tm-3d space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-display font-bold text-xl uppercase text-tm-yellow">Daily missions</p>
        <p className={cn(LABEL, "text-tm-blue-gray")}>This week</p>
      </div>
      {HABITS.map(habit => (
        <div key={habit.name} className="tm-3d space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">{habit.name}</p>
            <p data-x className={cn(LABEL, "flex items-center gap-1", habit.streak > 2 ? "text-tm-orange-dark" : "text-tm-blue-gray/60")}><Flame size={12} /> {habit.streak}</p>
          </div>
          <div className="tm-3d grid grid-cols-7 gap-1.5 md:gap-2">
            {habit.done.map((done, day) => (
              // A token with two faces: an empty ring, and the tick it turns over to
              <span key={day} data-flip={done ? "" : undefined} className="tm-3d relative block aspect-square">
                <span className="tm-face absolute inset-0 rounded-full border-2 border-dashed border-tm-blue-gray/30" />
                <span className="tm-face tm-face-back absolute inset-0 rounded-full bg-tm-yellow text-tm-purple-dark flex items-center justify-center shadow-md"><Check size={16} /></span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const RING_RADIUS = 250;

function SeasonsProp() {
  return (
    <div className="space-y-6">
      <div className="[perspective:1300px]">
        {/* Pushed back by its own radius, so the rank at the front is drawn at its true size */}
        <div className="tm-3d aspect-[3/4]" style={{ transform: `translateZ(-${RING_RADIUS}px)` }}>
          <div data-obj className="tm-3d relative w-full h-full">
            {RPG_TITLES.map((rank, i) => (
              <div key={rank.title} className="tm-face absolute inset-0" style={{ transform: `rotateY(${i * 36}deg) translateZ(${RING_RADIUS}px)` }}>
                <div className={cn(BOARD, "h-full p-3 flex flex-col items-center justify-center gap-3 text-center")}>
                  <CardFx />
                  <span className="w-14 h-14 rounded-full bg-tm-purple-dark text-tm-yellow flex items-center justify-center"><RankCrest rank={rank.title} size={26} strokeWidth={1.5} /></span>
                  <span className="font-display font-bold uppercase text-sm md:text-base leading-none text-tm-purple-dark dark:text-tm-yellow">{rank.title}</span>
                  <span className={cn(LABEL, "text-tm-blue-gray")}>Level {rank.minLevel}+</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div data-x className="space-y-2 w-[70vw] max-w-[300px] -ml-[calc((min(70vw,300px)_-_100%)/2)]">
        <div className="h-2.5 rounded-full bg-tm-blue-gray/15 overflow-hidden">
          <div data-grow className="h-full origin-left rounded-full bg-tm-yellow" />
        </div>
        <p className={cn(LABEL, "flex items-center justify-center gap-2 text-tm-blue-gray")}><TrendingUp size={12} className="text-tm-yellow" /> Ahead of last month&apos;s pace</p>
      </div>
    </div>
  );
}

function GuideProp() {
  return (
    <div className="space-y-5">
      <div className="[perspective:1300px]">
        <div data-obj className="tm-3d relative aspect-[5/4]">
          <QuestFace tag="Written by your AI" icon={Bot} title="The Unplugged Encore" text="Two weeks of release work and no guitar. Play that bridge three times tonight, phone in another room." />
          <QuestFace back tag="No key? Still a quest" icon={WifiOff} title="Message an Old Friend" text="Send a real message to someone you haven't spoken to in months. Ask one question you want the answer to." />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {["Gemini", "Claude", "Groq"].map(provider => (
          <span key={provider} data-x className={cn(LABEL, "px-3 py-1.5 rounded-full border border-tm-blue-gray/20 text-foreground/80")}>{provider}</span>
        ))}
        <span data-x className={cn(LABEL, "flex items-center gap-1.5 px-3 py-1.5 text-tm-blue-gray")}><KeyRound size={12} /> Your key</span>
      </div>
    </div>
  );
}

function QuestFace({ tag, icon: Icon, title, text, back }: { tag: string; icon: LucideIcon; title: string; text: string; back?: boolean }) {
  return (
    <div className={cn(BOARD, "tm-face absolute inset-0 p-5 md:p-6 flex flex-col gap-3 border-tm-yellow/30 bg-tm-yellow/5", back && "tm-face-back")}>
      <CardFx />
      <div className="flex items-center justify-between">
        <p className={cn(LABEL, "flex items-center gap-2 text-tm-yellow")}><Zap size={12} /> Smart mission</p>
        <p className={cn(LABEL, "px-2 py-0.5 rounded-lg bg-tm-yellow/10 border border-tm-yellow/20 text-tm-yellow")}>+50 XP</p>
      </div>
      <p className={cn(LABEL, "flex items-center gap-1.5 text-tm-blue-gray")}><Icon size={12} /> {tag}</p>
      <p className="text-xl md:text-2xl font-bold text-foreground leading-tight">{title}</p>
      <p className="text-sm font-medium text-tm-blue-gray italic">{text}</p>
    </div>
  );
}

function PrivacyProp() {
  const door = cn(BOARD, "group h-full p-4 md:p-6 flex flex-col gap-3 hover:border-tm-yellow/40 transition-colors");
  return (
    <div className="relative">
      <div data-obj className="grid grid-cols-2 gap-3 md:gap-4 [perspective:1300px]">
        <Link data-door="left" href="/login" className={cn(door, "origin-left")}>
          <CardFx />
          <span className="w-11 h-11 rounded-2xl bg-tm-yellow/10 text-tm-yellow flex items-center justify-center"><UserRound size={20} /></span>
          <span className="font-black text-foreground leading-tight">Set up your account</span>
          <span className="text-xs md:text-sm font-medium text-tm-blue-gray">Sign in with Google. A fresh planner, private to you.</span>
          <span className={cn(LABEL, "mt-auto flex items-center gap-2 text-tm-yellow")}>Sign in <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" /></span>
        </Link>
        <a data-door="right" href={REPO_URL} target="_blank" rel="noopener noreferrer" className={cn(door, "origin-right")}>
          <CardFx />
          <span className="w-11 h-11 rounded-2xl bg-tm-orange-light/15 text-tm-orange-light flex items-center justify-center"><Database size={20} /></span>
          <span className="font-black text-foreground leading-tight">Set up your own database</span>
          <span className="text-xs md:text-sm font-medium text-tm-blue-gray">Fork it on GitHub and host it yourself. Your server, your data.</span>
          <span className={cn(LABEL, "mt-auto flex items-center gap-2 text-tm-orange-light")}><Github size={14} /> Source</span>
        </a>
      </div>
      <span data-x className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-tm-purple-dark text-tm-yellow flex items-center justify-center shadow-xl pointer-events-none"><Lock size={20} /></span>
    </div>
  );
}

// Each game's own colours, whatever theme the page is in
const PERSONA_CARDS = [
  { name: "Persona 3", note: "Dark Hour", icon: Moon, className: "bg-[#0b2a5c] text-[#7fd1ff]" },
  { name: "Persona 4", note: "Midnight Channel", icon: Tv, className: "bg-[#f5c400] text-[#1a1a1a]" },
  { name: "Persona 5", note: "Take your time", icon: VenetianMask, className: "bg-[#d90018] text-white" },
];

function ThemesProp() {
  return (
    <div className="space-y-8">
      <div data-obj className="relative aspect-[3/4]">
        {PERSONA_CARDS.map(({ name, note, icon: Icon, className }) => (
          // Pivoting from a point below the card, like cards held in a hand
          <div key={name} data-card className={cn("absolute inset-0 rounded-2xl p-4 flex flex-col justify-between shadow-xl [transform-origin:50%_135%]", className)}>
            <Icon size={26} />
            <div>
              <p className="font-display font-bold uppercase leading-none text-base md:text-xl">{name}</p>
              <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.12em] opacity-80 mt-1.5">{note}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 w-[80vw] max-w-[340px] -ml-[calc((min(80vw,340px)_-_100%)/2)]">
        {["I", "II", "III", "IV", "V"].map(era => (
          <span key={era} data-x className="w-8 h-8 rounded-full border-2 border-tm-yellow/40 text-tm-yellow font-serif font-bold text-xs flex items-center justify-center shrink-0">{era}</span>
        ))}
        <span data-x className={cn(LABEL, "px-3 py-1.5 rounded-full border border-dashed border-tm-blue-gray/30 text-tm-blue-gray whitespace-nowrap")}>Special days · soon</span>
      </div>
    </div>
  );
}
