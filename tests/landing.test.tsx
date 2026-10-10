// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import Landing from "@/components/landing/landing";
import { ThemeProvider } from "@/components/theme-provider";
import { P5Menu } from "@/components/persona/persona-pause-menu";
import { SHOWS } from "@/components/landing/landing-backdrop";
import SpecialStage, { type SpecialShow } from "@/components/landing/special-stage";
import { SPECIAL_DAYS, SPECIAL_IDS, nextDateOf } from "@/lib/special-days";

// The landing page sends visitors to /login through the app router, which tests don't mount
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, prefetch: vi.fn() }),
  usePathname: () => "/",
}));

// The Demo button's server action reaches the database; the button itself is all these tests need
const startDemo = vi.fn<(today: string, tzOffsetMinutes: number) => Promise<{ success: false; message: string }>>(
  async () => ({ success: false, message: "The demo is busy right now." }));
vi.mock("@/app/actions/demo", () => ({ startDemo: (today: string, tzOffsetMinutes: number) => startDemo(today, tzOffsetMinutes) }));

const SCENES = ["top", "calendar", "notes", "habits", "seasons", "guide", "privacy", "special", "themes", "version"];

function motionPreference(reduce: boolean) {
  // jsdom has no ResizeObserver; anime.js's scroll observer needs one
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query.includes("reduce"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

afterEach(cleanup);

describe("the landing page", () => {
  it("builds its scroll script without errors and opens on the first scene only", () => {
    motionPreference(false);
    const { container } = render(<ThemeProvider><Landing /></ThemeProvider>);

    const layers = SCENES.map(id => container.querySelector<HTMLElement>(`[data-scene="${id}"]`));
    expect(layers.every(Boolean)).toBe(true);
    expect(layers[0]!.style.visibility).toBe("visible");
    expect(layers[0]!.style.pointerEvents).toBe("auto");
    layers.slice(1).forEach(layer => {
      expect(layer!.style.visibility).toBe("hidden");
      expect(layer!.style.pointerEvents).toBe("none");
    });

    // Later beats start hidden, so nothing shows before its cue
    expect(container.querySelector<HTMLElement>('[data-scene="calendar"] [data-obj]')!.style.opacity).toBe("0");
    expect(container.querySelector<HTMLElement>('[data-scene="calendar"] [data-title]')!.style.opacity).toBe("0");
    // Every feature has a prop for the script to fly
    SCENES.slice(1).forEach(id => expect(container.querySelector(`[data-scene="${id}"] [data-obj]`)).not.toBeNull());
    expect(container.querySelectorAll('[data-scene="calendar"] [data-pin]').length).toBeGreaterThan(5);
    expect(container.querySelectorAll('[data-scene="seasons"] [data-obj] > *')).toHaveLength(10);

    // Calendar, notes and habits carry the app's own markup
    expect(container.querySelector('[data-scene="calendar"]')!.textContent).toContain("October 2026");
    expect(container.querySelector('[data-scene="notes"]')!.textContent).toContain("October 9 Entry");
    expect(container.querySelector('[data-scene="habits"]')!.textContent).toContain("Read 10 pages");
    expect(container.querySelectorAll('[data-scene="habits"] [data-flip]').length).toBeGreaterThan(10);
    // The special day and the Persona menus are not mounted until their scenes come up
    expect(container.querySelector(".tm-special-frame")).toBeNull();
    expect(container.querySelector(".tm-persona-frame")).toBeNull();
    // The Special days scene wears one of the twelve palettes
    expect(SPECIAL_IDS).toContain(container.querySelector(`[data-scene="special"]`)!.getAttribute("data-special-scope"));
  });

  it("closes a spiral in Google's colours over the page before going to the login page", () => {
    motionPreference(false);
    vi.useFakeTimers();
    push.mockReset();
    const { container } = render(<ThemeProvider><Landing /></ThemeProvider>);

    fireEvent.click(container.querySelector('[data-scene="top"] a[href="/login"]')!);
    expect(document.querySelector(".tm-spiral.tm-spiral-in")).not.toBeNull();
    expect(push).not.toHaveBeenCalled();

    vi.advanceTimersByTime(700);
    expect(push).toHaveBeenCalledWith("/login");
    expect(sessionStorage.getItem("tm_google_wipe")).toBe("1");
    vi.useRealTimers();
  });

  it("has a Demo button beside Sign in", () => {
    motionPreference(false);
    const { container } = render(<ThemeProvider><Landing /></ThemeProvider>);
    const demo = Array.from(container.querySelectorAll('[data-scene="top"] button')).find(b => b.textContent?.includes("Demo"));
    expect(demo).toBeDefined();
  });

  it("starts a demo with the visitor's own date and clock, and says so when it can't", async () => {
    motionPreference(false);
    startDemo.mockClear();
    const { container } = render(<ThemeProvider><Landing /></ThemeProvider>);
    const demo = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-scene="top"] button')).find(b => b.textContent?.includes("Demo"))!;

    await act(async () => { fireEvent.click(demo); });
    expect(startDemo).toHaveBeenCalledTimes(1);
    expect(startDemo.mock.calls[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof startDemo.mock.calls[0][1]).toBe("number");
    expect(demo.textContent).toContain("Try again");
    expect(demo.title).toContain("busy");
  });

  it("opens on the forge's backdrop", () => {
    motionPreference(false);
    const { container } = render(<ThemeProvider><Landing /></ThemeProvider>);
    expect(container.querySelector(".tm-landing-ambient .tm-hearth")).not.toBeNull();
    expect(container.querySelector(".tm-landing-ambient canvas")).not.toBeNull();
  });

  it("every backdrop show draws frame after frame without breaking, at rest and at full scroll speed", () => {
    // A canvas context that accepts anything and records nothing but bad numbers
    const bad: string[] = [];
    const check = (name: string, args: unknown[]) => args.forEach(a => { if (typeof a === "number" && !Number.isFinite(a)) bad.push(name); });
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (target, prop: string) => (prop in target ? target[prop] : (...args: unknown[]) => check(prop, args)),
      set: (target, prop: string, value) => { check(prop, [value]); target[prop] = value; return true; },
    }) as unknown as CanvasRenderingContext2D;
    const glows = [document.createElement("canvas")];

    for (const [mode, show] of Object.entries(SHOWS)) {
      for (const [w, h, density] of [[1440, 900, 1], [390, 780, 0.5]]) {
        const env = { ctx, w, h, t: 0, dt: 0, boost: 0, colors: ["#B68C0B", "#DA7D0D", "#F24F13"], glows, k: 1, density, dark: w > 1000 };
        const state = show.init(env);
        for (let frame = 0; frame < 240; frame++) {
          show.draw(state, { ...env, t: frame / 60, dt: 1 / 60, boost: frame < 120 ? 0 : 1 });
        }
        expect(bad, `${mode} at ${w}x${h}`).toEqual([]);
      }
    }
  });

  it("can dress a Persona menu in the scene's own words", () => {
    motionPreference(false);
    const words = ["Other", "Days", "It", "Goes", "Further"];
    const { container } = render(<P5Menu selected={3} select={() => {}} onClose={() => {}} labels={words} descriptions={words.map(w => `about ${w}`)} />);
    const options = Array.from(container.querySelectorAll("nav a")).map(a => a.getAttribute("aria-label"));
    expect(options).toEqual(words);
    expect(container.textContent).toContain("about Goes");
    expect(container.textContent).not.toContain("hideout");
  });

  it("previews a special day: its menu under its own page names, with the date it next falls on", () => {
    motionPreference(false);
    vi.useFakeTimers();
    let set: (show: SpecialShow) => void = () => {};
    const { container } = render(<SpecialStage register={s => { set = s; }} />);
    expect(container.querySelector(".tm-special-frame")).toBeNull();

    act(() => set({ id: "halloween", selected: 2 }));
    act(() => { vi.advanceTimersByTime(300); });
    const frame = container.querySelector(".tm-special-frame")!;
    expect(frame.textContent).toContain(SPECIAL_DAYS.halloween.name);
    for (const label of SPECIAL_DAYS.halloween.labels) expect(frame.textContent).toContain(label);
    expect(frame.textContent).toContain("October 31");
    expect(frame.hasAttribute("inert")).toBe(true);

    // Scrolled past: it comes down again
    act(() => set(null));
    act(() => { vi.advanceTimersByTime(800); });
    expect(container.querySelector(".tm-special-frame")).toBeNull();
    vi.useRealTimers();
  });

  it("knows when a theme's day next comes round", () => {
    expect(nextDateOf("halloween", new Date(2026, 9, 10))).toEqual(new Date(2026, 9, 31));
    expect(nextDateOf("halloween", new Date(2026, 9, 31, 18))).toEqual(new Date(2026, 9, 31));
    expect(nextDateOf("snow", new Date(2026, 9, 10))).toEqual(new Date(2027, 0, 1));
  });

  it("is a plain page of sections when motion is reduced", () => {
    motionPreference(true);
    const { container } = render(<ThemeProvider><Landing /></ThemeProvider>);

    SCENES.forEach(id => {
      const section = container.querySelector<HTMLElement>(`[data-scene="${id}"]`);
      expect(section).not.toBeNull();
      expect(section!.style.visibility).toBe("");
    });
    expect(container.querySelector("[data-obj]")).toBeNull();
    expect(container.textContent).toContain("Every day accounted for");
    expect(container.textContent).toContain("Once a month it dresses up");
    expect(container.textContent).toContain("Other days it goes further");
  });
});
