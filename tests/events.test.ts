import { describe, it, expect, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  addEvent, updateEvent, deleteEvent, toggleEventCompletion, getDashboardTasks,
  getEventsByDateRange, syncRecurringEvents, syncMonthlyHolidays, cleanupDuplicateSpecialDays,
} from "@/app/actions/events";
import { event } from "@/db/schema";
import { db } from "./helpers/test-db";
import { setToday, insertEvent, jsonResponse } from "./helpers/fixtures";

beforeEach(() => setToday("2026-09-28"));

describe("getDashboardTasks", () => {
  it("shows today's items plus overdue unfinished tasks only", async () => {
    await insertEvent({ title: "Today task", date: "2026-09-28" });
    await insertEvent({ title: "Today event", type: "event", date: "2026-09-28" });
    await insertEvent({ title: "Overdue task", date: "2026-09-20" });
    await insertEvent({ title: "Old done task", date: "2026-09-20", completed: true });
    await insertEvent({ title: "Old event", type: "event", date: "2026-09-20" });
    await insertEvent({ title: "Future task", date: "2026-09-30" });

    const titles = (await getDashboardTasks("2026-09-28")).map(e => e.title);
    expect(titles.sort()).toEqual(["Overdue task", "Today event", "Today task"]);
  });
});

describe("getEventsByDateRange", () => {
  it("returns events within the range ordered by date", async () => {
    await insertEvent({ title: "B", date: "2026-09-12" });
    await insertEvent({ title: "A", date: "2026-09-10" });
    await insertEvent({ title: "Out", date: "2026-10-01" });
    const events = await getEventsByDateRange(new Date("2026-09-01T00:00:00"), new Date("2026-09-30T00:00:00"));
    expect(events.map(e => e.title)).toEqual(["A", "B"]);
  });
});

describe("toggleEventCompletion", () => {
  it("moves a completed task to the day it was actually completed", async () => {
    const t = await insertEvent({ title: "Late task", date: "2026-09-01" });
    const updated = await toggleEventCompletion(t.id, true);
    expect(updated).toMatchObject({ completed: true, date: "2026-09-28" });
  });

  it("keeps an event's date when it is completed", async () => {
    const e = await insertEvent({ title: "Meetup", type: "event", date: "2026-09-01" });
    const updated = await toggleEventCompletion(e.id, true);
    expect(updated).toMatchObject({ completed: true, date: "2026-09-01" });
  });

  it("returns null for an unknown id", async () => {
    expect(await toggleEventCompletion("missing", true)).toBeNull();
  });
});

describe("updateEvent / deleteEvent", () => {
  it("updates user events but never system (API) events", async () => {
    const mine = await insertEvent({ title: "Mine", date: "2026-09-10" });
    const api = await insertEvent({ title: "Holiday copy", type: "event", date: "2026-09-10", isApi: true });

    await updateEvent(mine.id, { title: "Mine (edited)" });
    await updateEvent(api.id, { title: "Hacked" });

    const rows = await db.select().from(event);
    expect(rows.find(r => r.id === mine.id)?.title).toBe("Mine (edited)");
    expect(rows.find(r => r.id === api.id)?.title).toBe("Holiday copy");
  });

  it("deletes a single event, but refuses to delete system events", async () => {
    const mine = await insertEvent({ title: "Mine", date: "2026-09-10" });
    const api = await insertEvent({ title: "Recurring copy", type: "event", date: "2027-09-10", isApi: true });
    await deleteEvent(mine.id);
    await deleteEvent(api.id);
    expect((await db.select().from(event)).map(r => r.title)).toEqual(["Recurring copy"]);
  });
});

describe("recurring events", () => {
  it("creates yearly copies for the next years, once", async () => {
    await addEvent({ title: "Birthday", type: "event", date: "2026-03-15", repeatsYearly: true, startTime: new Date("2026-03-15T19:00:00") });

    const rows = (await db.select().from(event).where(eq(event.title, "Birthday"))).sort((a, b) => a.date.localeCompare(b.date));
    expect(rows.map(r => r.date)).toEqual(["2026-03-15", "2027-03-15", "2028-03-15", "2029-03-15"]);
    expect(rows.slice(1).every(r => r.isApi && !r.completed)).toBe(true);
    expect(rows[1].startTime?.getFullYear()).toBe(2027);

    // Running the sync again adds nothing
    expect(await syncRecurringEvents()).toBe(0);
  });

  it("deleting the source removes every yearly copy", async () => {
    const source = await addEvent({ title: "Anniversary", type: "event", date: "2026-07-28", repeatsYearly: true });
    await insertEvent({ title: "Other", type: "event", date: "2027-07-28" });
    await deleteEvent(source.id);
    expect((await db.select().from(event)).map(r => r.title)).toEqual(["Other"]);
  });
});

describe("holiday sync", () => {
  const holidaysFor = (year: string) => ({
    meta: { code: 200 },
    response: {
      holidays: [
        { name: "Republic Day", description: "National holiday", date: { iso: `${year}-01-26` } },
        { name: "Republic Day", description: "Duplicate from API", date: { iso: `${year}-01-26T00:00:00` } },
        { name: "Diwali", description: "Festival", date: { iso: `${year}-11-08` } },
      ],
    },
  });

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const year = new URL(url).searchParams.get("year")!;
      return jsonResponse(holidaysFor(year));
    }));
  });

  it("inserts each year's holidays once and is idempotent", async () => {
    const first = await syncMonthlyHolidays("2026-09-01");
    expect(first.success).toBe(true);

    const rows = await db.select().from(event).where(eq(event.type, "special_day"));
    expect(rows).toHaveLength(8); // 2 unique holidays x 4 years
    expect(rows.every(r => r.isApi)).toBe(true);

    await syncMonthlyHolidays("2026-09-01");
    expect(await db.select().from(event).where(eq(event.type, "special_day"))).toHaveLength(8);
  });

  it("only runs on the first of the month unless a date is forced", async () => {
    const result = await syncMonthlyHolidays();
    expect(result).toEqual({ success: false, message: "Not the first of the month" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("cleans up timed duplicate special days", async () => {
    await insertEvent({ title: "Dup", type: "special_day", date: "2026-10-02", startTime: new Date("2026-10-02T00:00:00") });
    await insertEvent({ title: "Keep", type: "special_day", date: "2026-10-02" });

    const result = await cleanupDuplicateSpecialDays();
    expect(result.count).toBe(1);
    const rows = await db.select().from(event);
    expect(rows.map(r => r.title)).toEqual(["Keep"]);
    expect(rows[0].isApi).toBe(true);
  });
});
