// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AskEmblem } from "@/components/home/saga-ask-scene";
import { APP_VERSION, CREATOR_URL, CREATOR_URL2 } from "@/lib/version";

afterEach(cleanup);

describe("the orbit's stations in the closing scene", () => {
  it("links the legal pages and both creators, shows the version, and keeps Ask", () => {
    const { container } = render(<AskEmblem onAsk={vi.fn()} active />);
    expect(screen.getByRole("button", { name: "Ask The Taskmaster" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Privacy" }).getAttribute("href")).toBe("/privacy");
    expect(screen.getByRole("link", { name: "Terms" }).getAttribute("href")).toBe("/terms");
    expect(screen.getByRole("link", { name: "By kk36" }).getAttribute("href")).toBe(CREATOR_URL2);
    expect(screen.getByRole("link", { name: "By PiX" }).getAttribute("href")).toBe(CREATOR_URL);
    expect(screen.getByText(`v${APP_VERSION}`)).toBeTruthy();
    expect(container.querySelectorAll("[data-saga=ask-link]")).toHaveLength(5);
  });

  it("sits them on the ring, running outwards on each side", () => {
    render(<AskEmblem onAsk={vi.fn()} active />);
    const privacy = screen.getByRole("link", { name: "Privacy" });
    const creator = screen.getByRole("link", { name: "By PiX" });
    expect(privacy.style.left).toBeTruthy();
    expect(creator.style.right).toBeTruthy();
  });

  it("can only be used while its scene is on stage", () => {
    const { rerender } = render(<AskEmblem onAsk={vi.fn()} active />);
    expect(screen.getByRole("link", { name: "Terms" }).className).toContain("pointer-events-auto");
    rerender(<AskEmblem onAsk={vi.fn()} active={false} />);
    const terms = screen.getByRole("link", { name: "Terms" });
    expect(terms.className).not.toContain("pointer-events-auto");
    expect(terms.getAttribute("tabindex")).toBe("-1");
  });
});
