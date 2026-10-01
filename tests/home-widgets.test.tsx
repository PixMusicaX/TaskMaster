// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import SeasonPaceCard, { raceGoal } from "@/components/home/season-pace-card";
import EraHint from "@/components/home/era-hint";
import { dailyTarget } from "@/components/home/growth-saga";
import ChronicleCard from "@/components/home/chronicle-card";
import type { HistoryDay } from "@/app/actions/history";
import type { Profile, SeasonPace } from "@/lib/types";

afterEach(cleanup);

const profile = (xp: number, overrides: Partial<Profile> = {}) => ({
  xp, level: 3, levelProgress: 40, nextLevelXP: 100, weakStat: "wealth", topStat: "vitality",
  stats: { strength: 0, intelligence: 0, wealth: 0, vitality: xp, charisma: 0 },
  ...overrides,
}) as Profile;

const pace: SeasonPace = { dayOfMonth: 28, daysInMonth: 30, lastMonthName: "August", lastMonthPaceXP: 200, lastMonthTotalXP: 260 };

describe("SeasonPaceCard", () => {
  it("shows how far ahead of last month's pace you are", () => {
    render(<SeasonPaceCard profile={profile(380)} pace={pace} />);
    expect(screen.getByText("180 ahead of August's pace")).toBeTruthy();
    expect(screen.getByText("August beaten")).toBeTruthy();
    expect(screen.getByText("By 120 XP")).toBeTruthy();
    expect(screen.getByText("In 2 days")).toBeTruthy();
    expect(screen.getByText("wealth")).toBeTruthy();
  });

  it("shows how far behind you are", () => {
    render(<SeasonPaceCard profile={profile(150)} pace={pace} />);
    expect(screen.getByText("50 behind August's pace")).toBeTruthy();
  });

  it("explains when there is no previous month to race", () => {
    render(<SeasonPaceCard profile={profile(50)} pace={{ ...pace, lastMonthPaceXP: 0, lastMonthTotalXP: 0 }} />);
    expect(screen.getByText(/this season sets the bar/)).toBeTruthy();
  });

  it("shows what it takes to beat last month", () => {
    render(<SeasonPaceCard profile={profile(3260)} pace={{ ...pace, lastMonthPaceXP: 3275, lastMonthTotalXP: 3725 }} />);
    expect(screen.getByText("To beat August")).toBeTruthy();
    expect(screen.getByText("466 XP")).toBeTruthy();
    expect(screen.getByText("156 XP/day")).toBeTruthy();
  });

  it("scales the meter to the final rank, marking last month's pace and final", () => {
    render(<SeasonPaceCard profile={profile(3260)} pace={{ ...pace, lastMonthPaceXP: 3275, lastMonthTotalXP: 3725 }} />);
    expect(screen.getByText("4,400 XP")).toBeTruthy();
    expect(parseFloat(screen.getByTitle("August on day 28: 3275 XP").style.left)).toBeCloseTo(74.43, 1);
    expect(parseFloat(screen.getByTitle("August final: 3725 XP").style.left)).toBeCloseTo(84.66, 1);
    expect(screen.queryByTestId("meter-overflow")).toBeNull();
  });

  it("overflows past level 45 in the Hero class", () => {
    render(<SeasonPaceCard profile={profile(4600, { level: 47 })} pace={pace} />);
    expect(screen.getByText("+200 XP over")).toBeTruthy();
    expect(screen.getByTestId("meter-overflow")).toBeTruthy();
  });

  it("keeps 4,400 XP as the end in a normal month", () => {
    render(<SeasonPaceCard profile={profile(3260)} pace={{ ...pace, lastMonthPaceXP: 3275, lastMonthTotalXP: 3725 }} />);
    expect(screen.queryByTestId("meter-overflow-zone")).toBeNull();
    expect(screen.queryByTitle("4,400 XP · Level 45")).toBeNull();
  });

  it("stretches to fit a last month that went past 4,400", () => {
    render(<SeasonPaceCard profile={profile(3260)} pace={{ ...pace, lastMonthPaceXP: 4500, lastMonthTotalXP: 4900 }} />);
    // Bar now ends at August's final, with a tick where 4,400 falls
    expect(screen.getByText("4,900 XP")).toBeTruthy();
    expect(screen.getByText("4,400 XP")).toBeTruthy();
    expect(parseFloat(screen.getByTitle("4,400 XP · Level 45").style.left)).toBeCloseTo(89.8, 1);
    expect(parseFloat(screen.getByTitle("August on day 28: 4500 XP").style.left)).toBeCloseTo(91.84, 1);
    expect(parseFloat(screen.getByTitle("August final: 4900 XP").style.left)).toBe(100);
    expect(screen.getByTestId("meter-overflow-zone")).toBeTruthy();
    // Not overflowing yourself, so no shimmer
    expect(screen.queryByTestId("meter-overflow")).toBeNull();
  });

  it("still shows the meter when there is no previous month", () => {
    render(<SeasonPaceCard profile={profile(50)} pace={{ ...pace, lastMonthPaceXP: 0, lastMonthTotalXP: 0 }} />);
    expect(screen.getByText("4,400 XP")).toBeTruthy();
    expect(screen.queryByTitle(/final/)).toBeNull();
  });

  it("shows a loader until data arrives", () => {
    render(<SeasonPaceCard profile={null} pace={null} />);
    expect(screen.getByLabelText("Loading season pace")).toBeTruthy();
  });
});

