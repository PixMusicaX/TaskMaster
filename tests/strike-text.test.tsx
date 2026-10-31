// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import StrikeText from "@/components/ui/strike-text";

afterEach(cleanup);

describe("StrikeText", () => {
  it("is an inline span, so its stroke follows every line of wrapped text", () => {
    render(<StrikeText done>A long title</StrikeText>);
    const text = screen.getByText("A long title");
    expect(text.tagName).toBe("SPAN");
    expect(text.className).not.toMatch(/inline-block|block|absolute/);
    expect(text.getAttribute("style")).toContain("clone");
  });

  it("draws in when done and stays hidden when not", () => {
    const { rerender } = render(<StrikeText done={false}>Title</StrikeText>);
    expect(screen.getByText("Title").getAttribute("style")).toContain("0% 2px");
    rerender(<StrikeText done>Title</StrikeText>);
    expect(screen.getByText("Title").getAttribute("style")).toContain("100% 2px");
  });
});
