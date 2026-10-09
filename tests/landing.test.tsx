// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render } from "@testing-library/react";
import Landing from "@/components/landing/landing";

const SCENES = ["top", "calendar", "notes", "habits", "seasons", "guide", "privacy", "themes", "version"];

function motionPreference(reduce: boolean) {
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
    const { container } = render(<Landing />);

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
  });

  it("is a plain page of sections when motion is reduced", () => {
    motionPreference(true);
    const { container } = render(<Landing />);

    SCENES.forEach(id => {
      const section = container.querySelector<HTMLElement>(`[data-scene="${id}"]`);
      expect(section).not.toBeNull();
      expect(section!.style.visibility).toBe("");
    });
    expect(container.querySelector("[data-obj]")).toBeNull();
    expect(container.textContent).toContain("Every day accounted for");
    expect(container.textContent).toContain("Some days it dresses up");
  });
});
