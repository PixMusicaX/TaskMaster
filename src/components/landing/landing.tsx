"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { animate, createScope, createTimeline, onScroll, stagger, utils, type AnimationParams } from "animejs";
import {
  ArrowDown, ArrowRight, Bot, Calendar, Check, CheckCircle2, CheckSquare, ChevronLeft, ChevronRight, Database, FileText, Flame,
  Github, KeyRound, Lock, Moon, Palette, Play, Shield, Sparkles, Sun, TrendingUp, UserRound, WifiOff, Zap, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { prefersReducedMotion } from "@/lib/scroll-fx";
import { useMounted } from "@/lib/use-mounted";
import { RPG_TITLES } from "@/lib/constants";
import { RankCrest } from "@/lib/rank-icons";
import { APP_VERSION, CREATOR_URL, REPO_URL } from "@/lib/version";
import { AnimatePresence, motion } from "framer-motion";
import { PERSONA_FONTS_URL, PERSONA_NAMES, PERSONA_STYLES, type PersonaStyle } from "@/lib/persona";
import { SPECIAL_FORCED_THEME, SPECIAL_IDS, type SpecialId } from "@/lib/special-days";
import type { AmbientLayer } from "@/lib/eras";
import { Layer } from "@/components/era-ambient";
import LandingBackdrop, { type BackdropMode } from "./landing-backdrop";
import { P3Sweep, P4Static, P5Wipe, PERSONA_WIPE_MS } from "@/components/persona/persona-transition";
import { useBrowserTheme, useTheme } from "@/components/theme-provider";
import HabitIconRender from "@/components/HabitIconRender";
import { P3Menu, P4Menu, P5Menu } from "@/components/persona/persona-pause-menu";
import { GOOGLE_WIPE_MS, GoogleSpiral, markGoogleWipe } from "./google-reveal";
import SpecialStage, { type SpecialShow } from "./special-stage";
import "./landing.css";

// The front door, as one pinned scroll sequence (the same idea as the home page's Growth Orbit).
// The stage holds still while the page scrolls underneath it, and a single anime.js script, tied
// to the scroll position, flies each feature in as a 3D prop built from the app's own cards,
// plays it, and flies it out again: a calendar lying in space with its busy days lifting off,
// a stack of note sheets, habit tokens that flip, ranks on a turning carousel, a quest card that
// turns over, two doors. The calendar, notes and habits props are the app's own screens, copied
// class for class with sample data; the Special days scene wears one of the twelve monthly themes
// and the Persona days scene shows one of the real Persona menus; and each of the other scenes
// sits on the ambience of one of the app's five eras.
// Scrolling back rewinds all of it.
//
// One prop is on stage at a time and the others are hidden outright, which keeps the number of
// live 3D layers small on phones. With reduced motion there is no stage: the sections are a list.

type SceneId = "top" | "calendar" | "notes" | "habits" | "seasons" | "guide" | "privacy" | "special" | "themes" | "version";

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
    id: "special", label: "Special days", icon: Palette, number: "07", eyebrow: "Special days", title: "Once a month it dresses up", side: "right",
    body: "One day every month the app takes on that month's theme: its own colours, a menu with every page renamed, page wipes and a backdrop. Your cards stay exactly where they are.",
    points: ["Twelve themes, from First Snow to Winter Cabin", "Four fall on fixed dates; the rest are a surprise", "On by default, with a switch in Account"],
  },
  {
    id: "themes", label: "Persona days", icon: Sparkles, number: "08", eyebrow: "Persona days", title: "Other days it goes further", side: "right",
    body: "Six days a month, if you switch them on, the app turns into Persona 3, 4 or 5: fonts, menus, ceremonies, even the AI's voice. A full takeover, where a special day only changes the colours.",
    points: ["A full takeover, never the same dates twice", "Two days each for Persona 3, 4 and 5", "Go to accounts and turn it on!"],
  },
];

const SPECIAL_FEATURE = FEATURES[6];
const PERSONA_FEATURE = FEATURES[7];

const SCENES: { id: SceneId; label: string }[] = [
  { id: "top", label: "Start" },
  ...FEATURES.map(f => ({ id: f.id as SceneId, label: f.label })),
  { id: "version", label: "Version" },
];

// The script's clock: how long each scene holds the stage. A scene plays a little past its span,
// overlapping the next one's arrival.
const SPANS: Record<SceneId, number> = { top: 60, calendar: 90, notes: 90, habits: 90, seasons: 90, guide: 90, privacy: 90, special: 112, themes: 112, version: 60 };
const STARTS = SCENES.reduce<number[]>((starts, scene, i) => [...starts, i === 0 ? 0 : starts[i - 1] + SPANS[SCENES[i - 1].id]], []);
const sceneStart = (index: number) => STARTS[index];
const sceneSpan = (index: number) => SPANS[SCENES[index].id];
// Where a scene is at rest, for the dots to jump to
const sceneRest = (index: number) => (index === 0 ? 0 : sceneStart(index) + 52);
// How quickly the script catches up with the scroll position: 1 is locked to it, lower glides.
// A mouse wheel moves the page in jumps; this is what turns those into one continuous motion.
const SCROLL_SMOOTHING = 0.3;
const SCROLL_PER_UNIT = 1.6; // vh of scrolling per unit of script

