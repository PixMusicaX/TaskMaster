// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import HistoryList from "@/components/HistoryList";
import { getHistory, type HistoryDay } from "@/app/actions/history";

vi.mock("@/app/actions/history", () => ({ getHistory: vi.fn() }));

const day = (overrides: Partial<HistoryDay>): HistoryDay => ({
  date: "2026-09-18", notes: [], events: [], specialDays: [], tasks: [], habits: [], relief: null, ...overrides,
});
const noteRow = (content: string, mood = "neutral") => ({
  id: `n-${content}`, userId: "u", content, mood, date: "2026-09-18", createdAt: new Date(), updatedAt: new Date(),
});
const lines = (...texts: string[]) => JSON.stringify(texts.map((text, i) => ({ id: `l${i}`, bullet: "○", text })));

afterEach(cleanup);

describe("HistoryList", () => {
  it("shows a mood-only note as just the emoji, with no empty Notes section", async () => {
    vi.mocked(getHistory).mockResolvedValue([
      day({ notes: [noteRow(lines(""), "good")], tasks: [{ id: "t1", title: "Call Bishal" } as HistoryDay["tasks"][number]] }),
    ]);
    render(<HistoryList />);

    expect(await screen.findByText("Friday, September 18th 2026")).toBeTruthy();
    expect(screen.getByText("😇")).toBeTruthy();
    expect(screen.getByText("Call Bishal")).toBeTruthy();
    expect(screen.queryByText("Notes")).toBeNull();
    expect(screen.queryByText("○")).toBeNull();
  });

  it("renders only the note lines that have text", async () => {
    vi.mocked(getHistory).mockResolvedValue([day({ notes: [noteRow(lines("Went hiking", "", "Read a book"))] })]);
    render(<HistoryList />);

    expect(await screen.findByText("Went hiking")).toBeTruthy();
    expect(screen.getByText("Read a book")).toBeTruthy();
    expect(screen.getAllByText("○")).toHaveLength(2);
  });

  it("says so when a day with only a mood has nothing else", async () => {
    vi.mocked(getHistory).mockResolvedValue([day({ notes: [noteRow(lines(""), "bad")] })]);
    render(<HistoryList />);
    expect(await screen.findByText("No activities recorded on this day.")).toBeTruthy();
  });

  it("shows an empty state when there is no history", async () => {
    vi.mocked(getHistory).mockResolvedValue([]);
    render(<HistoryList />);
    expect(await screen.findByText("No history found for this period.")).toBeTruthy();
  });
});