describe("ChronicleCard", () => {
  const day = (date: string, overrides: Partial<HistoryDay> = {}): HistoryDay => ({
    date, notes: [], events: [], specialDays: [], tasks: [], habits: [], relief: null, ...overrides,
  });
  const note = (content: string, mood = "neutral") =>
    ({ id: "n", content, mood, date: "", createdAt: new Date(), updatedAt: new Date() });

  it("lists each past year with its note and links to that day in History", () => {
    render(<ChronicleCard todayStr="2026-09-28" days={[
      day("2025-09-28", { notes: [note(JSON.stringify([{ id: "1", bullet: "○", text: "Finished the Puri photos" }, { id: "2", bullet: "○", text: "" }]), "good")] }),
      day("2023-09-28", { tasks: [{ id: "t", title: "Call home" } as HistoryDay["tasks"][number]] }),
    ]} />);

    expect(screen.getByText("Finished the Puri photos")).toBeTruthy();
    expect(screen.getByText("😇")).toBeTruthy();
    expect(screen.getByText("1 yr ago")).toBeTruthy();
    expect(screen.getByText("3 yrs ago")).toBeTruthy();
    expect(screen.getByText("1 task done")).toBeTruthy();
    const links = screen.getAllByRole("link").map(a => a.getAttribute("href"));
    expect(links).toEqual(["/history?q=September%2028%202025", "/history?q=September%2028%202023"]);
  });
});

describe("raceGoal", () => {
  it("asks for everything on the last day", () => {
    expect(raceGoal(100, pace, 0)).toEqual({ label: "To beat August", value: "161 XP today" });
  });
  it("treats a tie as not yet beaten", () => {
    expect(raceGoal(260, pace, 2)).toEqual({ label: "To beat August", value: "1 XP", detail: "1 XP/day" });
  });
  it("falls back to a daily average without a previous month", () => {
    expect(raceGoal(280, { ...pace, lastMonthTotalXP: 0 }, 2)).toEqual({ label: "Daily average", value: "10 XP a day" });
  });
});

describe("EraHint", () => {
  it("says how to reach the next era", () => {
    render(<EraHint standing={{ index: 1, startIndex: 1, lastMonthName: "August", lastMonthPaceXP: 3275 }} xp={3260} />);
    expect(screen.getByText("Pass August's pace for Era III (16 XP)")).toBeTruthy();
  });

  it("says when you're ahead of last month's pace", () => {
    render(<EraHint standing={{ index: 2, startIndex: 1, lastMonthName: "August", lastMonthPaceXP: 3275 }} xp={3300} />);
    expect(screen.getByText("Ahead of August's pace")).toBeTruthy();
  });

  it("marks the final era", () => {
    render(<EraHint standing={{ index: 4, startIndex: 4, lastMonthName: "August", lastMonthPaceXP: 3275 }} xp={3000} />);
    expect(screen.getByText("Final era")).toBeTruthy();
  });
});

describe("dailyTarget (today's ring in the season pace scene)", () => {
  it("spreads what was needed this morning over the days left, today included", () => {
    // 301 XP to finish above 500, over 3 days: 101 a day
    expect(dailyTarget(240, 200, 500, 2)).toEqual({ earned: 40, target: 101, left: 61, progress: 40 / 101 });
  });
  it("is full once today's share is met", () => {
    expect(dailyTarget(320, 200, 500, 2)).toMatchObject({ left: 0, progress: 1 });
  });
  it("is full when last month was already beaten before today", () => {
    expect(dailyTarget(620, 600, 500, 2)).toEqual({ earned: 20, target: 0, left: 0, progress: 1 });
  });
});
