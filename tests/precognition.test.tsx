// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import FutureSightCard from "@/components/home/future-sight-card";
import { FutureEmblem, futureMarks, futureNodes, futureSegments } from "@/components/home/saga-time-scenes";
import { GOOGLE, GoogleSyncMark } from "@/components/google-mark";
import type { EventRow } from "@/lib/types";

const TODAY = "2026-10-31";

const event = (values: Partial<EventRow>) =>
  ({ id: "e", title: "Trip", type: "event", tier: "main", date: TODAY, startTime: null, endTime: null, gcalImported: false, ...values }) as EventRow;

// All-day, with Google's end date: the day after the last one
const trip = (from: string, endExclusive: string, values: Partial<EventRow> = {}) =>
  event({ date: from, endTime: new Date(`${endExclusive}T00:00:00Z`), ...values });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T10:00:00`));
  return cleanup;
});

describe("futureMarks", () => {
  it("shows only the days left of an event already under way", () => {
    const [mark] = futureMarks([trip("2026-10-29", "2026-11-04")], TODAY);
    expect(mark).toMatchObject({ day: 1, lastDay: 3, title: "Trip", when: "Day 4/6" });
  });

  it("calls one starting tomorrow by its dates, and one that began today by its day", () => {
    const [starting] = futureMarks([trip("2026-11-01", "2026-11-04")], TODAY);
    expect(starting.when).toBe("Nov 01 – Nov 03");
    const [begun] = futureMarks([trip(TODAY, "2026-11-03")], TODAY);
    expect(begun.when).toBe("Day 2/3");
  });

  it("drops an event that ends today", () => {
    expect(futureMarks([trip("2026-10-29", "2026-11-01")], TODAY)).toEqual([]);
  });

  it("covers every day of one that hasn't started", () => {
    const [mark] = futureMarks([trip("2026-11-03", "2026-11-06")], TODAY);
    expect(mark).toMatchObject({ day: 3, lastDay: 5, title: "Trip", when: "Nov 03 – Nov 05" });
  });

  it("stops at the edge of the two weeks", () => {
    const [mark] = futureMarks([trip("2026-11-10", "2026-12-01")], TODAY);
    expect(mark).toMatchObject({ day: 10, lastDay: 14, when: "Nov 10 – Nov 30" });
  });

  it("leaves a single day as it was", () => {
    const [mark] = futureMarks([event({ date: "2026-11-02", title: "Lunch" })], TODAY);
    expect(mark).toMatchObject({ day: 2, lastDay: 2, title: "Lunch", when: null });
  });

  it("gives imports all four Google colours, in any theme", () => {
    const [mark] = futureMarks([event({ date: "2026-11-02", gcalImported: true })], TODAY);
    expect(mark.colors).toEqual([GOOGLE.blue, GOOGLE.red, GOOGLE.yellow, GOOGLE.green]);
    expect(mark.kind).toBe("Google Event");
  });
});

describe("the dial", () => {
  it("puts a node on each day and counts what overlaps", () => {
    const marks = futureMarks([trip("2026-11-01", "2026-11-04"), event({ id: "lunch", date: "2026-11-02", tier: "epic" })], TODAY);
    const nodes = futureNodes(marks);
    expect(nodes.map(n => n.day)).toEqual([1, 2, 3]);
    expect(nodes.find(n => n.day === 2)).toMatchObject({ count: 2 });
    expect(nodes.find(n => n.day === 2)?.colors).toHaveLength(2);
  });

  it("draws a line only for an event that covers more than one day", () => {
    const marks = futureMarks([trip("2026-11-01", "2026-11-04"), event({ id: "lunch", date: "2026-11-07" })], TODAY);
    const { container } = render(<FutureEmblem marks={marks} active />);
    const arcs = container.querySelectorAll("[data-saga=future-arc]");
    expect(arcs).toHaveLength(1);
    expect(arcs[0].querySelector(".tm-gauge-shimmer")).not.toBeNull();
    expect(container.querySelectorAll("[data-saga=future-node]")).toHaveLength(4);
  });

  it("breaks overlapping events into stretches, with both colours on the shared one", () => {
    const main = trip("2026-11-01", "2026-11-06");
    const epic = trip("2026-11-03", "2026-11-09", { id: "epic", tier: "epic" });
    const marks = futureMarks([main, epic], TODAY);
    const [one, both, two] = marks.map(m => m.color);
    expect(one).not.toBe(both);
    expect(two).toBeUndefined();
    expect(futureSegments(marks)).toEqual([
      { from: 1, to: 3, colors: [one] },
      { from: 3, to: 5, colors: [one, both] },
      { from: 5, to: 8, colors: [both] },
    ]);
  });

  it("makes the shared stretch shimmer, and leaves the rest steady", () => {
    const marks = futureMarks([trip("2026-11-01", "2026-11-06"), trip("2026-11-03", "2026-11-09", { id: "epic", tier: "epic" })], TODAY);
    const { container } = render(<FutureEmblem marks={marks} active />);
    const arcs = Array.from(container.querySelectorAll("[data-saga=future-arc]"));
    expect(arcs.map(a => a.getAttribute("data-colors"))).toEqual(["1", "2", "1"]);
    expect(arcs[1].getAttribute("class")).toContain("tm-node-shimmer");
    expect(arcs[0].getAttribute("class")).toBeNull();
  });

  it("doesn't merge a gap between two events into one line", () => {
    const marks = futureMarks([trip("2026-11-01", "2026-11-03"), trip("2026-11-05", "2026-11-07", { id: "later" })], TODAY);
    expect(futureSegments(marks).map(s => [s.from, s.to])).toEqual([[1, 2], [5, 6]]);
  });

  it("shimmers an import's line through Google's colours", () => {
    const marks = futureMarks([trip("2026-11-01", "2026-11-04", { gcalImported: true })], TODAY);
    const { container } = render(<FutureEmblem marks={marks} active />);
    const arc = container.querySelector("[data-saga=future-arc]");
    expect(arc?.getAttribute("class")).toContain("tm-node-shimmer");
    expect(arc?.getAttribute("data-colors")).toBe("4");
  });
});

describe("GoogleSyncMark", () => {
  it("points up for an item made here and down for one that came from Google", () => {
    const { rerender, container } = render(<GoogleSyncMark fromGoogle={false} />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("Created here");
    expect(container.querySelector(".lucide-arrow-up")).not.toBeNull();
    rerender(<GoogleSyncMark fromGoogle />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("Came from Google");
    expect(container.querySelector(".lucide-arrow-down")).not.toBeNull();
  });
});

describe("FutureSightCard", () => {
  it("shows a running event from tomorrow, with the day it will have reached", () => {
    render(<FutureSightCard events={[trip("2026-10-29", "2026-11-04")]} />);
    expect(screen.getByText("Trip")).toBeTruthy();
    expect(screen.getByText("· Day 4/6")).toBeTruthy();
    expect(screen.getByText("Tomorrow")).toBeTruthy();
  });

  it("shows the dates of one that hasn't begun", () => {
    render(<FutureSightCard events={[trip("2026-11-03", "2026-11-06")]} />);
    expect(screen.getByText("· Nov 03 – Nov 05")).toBeTruthy();
  });

  it("leaves out an overnight event that started today", () => {
    render(<FutureSightCard events={[event({ startTime: new Date(`${TODAY}T23:00:00`), endTime: new Date("2026-11-01T01:00:00") })]} />);
    expect(screen.queryByText("Trip")).toBeNull();
  });
});