// The Special days and Persona days scenes each put a full menu on the stage, and light its
// options one after another as the scroll moves through the scene
const SPECIAL_INDEX = SCENES.findIndex(scene => scene.id === "special");
const THEMES_INDEX = SCENES.findIndex(scene => scene.id === "themes");
const SEASONS_INDEX = SCENES.findIndex(scene => scene.id === "seasons");
// Which of a scene's `count` options is lit at this point of the script (null while its menu is down)
function optionAt(time: number, index: number, count: number): number | null {
  const local = time - sceneStart(index);
  const from = 8;
  const until = sceneSpan(index) - 6;
  if (local < from || local > until) return null;
  return Math.min(count - 1, Math.floor(((local - from) / (until - from)) * count));
}
// The special day's menu keeps its own six page names
const SPECIAL_PAGES = 6;
// The Persona menu's options spell the scene's heading
const THEME_WORDS = ["Other", "Days", "It", "Goes", "Further"];
const THEME_NOTES = ["Six days a month", "Never the same dates twice", "Fonts, menus, ceremonies", "Even the AI changes its voice", "Only if you switch it on"];
type PersonaShow = { style: PersonaStyle; selected: number } | null;

const LABEL = "text-caption font-mono font-semibold uppercase tracking-[0.12em]";
const CTA = cn(LABEL, "inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-tm-yellow text-tm-purple-dark text-sm transition-transform hover:scale-[1.03] active:scale-95");
const BOARD = "tm-card tm-board relative border border-tm-blue-gray/10 dark:border-white/10";

