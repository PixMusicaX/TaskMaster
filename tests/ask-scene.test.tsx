// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AskEmblem, ringArcs } from "@/components/home/saga-ask-scene";
import { APP_VERSION, CREATOR_URL, CREATOR_URL2 } from "@/lib/version";

afterEach(cleanup);

const linkTo = (container: HTMLElement, href: string) => container.querySelector(`a[href="${href}"]`);

describe("the ring in the closing scene", () => {
  it("links the legal pages and both creators, shows the version, and keeps Ask", () => {
    const { container } = render(<AskEmblem onAsk={vi.fn()} active />);
    expect(screen.getByRole("button", { name: "Ask The Taskmaster" })).toBeTruthy();
    expect(linkTo(container, "/privacy")?.textContent).toBe("Privacy");
    expect(linkTo(container, "/terms")?.textContent).toBe("Terms");
    expect(linkTo(container, CREATOR_URL2)?.textContent).toBe("By kk36");
    expect(linkTo(container, CREATOR_URL)?.textContent).toBe("By PiX");
    expect(screen.getByText(`v${APP_VERSION}`)).toBeTruthy();
    expect(container.querySelectorAll("[data-saga=ask-link]")).toHaveLength(5);
  });

  it("opens one gap per label, joined by short arcs", () => {
    const arcs = ringArcs();
    expect(arcs).toHaveLength(5);
    arcs.forEach(d => expect(d).toMatch(/^M [\d.]+ [\d.]+ A 184 184 0 0 1 [\d.]+ [\d.]+$/));
  });

  it("only takes clicks while its scene is on stage", () => {
    const { container, rerender } = render(<AskEmblem onAsk={vi.fn()} active />);
    expect(linkTo(container, "/terms")?.getAttribute("class")).toContain("pointer-events-auto");
    rerender(<AskEmblem onAsk={vi.fn()} active={false} />);
    const terms = linkTo(container, "/terms");
    expect(terms?.getAttribute("class")).not.toContain("pointer-events-auto");
    expect(terms?.getAttribute("tabindex")).toBe("-1");
  });

  it("stills the comet off stage", () => {
    const { container, rerender } = render(<AskEmblem onAsk={vi.fn()} active />);
    expect(container.querySelector(".tm-ask-comet")?.getAttribute("class")).not.toContain("paused");
    rerender(<AskEmblem onAsk={vi.fn()} active={false} />);
    expect(container.querySelector(".tm-ask-comet")?.getAttribute("class")).toContain("paused");
  });
});
