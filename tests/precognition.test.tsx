// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import FutureSightCard from "@/components/home/future-sight-card";
import { FutureEmblem, futureMarks, futureNodes } from "@/components/home/saga-time-scenes";
import { GOOGLE } from "@/components/google-mark";
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

  it("shimmers an import's line through Google's colours", () => {
    const marks = futureMarks([trip("2026-11-01", "2026-11-04", { gcalImported: true })], TODAY);
    const { container } = render(<FutureEmblem marks={marks} active />);
    const arc = container.querySelector("[data-saga=future-arc]");
    expect(arc?.getAttribute("class")).toContain("tm-node-shimmer");
    expect(arc?.getAttribute("data-colors")).toBe("4");
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
