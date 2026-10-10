import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { createDemoSession, deleteDemoUser, isDemoUser, purgeExpiredDemos, seedDemoPlanner } from "@/lib/data/demo";
import { startDemo, endDemo } from "@/app/actions/demo";
import { getProfile, getSeasonTimeline } from "@/app/actions/gamification";
import { getDashboardTasks, getEventsByDateRange, syncMonthlyHolidays, changeHolidayRegion } from "@/app/actions/events";
import { getHabits } from "@/app/actions/habits";
import { getRecentNotes, saveNote } from "@/app/actions/notes";
import { getOnThisDay } from "@/app/actions/history";
import { getHomeNudges } from "@/app/actions/account";
import { getUserId } from "@/lib/current-user";
import { event, habit, note, session, user } from "@/db/schema";
import { DEMO_NAME, isDemoEmail } from "@/lib/demo";
import { db } from "./helpers/test-db";
import { insertNote, noteLines, setToday } from "./helpers/fixtures";
import { actAs, TEST_USER_ID } from "./helpers/user";

// What the browser would hold, and where the server sent it
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined),
    set: (name: string, value: string) => { jar.set(name, value); },
    delete: (name: string) => { jar.delete(name); },
  }),
  headers: async () => new Headers({ "user-agent": "vitest", "x-forwarded-proto": "https" }),
}));
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Error(`REDIRECT ${to}`); } }));
vi.mock("@/auth", () => ({ signOut: vi.fn() }));

const TODAY = "2026-10-10";
// A fixed sequence, so a seeded planner is the same on every run
const steady = () => { let i = 0; return () => ((i++ * 0.6180339887) % 1); };
const demoUsers = async () => (await db.select().from(user)).filter(u => isDemoEmail(u.email));

beforeEach(() => {
  setToday(TODAY);
  jar.clear();
});

describe("starting a demo", () => {
  it("makes a temporary account, fills it, signs the visitor in and sends them to their planner", async () => {
    vi.mocked(getUserId).mockResolvedValueOnce(null);
    await expect(startDemo(TODAY, -330)).rejects.toThrow("REDIRECT /home");

    const [demo] = await demoUsers();
    expect(demo.name).toBe(DEMO_NAME);
    const [row] = await db.select().from(session).where(eq(session.userId, demo.id));
    expect(jar.get("__Secure-authjs.session-token")).toBe(row.sessionToken);
    expect(row.expires.getTime()).toBeGreaterThan(Date.now());
    expect((await db.select().from(note).where(eq(note.userId, demo.id))).length).toBeGreaterThan(20);
  });

  it("sends someone already signed in straight to their own planner, without making anything", async () => {
    await expect(startDemo(TODAY, 0)).rejects.toThrow("REDIRECT /home");
    expect(await demoUsers()).toEqual([]);
  });

  it("refuses a date it can't read", async () => {
    vi.mocked(getUserId).mockResolvedValueOnce(null);
    expect(await startDemo("tomorrow", 0)).toMatchObject({ success: false });
    expect(await demoUsers()).toEqual([]);
  });
});

