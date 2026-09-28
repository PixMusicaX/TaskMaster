import { describe, it, expect, beforeEach } from "vitest";
import { getHistory, getOnThisDay } from "@/app/actions/history";
import { setToday, noteLines, insertNote, insertEvent, insertHabit, insertHabitLog, insertRelief } from "./helpers/fixtures";

beforeEach(() => setToday("2026-09-28"));

describe("getHistory (paged)", () => {
  it("groups each day's notes, tasks, events, special days and habits, newest day first", async () => {
    const h = await insertHabit({ name: "Gym" });
    await insertNote("2026-09-20", noteLines("wrote"), "good");
    await insertEvent({ title: "Finished", date: "2026-09-20", completed: true });
    await insertEvent({ title: "Unfinished", date: "2026-09-20" });
    await insertEvent({ title: "Concert", type: "event", date: "2026-09-21" });
    await insertEvent({ title: "Holiday", type: "special_day", date: "2026-09-21" });
    await insertHabitLog(h.id, "2026-09-21", "Gym");
    await insertNote("2026-08-01", noteLines("too old"));

    const days = await getHistory("2026-09-27", 28, "", "2026-09-28");

    expect(days.map(d => d.date)).toEqual(["2026-09-21", "2026-09-20"]);
    const [sep21, sep20] = days;
    expect(sep21.events.map(e => e.title)).toEqual(["Concert"]);
    expect(sep21.specialDays.map(e => e.title)).toEqual(["Holiday"]);
    expect(sep21.habits.map(l => l.habitName)).toEqual(["Gym"]);
    expect(sep20.notes[0].mood).toBe("good");
    expect(sep20.tasks.map(t => t.title)).toEqual(["Finished"]);
  });

  it("returns nothing for an empty period", async () => {
    expect(await getHistory("2026-09-27", 28, "", "2026-09-28")).toEqual([]);
  });

  it("attaches relief info, carrying the last known location forward", async () => {
    await insertRelief({ date: "2026-08-01", location: "Bengaluru", weather: "Rainy", temp: "24" }); // before the page
    await insertRelief({ date: "2026-09-20", location: "No location found" });
    await insertRelief({ date: "2026-09-21", location: "Mumbai", weather: "Clear", temp: "30" });
    await insertNote("2026-09-20", noteLines("a"));
    await insertNote("2026-09-21", noteLines("b"));

    const days = await getHistory("2026-09-27", 28, "", "2026-09-28");
    const byDate = Object.fromEntries(days.map(d => [d.date, d.relief]));
    expect(byDate["2026-09-20"]).toMatchObject({ location: "Bengaluru", weather: "Rainy", temp: "24" });
    expect(byDate["2026-09-21"]).toMatchObject({ location: "Mumbai", weather: "Clear", temp: "30" });
  });
});

describe("getHistory (search)", () => {
  it("finds days by note text, event title or habit name, but never today or later", async () => {
    await insertNote("2026-05-02", noteLines("bought an umbrella"));
    await insertEvent({ title: "Buy an Umbrella", date: "2026-07-22", completed: true });
    await insertEvent({ title: "Other task", date: "2026-07-22", completed: true });
    await insertEvent({ title: "Umbrella shopping", type: "event", date: "2026-10-01" });
    await insertNote("2026-06-01", noteLines("nothing relevant"));

    const days = await getHistory("", 28, "umbrella", "2026-09-28");
    expect(days.map(d => d.date)).toEqual(["2026-07-22", "2026-05-02"]);
    // Matched days come back with all of that day's content
    expect(days[0].tasks.map(t => t.title).sort()).toEqual(["Buy an Umbrella", "Other task"]);
  });

  it("finds a day by a typed date", async () => {
    await insertNote("2026-07-22", noteLines("some day"));
    const days = await getHistory("", 28, "July 22", "2026-09-28");
    expect(days.map(d => d.date)).toEqual(["2026-07-22"]);
  });

  it("returns nothing when nothing matches", async () => {
    await insertNote("2026-07-22", noteLines("some day"));
    expect(await getHistory("", 28, "zzz-no-match", "2026-09-28")).toEqual([]);
  });
});

describe("getOnThisDay", () => {
  it("returns today's date in earlier years, newest first", async () => {
    await insertNote("2025-09-28", noteLines("last year"), "good");
    await insertNote("2023-09-28", noteLines("three years ago"));
    await insertNote("2025-09-27", noteLines("wrong day"));
    await insertNote("2026-09-28", noteLines("today itself"));

    const days = await getOnThisDay("2026-09-28");
    expect(days.map(d => d.date)).toEqual(["2025-09-28", "2023-09-28"]);
    expect(days[0].notes[0].mood).toBe("good");
  });

  it("ignores years that only have holidays or other system entries", async () => {
    await insertEvent({ title: "Holiday", type: "special_day", date: "2025-09-28", isApi: true });
    await insertEvent({ title: "Birthday copy", type: "event", date: "2024-09-28", isApi: true });
    await insertEvent({ title: "My concert", type: "event", date: "2023-09-28" });

    const days = await getOnThisDay("2026-09-28");
    expect(days.map(d => d.date)).toEqual(["2023-09-28"]);
    expect(days[0].specialDays).toEqual([]);
  });

  it("counts completed tasks and habits, not open tasks", async () => {
    const h = await insertHabit({ name: "Gym" });
    await insertHabitLog(h.id, "2025-09-28", "Gym");
    await insertEvent({ title: "Done", date: "2024-09-28", completed: true });
    await insertEvent({ title: "Never done", date: "2023-09-28" });

    const days = await getOnThisDay("2026-09-28");
    expect(days.map(d => d.date)).toEqual(["2025-09-28", "2024-09-28"]);
  });

  it("returns nothing on a date with no past", async () => {
    expect(await getOnThisDay("2026-09-28")).toEqual([]);
  });
});