// A look around without an account. Not built yet: the button is here so the layout has its place.
function DemoButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      title="Demo coming soon"
      className={cn(LABEL, "inline-flex items-center gap-2 border border-tm-blue-gray/30 text-tm-purple-dark dark:text-tm-yellow hover:border-tm-yellow/60 hover:bg-tm-yellow/10 transition-colors active:scale-95", className)}
    >
      <Play size={14} /> Demo
    </button>
  );
}

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
  const { theme, toggleTheme } = useTheme();
  // Light or dark as the visitor's browser prefers (the app itself goes by the time of day)
  useBrowserTheme();

  // Signing in is with Google, so the way out to the login page is in Google's four colours:
  // a spiral closes over the page, then the route changes underneath it
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const signIn = useCallback((event: React.MouseEvent) => {
    // Leave modified clicks (new tab) and reduced motion to the plain link
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0 || prefersReducedMotion()) return;
    event.preventDefault();
    setLeaving(true);
    setTimeout(() => {
      // The login page winds the spiral back down (see google-reveal.tsx)
      markGoogleWipe();
      router.push("/login");
    }, GOOGLE_WIPE_MS);
  }, [router]);
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const total = useRef(1);
  const [active, setActive] = useState(0);
  // What the Special days scene should be showing, and the setter <SpecialStage> hands us.
  // One day per visit, picked when the page loads
  const specialId = useRef<SpecialId>("halloween");
  const specialKey = useRef("");
  const specialShow = useRef<SpecialShow>(null);
  const setSpecial = useRef<((show: SpecialShow) => void) | null>(null);
  const registerSpecial = useCallback((set: (show: SpecialShow) => void) => {
    setSpecial.current = set;
    set(specialShow.current);
  }, []);
  // The same for the Persona days scene and <PersonaStage>: one game per visit
  const personaStyle = useRef<PersonaStyle>("p5");
  const personaKey = useRef("");
  const personaShow = useRef<PersonaShow>(null);
  const setPersona = useRef<((show: PersonaShow) => void) | null>(null);
  const registerPersona = useCallback((set: (show: PersonaShow) => void) => {
    setPersona.current = set;
    set(personaShow.current);
  }, []);

  useLayoutEffect(() => {
    const el = root.current;
    const trackEl = track.current;
    if (!el || !trackEl || reduced) return;
    // The Special days scene wears the day's palette (see data-special-scope in app/special.css),
    // dark where the day is always dark
    specialId.current = SPECIAL_IDS[Math.floor(Math.random() * SPECIAL_IDS.length)];
    const specialLayer = el.querySelector<HTMLElement>('[data-scene="special"]');
    specialLayer?.setAttribute("data-special-scope", specialId.current);
    specialLayer?.classList.toggle("dark", SPECIAL_FORCED_THEME[specialId.current] === "dark");
    personaStyle.current = PERSONA_STYLES[Math.floor(Math.random() * PERSONA_STYLES.length)];
    // The caption card is placed per game (see the Themes scene's markup)
    el.querySelector<HTMLElement>('[data-scene="themes"]')?.setAttribute("data-game", personaStyle.current);

    const layers = SCENES.map(scene => el.querySelector<HTMLElement>(`[data-scene="${scene.id}"]`));
    const ring = el.querySelector<HTMLElement>('[data-scene="seasons"] [data-obj]');
    const within = (id: SceneId) => (selector: string) => Array.from(el.querySelectorAll<HTMLElement>(`[data-scene="${id}"] ${selector}`));
    let shown = -1;

    // Only the scene on stage (and its neighbour mid-handover) is drawn or clickable
    const stage = (time: number) => {
      let current = 0;
      layers.forEach((layer, i) => {
        if (!layer) return;
        const from = sceneStart(i) - 1;
        const until = i === SCENES.length - 1 ? Infinity : sceneStart(i) + sceneSpan(i) + 12;
        const on = time >= from && time <= until;
        layer.style.visibility = on ? "visible" : "hidden";
        // Clickable only while it is at rest, not while flying in or out
        const settled = i === 0 ? time <= 22 : time >= from + 22 && (i === SCENES.length - 1 || time <= from + sceneSpan(i) - 10);
        layer.style.pointerEvents = on && settled ? "auto" : "none";
        if (time >= from + 1) current = i;
      });
      if (current !== shown) { shown = current; setActive(current); }
      // The rank ring shows only the ranks on its near side (again, not left to the browser)
      if (ring && layers[SEASONS_INDEX]?.style.visibility === "visible") {
        const turned = parseFloat(String(utils.get(ring, "rotateY"))) || 0;
        Array.from(ring.children).forEach((card, i) => {
          const facing = (((i * 36 + turned) % 360) + 360) % 360;
          (card as HTMLElement).style.visibility = facing < 100 || facing > 260 ? "" : "hidden";
        });
      }
      // The two menus are mounted only while they are up (one runs a canvas, the other plays video)
      const page = optionAt(time, SPECIAL_INDEX, SPECIAL_PAGES);
      const special: SpecialShow = page === null ? null : { id: specialId.current, selected: page };
      const pageKey = special ? `${special.id}${special.selected}` : "";
      if (pageKey !== specialKey.current) {
        specialKey.current = pageKey;
        specialShow.current = special;
        setSpecial.current?.(special);
      }
      const word = optionAt(time, THEMES_INDEX, THEME_WORDS.length);
      const persona: PersonaShow = word === null ? null : { style: personaStyle.current, selected: word };
      const key = persona ? `${persona.style}${persona.selected}` : "";
      if (key !== personaKey.current) {
        personaKey.current = key;
        personaShow.current = persona;
        setPersona.current?.(persona);
      }
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
      // Two-sided props: the script swaps the faces at the half-turn itself (see `turnOver`)
      utils.set("[data-back]", { opacity: 0 });

      const timeline = createTimeline({
        defaults: { ease: "out(3)" },
        autoplay: onScroll({ target: trackEl, enter: "top top", leave: "bottom bottom", sync: SCROLL_SMOOTHING }),
        onUpdate: ({ currentTime }) => stage(currentTime),
      });
      const add = (targets: HTMLElement[], params: AnimationParams, at: number) => {
        if (targets.length) timeline.add(targets, params, at);
      };
      // Turn a two-faced prop over. Browsers don't reliably hide the far side of a card whose
      // faces are themselves styled cards, so the faces change places exactly as it passes edge-on.
      const turnOver = (prop: HTMLElement, at: number, duration: number, ease: string) => {
        add([prop], { rotateY: [0, 180], duration, ease }, at);
        const edgeOn = at + duration / 2 - 0.3;
        add(Array.from(prop.querySelectorAll<HTMLElement>(":scope > [data-front]")), { opacity: [1, 0], duration: 0.6, ease: "linear" }, edgeOn);
        add(Array.from(prop.querySelectorAll<HTMLElement>(":scope > [data-back]")), { opacity: [0, 1], duration: 0.6, ease: "linear" }, edgeOn);
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
        const out = at + sceneSpan(i) - 12;
        add(q("[data-title]"), { opacity: [0, 1], rotateX: [-85, 0], translateY: [40, 0], duration: 22, ease: "out(4)" }, at + 6);
        add(q("[data-line]"), { opacity: [0, 1], translateY: [40, 0], duration: 16, delay: stagger(3) }, at + 10);
        add(q("[data-obj]"), { opacity: [0, 1], duration: 9, ease: "linear" }, at);
        if (last) return;
        add(q("[data-title]"), { opacity: [1, 0], rotateX: [0, 70], translateY: [0, -40], duration: 14, ease: "in(2)" }, out);
        add(q("[data-line]"), { opacity: [1, 0], translateY: [0, -40], duration: 12, delay: stagger(1.5), ease: "in(2)" }, out);
        add(q("[data-obj]"), { opacity: [1, 0], duration: 9, ease: "linear" }, at + sceneSpan(i) + 1);
      });

      // ── Calendar: the app's month view lying in space, sliding in from the corner. The events
      // lift off the page like pins, today's date highest, then it tips up and leaves over the top.
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
        q("[data-flip]").forEach((token, i) => turnOver(token, at + 26 + i * 1.7, 14, "inOut(2)"));
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
        q("[data-obj]").forEach(card => turnOver(card, at + 42, 24, "inOut(3)"));
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

      // ── Special days: one of the twelve days takes over the whole stage (mounted by
      // <SpecialStage>, driven from stage() above). Only the caption card is scripted.
      {
        const at = sceneStart(SPECIAL_INDEX);
        const q = within("special");
        add(q("[data-obj]"), { translateY: [60, 0], duration: 20, ease: "out(4)" }, at);
        add(q("[data-obj]"), { translateY: [0, 60], duration: 12, ease: "in(2)" }, at + SPANS.special - 10);
      }

      // ── Persona days: a real Persona menu does the same (mounted by <PersonaStage>)
      {
        const at = sceneStart(THEMES_INDEX);
        const q = within("themes");
        add(q("[data-obj]"), { translateY: [60, 0], duration: 20, ease: "out(4)" }, at);
        add(q("[data-obj]"), { translateY: [0, 60], duration: 12, ease: "in(2)" }, at + SPANS.themes - 10);
      }

      // ── Version: the number arrives from far away and stays
      {
        const at = sceneStart(SCENES.length - 1);
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
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="p-2 rounded-lg text-tm-purple-dark dark:text-tm-yellow hover:bg-tm-yellow/15 transition-colors active:scale-90"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <DemoButton className="hidden sm:inline-flex px-4 py-2 rounded-lg" />
          <Link href="/login" onClick={signIn} className={cn(LABEL, "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-tm-yellow text-tm-purple-dark transition-transform hover:scale-[1.04] active:scale-95")}>
            Sign in <ArrowRight size={14} />
          </Link>
        </div>
      </header>
      {leaving && <GoogleSpiral phase="in" />}
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
      <div ref={track} style={{ height: `${(sceneStart(SCENES.length - 1) + SPANS.version) * SCROLL_PER_UNIT}vh` }}>
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          <LandingAmbient scene={SCENES[active].id} />

          {/* Opening */}
          <div data-scene="top" className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <div className="space-y-7 max-w-4xl [perspective:1200px]">
              <div data-intro="rise"><p data-hero-line className={cn(LABEL, "text-tm-blue-gray")}>Your personal planner</p></div>
              <h1 aria-label="TaskMaster" className="tm-3d whitespace-nowrap text-[12.5vw] leading-none md:text-9xl font-display font-bold tracking-tight uppercase text-tm-purple-dark dark:text-tm-yellow">
                {"TaskMaster".split("").map((letter, i) => (
                  <span key={i} aria-hidden data-intro="letter" className="tm-3d inline-block"><span data-letter className="inline-block">{letter}</span></span>
                ))}
              </h1>
              <div data-intro="rise"><p data-hero-line className="max-w-xl mx-auto text-base md:text-xl font-medium text-tm-blue-gray">Habits, notes and a calendar that turn your month into a season worth winning.</p></div>
              <div data-intro="rise">
                <div data-hero-line className="flex flex-wrap items-center justify-center gap-3">
                  <Link href="/login" onClick={signIn} className={CTA}>Sign in <ArrowRight size={18} /></Link>
                  <DemoButton className="px-8 py-4 rounded-xl text-sm" />
                </div>
              </div>
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
              <div data-obj className={cn(BOARD, "tm-board-3d flex flex-col")}>
                <CardFx />
                <CalendarProp />
              </div>
            </div>
          </FeatureScene>

          {/* Notes */}
          <FeatureScene feature={FEATURES[1]}>
            <div className="absolute right-[4vw] bottom-[5svh] w-[min(70vw,36svh)] md:right-[9vw] md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:w-[30vw] max-w-[420px] [perspective:1400px]">
              <div data-obj className="tm-3d relative aspect-[4/5]">
                <NotesProp />
              </div>
            </div>
          </FeatureScene>

          {/* Habits */}
          <FeatureScene feature={FEATURES[2]}>
            <div className="absolute left-[5vw] bottom-[6svh] w-[90vw] md:left-[7vw] md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:w-[36vw] max-w-[520px] [perspective:1400px]">
              <div data-obj className={cn(BOARD, "tm-board-3d px-3 py-5 sm:p-6")}>
                <CardFx />
                <HabitsProp />
              </div>
            </div>
          </FeatureScene>

          {/* Seasons */}
          <FeatureScene feature={FEATURES[3]}>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[9svh] md:left-auto md:translate-x-0 md:right-[13vw] md:bottom-auto md:top-1/2 md:-translate-y-1/2 w-[min(150px,19svh)] md:w-[180px]">
              <SeasonsProp />
            </div>
          </FeatureScene>

          {/* AI guide */}
          <FeatureScene feature={FEATURES[4]}>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[7svh] w-[min(84vw,46svh)] md:left-[9vw] md:translate-x-0 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:w-[32vw] max-w-[440px]">
              <GuideProp />
            </div>
          </FeatureScene>

          {/* Privacy */}
          <FeatureScene feature={FEATURES[5]}>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[7svh] w-[90vw] md:left-auto md:translate-x-0 md:right-[8vw] md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:w-[38vw] max-w-[540px]">
              <PrivacyProp onSignIn={signIn} />
            </div>
          </FeatureScene>

          {/* Special days: a day's menu and backdrop fill the stage, in the day's own colours; the
              words ride on a card over it, clear of the menu (under it on a phone) */}
          <div data-scene="special" className="invisible absolute inset-0">
            <SpecialStage register={registerSpecial} />
            <div className="absolute bottom-4 inset-x-4 md:inset-x-auto md:right-[4vw] md:bottom-[7vh] md:w-[28vw] md:max-w-sm">
              <div data-obj className={cn(BOARD, "p-4 md:p-6 space-y-2 md:space-y-3 bg-background/90 [perspective:900px]")}>
                <CardFx />
                <p data-line className={cn(LABEL, "flex items-center gap-3 text-tm-blue-gray")}>
                  <span className="text-tm-yellow">{SPECIAL_FEATURE.number}</span>
                  <span className="h-px w-8 bg-tm-blue-gray/30" />
                  <Palette size={14} /> {SPECIAL_FEATURE.eyebrow}
                </p>
                <h2 data-title className="origin-bottom text-lg md:text-3xl font-display font-bold tracking-tight uppercase leading-[1.05] text-tm-purple-dark dark:text-tm-yellow">{SPECIAL_FEATURE.title}</h2>
                <p data-line className="text-xs md:text-sm font-medium text-tm-blue-gray max-md:line-clamp-3">{SPECIAL_FEATURE.body}</p>
              </div>
            </div>
          </div>

          {/* Persona days: a game's menu fills the stage; the words ride on a card over it */}
          <div data-scene="themes" className="group invisible absolute inset-0">
            <PersonaStage register={registerPersona} />
            {/* Bottom left on wide screens, except on a Persona 3 day: that is where Makoto's face is,
                so the card moves to the open water at the top right. On a phone it is at the top,
                except on a Persona 4 day, where the first option is: there it goes under the list. */}
            <div className={cn(
              "absolute top-16 inset-x-4 md:top-auto md:inset-x-auto md:left-[4vw] md:bottom-[7vh] md:w-[32vw] md:max-w-md",
              "max-md:group-data-[game=p4]:top-[66svh]",
              "md:group-data-[game=p3]:left-auto md:group-data-[game=p3]:bottom-auto md:group-data-[game=p3]:right-[6vw] md:group-data-[game=p3]:top-[12vh] md:group-data-[game=p3]:w-[28vw]"
            )}>
              <div data-obj className={cn(BOARD, "p-4 md:p-6 space-y-2 md:space-y-3 bg-background/90 [perspective:900px]")}>
                <CardFx />
                {/* No heading here: the menu behind spells it out */}
                <p data-line className={cn(LABEL, "flex items-center gap-3 text-tm-blue-gray")}>
                  <span className="text-tm-yellow">{PERSONA_FEATURE.number}</span>
                  <span className="h-px w-8 bg-tm-blue-gray/30" />
                  <Sparkles size={14} /> {PERSONA_FEATURE.eyebrow}
                </p>
                <p data-line className="text-xs md:text-sm font-medium text-tm-blue-gray">{PERSONA_FEATURE.body}</p>
              </div>
            </div>
          </div>

          {/* Version */}
          <div data-scene="version" className="invisible absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <div className="space-y-7 max-w-2xl [perspective:1200px]">
              <p data-line className={cn(LABEL, "text-tm-blue-gray")}>Version</p>
              <p data-obj className="text-7xl md:text-9xl font-display font-bold tracking-tight text-tm-purple-dark dark:text-tm-yellow">{APP_VERSION}</p>
              <p data-x className="text-base md:text-lg font-medium text-tm-blue-gray">Accounts, your own AI key and this front door are new in this one. Made by Pinaki, also known as PiX.</p>
              <div data-x><Link href="/login" onClick={signIn} className={CTA}>Start your season <ArrowRight size={18} /></Link></div>
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
      <h2 data-title className="origin-bottom text-3xl md:text-6xl font-display font-bold tracking-tight uppercase leading-[1.05] text-tm-purple-dark dark:text-tm-yellow">{feature.title}</h2>
      <p data-line className={cn("text-sm md:text-lg font-medium text-tm-blue-gray max-w-lg", staged && "max-md:line-clamp-4")}>{feature.body}</p>
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
        "absolute top-[4.5rem] inset-x-6 space-y-2.5 md:space-y-5 [perspective:900px]",
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
        <h1 className="whitespace-nowrap text-[12.5vw] leading-none md:text-9xl font-display font-bold tracking-tight uppercase text-tm-purple-dark dark:text-tm-yellow">TaskMaster</h1>
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
// Calendar, notes and habits are the app's own screens: the markup and classes below are copied
// from app/(app)/calendar, notes and habits, filled with sample data and with the buttons made
// inert. Change the design there, change it here.

type SampleEvent = { title: string; type: "task" | "event" | "special_day"; completed?: boolean };
// October 2026 (it starts on a Thursday), as the desktop calendar would show it
const CALENDAR_EVENTS: Record<number, SampleEvent[]> = {
  2: [{ title: "Gandhi Jayanti", type: "special_day" }],
  5: [{ title: "Pay rent", type: "task", completed: true }],
  7: [{ title: "Dentist", type: "event" }],
  9: [{ title: "Ship release", type: "task" }, { title: "Guitar class", type: "event" }],
  12: [{ title: "Weekend trek", type: "event" }],
  14: [{ title: "Tax papers", type: "task" }],
  17: [{ title: "Riya's birthday", type: "special_day" }, { title: "Buy a gift", type: "task", completed: true }],
  20: [{ title: "Dussehra", type: "special_day" }],
  23: [{ title: "Demo day", type: "event" }],
  27: [{ title: "Renew passport", type: "task" }],
  30: [{ title: "Movie night", type: "event" }],
};
const CALENDAR_MOODS: Record<number, string> = { 3: "😇", 5: "😐", 6: "😇", 8: "😢" };
const CALENDAR_TODAY = 9;

function CalendarProp() {
  return (
    <>
      <div className="p-3 md:p-6 border-b border-tm-blue-gray/10 flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-display font-bold text-tm-purple-dark dark:text-tm-yellow">October 2026</h2>
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl"><ChevronLeft size={24} /></span>
          <span className="px-4 py-2 rounded-xl font-bold text-sm">Today</span>
          <span className="p-2 rounded-xl"><ChevronRight size={24} /></span>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-tm-blue-gray/10 bg-tm-blue-gray/5">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
          <div key={day} className="py-2 md:py-3 text-center text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray/60">{day}</div>
        ))}
      </div>

      <div className="tm-3d flex-1 grid grid-cols-7 auto-rows-fr">
        {Array.from({ length: 35 }, (_, i) => {
          const date = i - 3; // Sep 27 … Oct 31
          const inMonth = date >= 1;
          const day = inMonth ? date : 30 + date;
          const today = inMonth && date === CALENDAR_TODAY;
          const events = inMonth ? CALENDAR_EVENTS[date] ?? [] : [];
          return (
            <div key={i} className={cn(
              "tm-3d relative p-1 md:p-2 border-r border-b border-tm-blue-gray/5 text-left flex flex-col gap-1 min-h-[56px] md:min-h-[86px]",
              !inMonth ? "text-tm-blue-gray/20 bg-tm-blue-gray/5" : "text-foreground",
              today && "bg-tm-yellow/10"
            )}>
              <div className="tm-3d flex justify-between items-start">
                <span data-today={today ? "" : undefined} className={cn(
                  "text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full",
                  today ? "bg-tm-orange-dark text-white shadow-lg shadow-tm-orange-dark/20 scale-110" : ""
                )}>{day}</span>
                {inMonth && CALENDAR_MOODS[date] && <span className="text-sm opacity-80">{CALENDAR_MOODS[date]}</span>}
              </div>
              <div className="tm-3d flex flex-col gap-1 mt-1">
                {events.map(event => (
                  <div key={event.title} data-pin className={cn(
                    "px-1.5 py-0.5 rounded text-micro font-bold truncate border-l-2",
                    event.type === "special_day"
                      ? "bg-tm-orange-dark/20 text-tm-orange-dark border-tm-orange-dark"
                      : event.type === "task"
                        ? (event.completed ? "bg-tm-blue-gray/10 text-tm-blue-gray/50 border-tm-blue-gray/30" : "bg-tm-yellow/20 text-tm-purple-dark border-tm-yellow")
                        : "bg-tm-orange-light/20 text-tm-orange-dark border-tm-orange-light"
                  )}>
                    {event.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

const NOTE_MOODS = [
  { val: "good", icon: "😇", color: "text-tm-yellow", bg: "bg-tm-yellow/20" },
  { val: "neutral", icon: "😐", color: "text-tm-blue-gray", bg: "bg-white/10" },
  { val: "bad", icon: "😢", color: "text-tm-orange-dark", bg: "bg-tm-orange-dark/20" },
];
// Bottom of the stack first; the last one is the sheet on top
const NOTE_SHEETS = [
  { date: "October 7", mood: "neutral", saved: "22:10", lines: [["○", "Slow start, long meetings"], ["✅", "Booked the dentist"], ["○", "Early night"]] },
  { date: "October 8", mood: "bad", saved: "23:02", lines: [["📍", "Release slipped a day"], ["○", "Skipped the walk"], ["💡", "Split the migration in two"]] },
  { date: "October 9", mood: "good", saved: "21:40", lines: [["✅", "Shipped the release before lunch"], ["○", "Walked the long way home"], ["✨", "Called Ma. She sounded happy"], ["🔥", "Guitar: finally got that bridge"]] },
];

function NotesProp() {
  return (
    <>
      {NOTE_SHEETS.map((sheet, index) => {
        const top = index === NOTE_SHEETS.length - 1;
        return (
          <div key={sheet.date} data-sheet className={cn(
            BOARD, "absolute inset-0 flex flex-col overflow-hidden bg-background shadow-xl shadow-tm-purple-dark/5 dark:shadow-black/40",
            sheet.mood === "good" ? "border-tm-yellow/40 shadow-[0_0_20px_rgba(242,194,48,0.15)]"
              : sheet.mood === "bad" ? "border-tm-orange-dark/40 shadow-[0_0_20px_rgba(191,49,0,0.15)]" : "border-tm-yellow/20"
          )}>
            <CardFx />
            <div className="border-b border-tm-blue-gray/10 p-3 md:p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-tm-blue-gray">
                <Calendar size={16} />
                <span className="text-caption font-mono font-semibold uppercase tracking-[0.12em]">{sheet.date} Entry</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex p-1 md:mr-2">
                  {NOTE_MOODS.map(m => (
                    <span key={m.val} className={cn("relative p-2 rounded-full flex items-center justify-center w-9 h-9", sheet.mood === m.val ? m.color : "text-tm-blue-gray/70")}>
                      {sheet.mood === m.val && <span data-x={top ? "" : undefined} className={cn("absolute inset-0 rounded-full shadow-inner", m.bg)} />}
                      <span className={cn("relative text-xl", sheet.mood !== m.val && "grayscale-[0.6]")}>{m.icon}</span>
                    </span>
                  ))}
                </div>
                <span data-x={top ? "" : undefined} className="hidden md:flex text-caption text-tm-blue-gray font-bold italic items-center gap-1">
                  <CheckCircle2 size={12} /> Saved {sheet.saved}
                </span>
              </div>
            </div>
            <div className="flex-1 p-4 sm:p-8 space-y-2">
              {sheet.lines.map(([bullet, text]) => (
                <div key={text} data-row={top ? "" : undefined} className="flex items-start gap-3">
                  <div className="relative mt-1"><span className="w-6 h-6 flex items-center justify-center rounded-lg text-lg">{bullet}</span></div>
                  <p className="flex-1 text-sm md:text-lg leading-relaxed font-medium">{text}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

// A week ending today (Friday the 9th), as the habit tracker lays it out
const HABIT_DAYS = [["Sat", 3], ["Sun", 4], ["Mon", 5], ["Tue", 6], ["Wed", 7], ["Thu", 8], ["Fri", 9]] as const;
// Per day: 1 done, 0 not done, null = not scheduled that day
const HABIT_ROWS: { name: string; icon: string; frequency: string; streak: number; week: (0 | 1 | null)[] }[] = [
  { name: "Read 10 pages", icon: "Book", frequency: "Daily", streak: 21, week: [1, 1, 1, 1, 1, 1, 1] },
  { name: "Guitar practice", icon: "Music", frequency: "Daily", streak: 4, week: [1, 1, 0, 1, 1, 1, 1] },
  { name: "Morning walk", icon: "Dumbbell", frequency: "Weekdays", streak: 2, week: [null, null, 1, 0, 0, 1, 1] },
];
const HABIT_COLUMNS = { gridTemplateColumns: "minmax(0, 36%) repeat(7, 1fr)" };

function HabitsProp() {
  return (
    <div className="tm-3d min-w-full">
      <div className="grid mb-6 md:mb-8" style={HABIT_COLUMNS}>
        <div className="font-mono font-semibold text-tm-blue-gray text-caption sm:text-xs uppercase tracking-[0.12em] pl-1 sm:pl-4">Habit</div>
        {HABIT_DAYS.map(([name, date], i) => (
          <div key={name} className="text-center space-y-1">
            <p className="text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray">{name}</p>
            <div className={cn(
              "w-7 h-7 sm:w-9 sm:h-9 mx-auto rounded-full flex items-center justify-center font-bold text-sm",
              i === HABIT_DAYS.length - 1 ? "bg-tm-orange-dark text-white shadow-lg shadow-tm-orange-dark/20" : "text-tm-blue-gray bg-tm-blue-gray/5"
            )}>{date}</div>
          </div>
        ))}
      </div>

      <div className="tm-3d space-y-5 md:space-y-6">
        {HABIT_ROWS.map(habit => (
          <div key={habit.name} className="tm-3d grid items-center" style={HABIT_COLUMNS}>
            <div className="flex items-center gap-2 sm:gap-4 pl-1 sm:pl-4 relative">
              <div className="w-10 h-10 bg-tm-yellow/10 rounded-xl hidden sm:flex items-center justify-center shrink-0">
                <HabitIconRender icon={habit.icon} size={20} className="text-tm-yellow" />
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="font-bold text-xs sm:text-sm truncate leading-tight">{habit.name}</p>
                  {habit.streak >= 2 && (
                    <span data-x className="flex items-center gap-0.5 shrink-0 text-tm-orange-dark">
                      <Flame size={12} className="tm-flame fill-current" />
                      <span className="text-tiny font-mono font-semibold">{habit.streak}</span>
                    </span>
                  )}
                </div>
                <p className="text-micro sm:text-caption text-tm-blue-gray uppercase font-mono font-semibold tracking-[0.12em] truncate mt-0.5">{habit.frequency}</p>
              </div>
            </div>
            {habit.week.map((done, day) => (
              <div key={day} className="tm-3d flex justify-center">
                {done === null ? (
                  <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl border-2 border-transparent bg-tm-blue-gray/5 opacity-20" />
                ) : (
                  // The app's check box as a token with two faces: empty, and the ticked one it turns over to
                  <span data-flip={done ? "" : undefined} className="tm-3d relative block w-8 h-8 sm:w-10 sm:h-10">
                    <span data-front className="tm-face absolute inset-0 rounded-2xl border-2 border-tm-blue-gray/10 bg-white/5" />
                    <span data-back className="tm-face tm-face-back absolute inset-0 rounded-2xl border-2 bg-tm-yellow border-tm-yellow shadow-lg shadow-tm-yellow/20 flex items-center justify-center">
                      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="text-tm-purple-dark">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
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
                <div className={cn(BOARD, "h-full p-3 flex flex-col items-center justify-center gap-3 text-center bg-background")}>
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
    <div data-front={back ? undefined : ""} data-back={back ? "" : undefined} className={cn(BOARD, "tm-face absolute inset-0 p-5 md:p-6 flex flex-col gap-3 border-tm-yellow/30 bg-tm-yellow/5", back && "tm-face-back")}>
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

function PrivacyProp({ onSignIn }: { onSignIn: (event: React.MouseEvent) => void }) {
  const door = cn(BOARD, "group h-full p-4 md:p-6 flex flex-col gap-3 hover:border-tm-yellow/40 transition-colors");
  return (
    <div className="relative">
      <div data-obj className="grid grid-cols-2 gap-3 md:gap-4 [perspective:1300px]">
        <Link data-door="left" href="/login" onClick={onSignIn} className={cn(door, "origin-left")}>
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

const noop = () => {};

// The Persona days scene's backdrop: one of the app's real Persona pause menus, full size, with the
// scene's heading as its options. The landing script decides when it is up and which word is lit
// (see optionAt); this mounts it. It arrives and leaves behind that game's own page wipe, the
// one the app plays between pages on a Persona day. The menu is for looking at: inert and silent.
function PersonaStage({ register }: { register: (set: (show: PersonaShow) => void) => void }) {
  const [show, setShow] = useState<PersonaShow>(null);
  // Which option is lit. Kept apart from `show`, so it stays put while the menu wipes away
  // instead of jumping back to the first one
  const [selected, setSelected] = useState(0);
  const { theme } = useTheme();
  const dark = theme === "dark";
  const want = show?.style ?? null;

  // `up` trails `want`: the wipe starts first and the menu changes underneath it
  const [up, setUp] = useState<PersonaStyle | null>(null);
  const [wipe, setWipe] = useState<{ style: PersonaStyle; run: number } | null>(null);
  const [prevWant, setPrevWant] = useState(want);
  if (want !== prevWant) {
    setPrevWant(want);
    const style = want ?? prevWant;
    if (style) setWipe(current => ({ style, run: (current?.run ?? 0) + 1 }));
  }

  useEffect(() => {
    register(next => {
      setShow(next);
      if (next) setSelected(next.selected);
    });
  }, [register]);

  const wipeStyle = wipe?.style ?? null;
  useEffect(() => {
    const swap = setTimeout(() => setUp(want), 230);
    const done = setTimeout(() => setWipe(null), Math.max(780, wipeStyle ? PERSONA_WIPE_MS[wipeStyle] : 0));
    return () => { clearTimeout(swap); clearTimeout(done); };
  }, [want, wipeStyle]);

  // The games' typefaces are normally loaded on Persona days only
  const needed = want !== null;
  useEffect(() => {
    if (!needed || document.querySelector(`link[href="${PERSONA_FONTS_URL}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = PERSONA_FONTS_URL;
    document.head.appendChild(link);
  }, [needed]);

  if (!up && !wipe) return null;
  const menu = { selected, select: noop, onClose: noop, level: 12, xp: 1240, labels: THEME_WORDS, descriptions: THEME_NOTES };

  return (
    <div className="absolute inset-0 overflow-hidden select-none pointer-events-none">
      {up && (
        <div key={up} inert className="tm-persona-frame absolute inset-0 overflow-hidden">
          {up === "p3" && <P3Menu {...menu} dark={dark} />}
          {up === "p4" && <P4Menu {...menu} />}
          {up === "p5" && <P5Menu {...menu} />}
          <p className="absolute top-16 right-4 md:top-5 md:right-auto md:left-1/2 md:-translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-black/70 text-white text-caption font-mono font-semibold uppercase tracking-[0.12em]">
            The menu on a {PERSONA_NAMES[up]} day
          </p>
        </div>
      )}
      {wipe && (
        <div key={wipe.run} className="absolute inset-0 z-20 overflow-hidden" aria-hidden>
          {wipe.style === "p5" && <P5Wipe />}
          {wipe.style === "p4" && <P4Static />}
          {wipe.style === "p3" && <P3Sweep dark={dark} />}
        </div>
      )}
    </div>
  );
}

// ─── Backdrops ────────────────────────────────────────────────────────────────
// Two layers behind every scene. A wash of colour borrowed from the app's eras (the layers from
// components/era-ambient, styled in app/eras.css), and over it a quiet canvas show of its own
// where one suits (see landing-backdrop.tsx); the calendar and the AI guide keep only the wash. The Special days and Persona days scenes have
// neither; the day's or the game's menu is the backdrop.
const AMBIENT: Partial<Record<SceneId, { wash: AmbientLayer[]; show: BackdropMode | null }>> = {
  top: { wash: ["hearth"], show: "embers" },
  calendar: { wash: ["mesh"], show: null },
  notes: { wash: ["rays"], show: "ribbons" },
  habits: { wash: ["mesh"], show: "ripples" },
  seasons: { wash: ["aurora", "prism"], show: "warp" },
  guide: { wash: ["aurora"], show: null },
  privacy: { wash: ["mesh"], show: "lattice" },
  version: { wash: ["aurora"], show: "sparks" },
};

function LandingAmbient({ scene }: { scene: SceneId }) {
  const kit = AMBIENT[scene];
  return (
    <div className="tm-landing-ambient absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="tm-grain" />
      <AnimatePresence>
        {kit && (
          <motion.div
            key={scene}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
          >
            {kit.wash.map(layer => <Layer key={layer} layer={layer} />)}
          </motion.div>
        )}
      </AnimatePresence>
      {/* One canvas for the whole page: it cross-fades between shows itself */}
      <LandingBackdrop mode={kit?.show ?? null} />
    </div>
  );
}