describe("a demo planner", () => {
  async function demoPlanner() {
    const demo = (await createDemoSession("vitest"))!;
    await seedDemoPlanner(demo.userId, TODAY, 0, steady());
    actAs(demo.userId);
    return demo.userId;
  }

  it("has a season under way, habits, a journal, tasks for today and plans ahead", async () => {
    const id = await demoPlanner();

    const profile = await getProfile(TODAY);
    expect(profile.xp).toBeGreaterThan(300);
    expect(profile.level).toBeGreaterThan(3);
    // Earlier months have a score too, so the Hall of Fame and the eras have something to show
    expect((await getSeasonTimeline(TODAY)).seasons.filter(s => s.xp > 0).length).toBeGreaterThanOrEqual(3);

    const habits = await getHabits();
    expect(habits).toHaveLength(4);
    expect(habits.every(h => h.logs.length > 10)).toBe(true);
    expect((await getRecentNotes(30)).length).toBeGreaterThan(15);

    const tasks = await getDashboardTasks(TODAY);
    expect(tasks.filter(t => t.type === "task" && !t.completed && t.date === TODAY)).toHaveLength(3);
    expect(tasks.some(t => t.type === "task" && !t.completed && t.date < TODAY)).toBe(true);
    const ahead = await getEventsByDateRange(new Date("2026-10-11"), new Date("2026-10-24"));
    expect(ahead.filter(e => e.type === "event").length).toBeGreaterThanOrEqual(5);
    expect((await getOnThisDay(TODAY)).length).toBeGreaterThan(0);

    expect(await isDemoUser(id)).toBe(true);
    expect(await isDemoUser(TEST_USER_ID)).toBe(false);
  });

  it("dates every journal entry itself, leaving nothing to the database's defaults", async () => {
    const id = await demoPlanner();
    const notes = await db.select().from(note).where(eq(note.userId, id));
    // Each was "written" on the evening of its own day, long before the demo was made
    const anHourAgo = Date.now() - 3_600_000;
    expect(notes.every(n => n.updatedAt.getTime() < anHourAgo && n.createdAt.getTime() === n.updatedAt.getTime())).toBe(true);
  });

  it("is different each time", async () => {
    const first = (await createDemoSession("a"))!;
    const second = (await createDemoSession("b"))!;
    await seedDemoPlanner(first.userId, TODAY);
    await seedDemoPlanner(second.userId, TODAY);
    const titles = async (id: string) => (await db.select().from(event).where(eq(event.userId, id))).map(e => `${e.date} ${e.title}`).sort().join("|");
    expect(await titles(first.userId)).not.toBe(await titles(second.userId));
  });

  it("works like any other: what the visitor does shows up, and stays out of real planners", async () => {
    const id = await demoPlanner();
    await saveNote(TODAY, noteLines("trying it out"));
    expect((await getRecentNotes(1))[0].content).toContain("trying it out");

    actAs(TEST_USER_ID);
    expect(await getRecentNotes()).toEqual([]);
    expect(await db.select().from(habit).where(eq(habit.userId, TEST_USER_ID))).toEqual([]);
    expect(id).not.toBe(TEST_USER_ID);
  });

  it("never calls the holiday service, and isn't asked to personalise", async () => {
    await demoPlanner();
    // Any network call would throw (tests/setup.ts)
    expect(await syncMonthlyHolidays("2026-10-01")).toMatchObject({ success: true });
    expect(await changeHolidayRegion("JP", TODAY)).toMatchObject({ success: false });
    expect((await getHomeNudges()).personalize).toBe(false);
  });
});

describe("nothing is kept", () => {
  it("leaving deletes the demo account and everything in it", async () => {
    const demo = (await createDemoSession("vitest"))!;
    await seedDemoPlanner(demo.userId, TODAY, 0, steady());
    actAs(demo.userId);
    jar.set("__Secure-authjs.session-token", demo.sessionToken);

    await expect(endDemo()).rejects.toThrow("REDIRECT /");
    expect(await demoUsers()).toEqual([]);
    expect(await db.select().from(note).where(eq(note.userId, demo.userId))).toEqual([]);
    expect(await db.select().from(event).where(eq(event.userId, demo.userId))).toEqual([]);
    expect(await db.select().from(session).where(eq(session.userId, demo.userId))).toEqual([]);
    expect(jar.size).toBe(0);
  });

  it("can send the visitor on to sign in for real", async () => {
    const demo = (await createDemoSession("vitest"))!;
    actAs(demo.userId);
    await expect(endDemo(true)).rejects.toThrow("REDIRECT /login");
  });

  it("never deletes a real account, whoever asks", async () => {
    await insertNote("2026-10-01", "mine");
    await deleteDemoUser(TEST_USER_ID);
    await expect(endDemo()).rejects.toThrow("REDIRECT /");
    expect(await db.select().from(user).where(eq(user.id, TEST_USER_ID))).toHaveLength(1);
    expect(await db.select().from(note)).toHaveLength(1);
  });

  it("clears out demos nobody came back to close, and only those", async () => {
    const stale = (await createDemoSession("old"))!;
    const fresh = (await createDemoSession("new"))!;
    await db.update(user).set({ createdAt: new Date(Date.now() - 3 * 3_600_000) }).where(eq(user.id, stale.userId));

    await purgeExpiredDemos();
    expect((await demoUsers()).map(u => u.id)).toEqual([fresh.userId]);
    // Real accounts are never swept up, however old
    expect(await db.select().from(user).where(eq(user.id, TEST_USER_ID))).toHaveLength(1);
  });
});
