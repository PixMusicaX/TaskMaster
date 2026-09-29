// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import RecapModal from "@/components/RecapModal";
import type { SeasonRecap } from "@/lib/types";

afterEach(cleanup);

const recap: SeasonRecap = {
  period: "2026-08", monthName: "August", year: 2026, daysInMonth: 31,
  xp: 3725, level: 38, title: "Paladin", topStat: "vitality", weakStat: "charisma",
  stats: { strength: 900, intelligence: 800, wealth: 700, vitality: 1200, charisma: 125 },
  previous: { monthName: "July", xp: 3000, level: 31, title: "Sentinel" },
  seasonRank: 1, seasonsCompared: 6, activeDays: 29,
  busiestDay: { date: "2026-08-14", count: 12 },
  notes: { days: 27, lines: 140 }, moods: { good: 18, neutral: 8, bad: 3 },
  habits: { checks: 90, top: { name: "Gym", icon: null, checks: 20, scheduledDays: 22, bestStreak: 9 } },
  tasksDone: 40, quests: { done: 6, epic: 1 }, missionsDone: 30,
  nextSeason: { monthName: "September", daysInMonth: 30 },
  era: { start: 1, end: 2, next: 2 },
};

describe("RecapModal", () => {
  it("shows the verdict, comparison, counts, highlights and next goal", () => {
    render(<RecapModal recap={recap} isOpen onClose={() => {}} />);

    expect(screen.getByRole("dialog", { name: "August season recap" })).toBeTruthy();
    expect(screen.getByText("Your best of the last 6 seasons")).toBeTruthy();
    expect(screen.getByText("Paladin")).toBeTruthy();
    expect(screen.getByText("+725 vs July")).toBeTruthy();
    expect(screen.getByText("#1 of 6 seasons")).toBeTruthy();
    expect(screen.getByText("29/31")).toBeTruthy();
    expect(screen.getByText("Gym on 20 of 22 scheduled days, best run 9 in a row")).toBeTruthy();
    expect(screen.getByText("To top August in September: 3,726 XP")).toBeTruthy();
    expect(screen.getByText("Ended in the Era of Order")).toBeTruthy();
    expect(screen.getByText("September starts at Era III · Order, one higher")).toBeTruthy();
  });

  it("closes from the button, the close icon and Escape", () => {
    const onClose = vi.fn();
    render(<RecapModal recap={recap} isOpen onClose={onClose} />);
    fireEvent.click(screen.getByText("Begin September"));
    fireEvent.click(screen.getByLabelText("Close recap"));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("renders nothing when closed", () => {
    render(<RecapModal recap={recap} isOpen={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
