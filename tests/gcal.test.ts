import { describe, it, expect, beforeEach, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { addEvent, addToTaskmaster, deleteEvent, getCalendarEvents, getDashboardTasks, toggleEventCompletion, updateEvent } from "@/app/actions/events";
import { getProfile } from "@/app/actions/gamification";
import { disconnectGoogleCalendar, getGoogleCalendarStatus, syncGoogleCalendar } from "@/app/actions/google-calendar";
import { deletePrunedData } from "@/app/actions/prune";
import { askTaskmaster } from "@/app/actions/taskmaster";
import { GET as callback } from "@/app/api/gcal/callback/route";
import { event, gcalConnection, gcalOutbox } from "@/db/schema";
import { encryptSecret } from "@/lib/ai-config";
import { safeGenerateContent } from "@/lib/ai-utils";
import { plannerEventsByDateRange } from "@/lib/data/events";
import { dayTitle, multiDayLength, multiDayPart, occursOn } from "@/lib/multi-day";
import { fromGoogle, googleIdFor, isSyncable, shiftedEnd, toGoogle, type GoogleEvent } from "@/lib/gcal/map";
import { syncUser } from "@/lib/gcal/sync";
import type { EventRow } from "@/lib/types";
import { db } from "./helpers/test-db";
import { insertEvent, setToday } from "./helpers/fixtures";
import { OTHER_USER_ID, TEST_USER_ID, actAs } from "./helpers/user";

process.env.AUTH_SECRET = "test-secret";
process.env.AUTH_GOOGLE_ID = "client-id";

// `after` only works inside a request. Collected here and run by flush(), so a test can look at
// what a change queued before it goes out.
const later = vi.hoisted(() => [] as (() => Promise<void>)[]);
vi.mock("next/server", async (original) => ({
  ...await original<typeof import("next/server")>(),
  after: (task: () => Promise<void>) => { later.push(task); },
}));

async function flush() {
  for (const task of later.splice(0)) await task();
}

const TODAY = "2026-10-10";

type Sent = { method: string; url: string; body?: Record<string, unknown> };

// A stand-in for Google. `lists` answers calendar reads in order; everything else succeeds.
function fakeGoogle(lists: (object | number)[] = [], { tokenStatus = 200, writeStatus = 200 } = {}) {
  const sent: Sent[] = [];
  const reply = (body: unknown, status = 200) =>
    ({ ok: status < 400, status, json: async () => body }) as Response;

  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? "GET";
    if (url.includes("oauth2.googleapis.com/token")) {
      return reply({ access_token: "access", refresh_token: "new-refresh", scope: "https://www.googleapis.com/auth/calendar.events" }, tokenStatus);
    }
    if (url.includes("oauth2.googleapis.com/revoke")) {
      sent.push({ method, url });
      return reply({});
    }
    if (method === "GET") {
      sent.push({ method, url });
      const next = lists.shift() ?? { items: [], nextSyncToken: "tail", timeZone: "UTC" };
      return typeof next === "number" ? reply({}, next) : reply(next);
    }
    const body = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
    sent.push({ method, url, body });
    return reply({ etag: `"pushed"` }, writeStatus);
  }));

  return { sent, writes: () => sent.filter(s => s.method !== "GET" && !s.url.includes("revoke")) };
}

const googleEvent = (id: string, day = TODAY, extra: Partial<GoogleEvent> = {}): GoogleEvent => ({
  id,
  etag: `"${id}-1"`,
  status: "confirmed",
  summary: `Google ${id}`,
  start: { dateTime: `${day}T14:00:00Z` },
  end: { dateTime: `${day}T15:30:00Z` },
  organizer: { self: true },
  ...extra,
});

const page = (items: GoogleEvent[], nextSyncToken = "token-1") => ({ items, nextSyncToken, timeZone: "UTC" });

async function connect(values: Partial<typeof gcalConnection.$inferInsert> = {}) {
  await db.insert(gcalConnection).values({ userId: TEST_USER_ID, refreshToken: encryptSecret("refresh"), ...values });
}

// Connected and already past the first sync, so one list call answers each round
const synced = () => connect({ syncFrom: "2026-10-01", syncToken: "token-0", fullSyncedAt: new Date(), timeZone: "UTC" });

const rows = () => db.select().from(event).where(eq(event.userId, TEST_USER_ID));
const rowFor = async (gcalEventId: string) => (await rows()).find(r => r.gcalEventId === gcalEventId);
// Rounds right after each other would otherwise be turned away as too soon
const releaseLock = () => db.update(gcalConnection).set({ syncStartedAt: null });

beforeEach(() => {
  setToday(TODAY);
  later.length = 0;
});

describe("the first sync", () => {
  it("imports from the day of the first sync, and nothing older", async () => {
    await connect();
    fakeGoogle([page([googleEvent("old", "2026-10-09"), googleEvent("now"), googleEvent("soon", "2026-10-20")])]);

    expect(await syncUser(TEST_USER_ID)).toEqual({ ran: true, changed: 2 });

    expect((await rows()).map(r => r.gcalEventId).sort()).toEqual(["now", "soon"]);
    const [connection] = await db.select().from(gcalConnection);
    expect(connection).toMatchObject({ syncFrom: TODAY, syncToken: "token-1", timeZone: "UTC", lastError: null });
    expect(await rowFor("now")).toMatchObject({
      type: "event", gcalImported: true, gcalOrigin: true, gcalSync: true, gcalReadOnly: false, notification: false,
      endTime: new Date(`${TODAY}T15:30:00Z`),
    });
  });

  it("marks someone else's invite read-only and skips declined and working-location entries", async () => {
    await connect();
    fakeGoogle([page([
      googleEvent("invite", TODAY, { organizer: { self: false } }),
      googleEvent("declined", TODAY, { attendees: [{ self: true, responseStatus: "declined" }] }),
      googleEvent("office", TODAY, { eventType: "workingLocation" }),
    ])]);
    await syncUser(TEST_USER_ID);
    expect((await rows()).map(r => r.gcalEventId)).toEqual(["invite"]);
    expect(await rowFor("invite")).toMatchObject({ gcalReadOnly: true });
    expect(await updateEvent((await rowFor("invite"))!.id, { title: "Mine now" })).toBeUndefined();
  });
});

describe("XP", () => {
  beforeEach(async () => {
    await connect();
    fakeGoogle([page([googleEvent("past", "2026-10-10", { start: { dateTime: "2026-10-10T01:00:00Z" }, end: { dateTime: "2026-10-10T02:00:00Z" } })])]);
    await syncUser(TEST_USER_ID);
  });

  it("gives nothing for an imported event, even once it has passed", async () => {
    expect((await getProfile("2026-10-11")).xp).toBe(0);
  });

  it("pays for a task once it's added and ticked off", async () => {
    const row = (await rowFor("past"))!;
    await addToTaskmaster(row.id, "task");
    expect((await getProfile("2026-10-11")).xp).toBe(0);
    await toggleEventCompletion(row.id, true);
    expect((await getProfile("2026-10-11")).xp).toBe(30);
  });

  it("pays an event's tier once it's added", async () => {
    const row = (await rowFor("past"))!;
    expect(await addToTaskmaster(row.id, "event", "epic")).toMatchObject({ type: "event", tier: "epic", gcalImported: false, gcalOrigin: true });
    expect((await getProfile("2026-10-11")).xp).toBe(80);
  });

  it("can't be earned by editing an import into a task", async () => {
    const row = (await rowFor("past"))!;
    await updateEvent(row.id, { title: "Renamed", type: "task", tier: "epic" });
    expect(await rowFor("past")).toMatchObject({ title: "Renamed", type: "event", tier: "side", gcalImported: true });
  });

  it("only adds this player's imports", async () => {
    const row = (await rowFor("past"))!;
    actAs(OTHER_USER_ID);
    expect(await addToTaskmaster(row.id, "task")).toBeNull();
    actAs(TEST_USER_ID);
    expect(await rowFor("past")).toMatchObject({ gcalImported: true });
  });
});

describe("the AI", () => {
  beforeEach(async () => {
    await connect();
    fakeGoogle([page([googleEvent("secret", TODAY, { summary: "Private meeting" })])]);
    await syncUser(TEST_USER_ID);
  });

  it("doesn't get imports until they're added to TaskMaster", async () => {
    const day = new Date(`${TODAY}T00:00:00`);
    expect(await plannerEventsByDateRange(TEST_USER_ID, day, day)).toEqual([]);
    await addToTaskmaster((await rowFor("secret"))!.id, "task");
    expect((await plannerEventsByDateRange(TEST_USER_ID, day, day)).map(r => r.title)).toEqual(["Private meeting"]);
  });

  it("can't reach imports through the Taskmaster's own queries", async () => {
    vi.mocked(safeGenerateContent).mockResolvedValueOnce(`SELECT "title" FROM "Event"`).mockResolvedValueOnce("Nothing planned.");
    await askTaskmaster("What's on today?", TODAY);
    expect(JSON.stringify(vi.mocked(safeGenerateContent).mock.calls)).not.toContain("Private meeting");
  });
});

describe("sending changes to Google", () => {
  const newTask = { title: "Write report", date: TODAY, type: "task", startTime: new Date(`${TODAY}T09:00:00Z`) };

  it("sends new tasks and events by default, in the row's own id and without emailing guests", async () => {
    await synced();
    const google = fakeGoogle();
    const task = await addEvent(newTask);
    await flush();

    const [write] = google.writes();
    expect(write).toMatchObject({ method: "POST", body: { id: googleIdFor(task.id), summary: "Write report", transparency: "transparent" } });
    expect(write.url).toContain("sendUpdates=none");
    expect((write.body!.end as { dateTime: string }).dateTime).toBe(new Date(`${TODAY}T10:00:00Z`).toISOString());
    expect((await rows())[0]).toMatchObject({ gcalSync: true, gcalEventId: googleIdFor(task.id), gcalEtag: `"pushed"` });
    expect(await db.select().from(gcalOutbox)).toEqual([]);
  });

  it("leaves it out when the toggle is off, or there's no connection", async () => {
    const google = fakeGoogle();
    expect(await addEvent(newTask)).toMatchObject({ gcalSync: false });
    await synced();
    expect(await addEvent({ ...newTask, gcalSync: false })).toMatchObject({ gcalSync: false });
    await flush();
    expect(google.writes()).toEqual([]);
  });

  it("keeps special days and yearly repeats in the app", async () => {
    await synced();
    const google = fakeGoogle();
    expect(await addEvent({ title: "Birthday", date: TODAY, type: "special_day" })).toMatchObject({ gcalSync: false });
    expect(await addEvent({ ...newTask, repeatsYearly: true })).toMatchObject({ gcalSync: false });
    await flush();
    expect(google.writes()).toEqual([]);
    expect((await rows()).every(r => r.gcalEventId === null)).toBe(true);
  });

  it("finishes a retry after a lost response instead of doubling the event", async () => {
    await synced();
    await addEvent(newTask);
    const google = fakeGoogle([], { writeStatus: 409 });
    await flush();
    expect(google.writes().map(w => w.method)).toEqual(["POST", "PATCH"]);
  });

  it("doesn't tell Google a task was ticked off", async () => {
    await synced();
    const google = fakeGoogle();
    const task = await addEvent(newTask);
    await flush();
    await toggleEventCompletion(task.id, true);
    await flush();
    expect(google.writes()).toHaveLength(1);
  });

  it("moves an end along with its start", async () => {
    await synced();
    fakeGoogle();
    const row = await insertEvent({
      title: "Workshop", date: TODAY, type: "event",
      startTime: new Date(`${TODAY}T10:00:00Z`), endTime: new Date(`${TODAY}T12:00:00Z`),
    });
    const updated = await updateEvent(row.id, { startTime: new Date(`${TODAY}T15:00:00Z`) });
    expect(updated?.endTime).toEqual(new Date(`${TODAY}T17:00:00Z`));
  });

  it("stops following Google when the toggle is turned off, leaving both copies", async () => {
    await synced();
    const google = fakeGoogle([page([googleEvent("mine", TODAY, { etag: `"changed"`, summary: "Changed in Google" })])]);
    const row = await insertEvent({ title: "Mine", date: TODAY, type: "event", gcalEventId: "mine", gcalEtag: `"old"`, gcalSync: true });
    await updateEvent(row.id, { gcalSync: false });
    await flush();
    await syncUser(TEST_USER_ID);
    expect(await rowFor("mine")).toMatchObject({ title: "Mine", gcalSync: false });
    await deleteEvent(row.id);
    await flush();
    expect(google.writes()).toEqual([]);
  });

  it("lets a queued edit win over Google's copy", async () => {
    await synced();
    const row = await insertEvent({ title: "Ours", date: TODAY, type: "event", gcalEventId: "both", gcalEtag: `"old"`, gcalSync: true });
    await updateEvent(row.id, { title: "Ours, edited" });
    later.length = 0; // Still queued when the sync starts

    const google = fakeGoogle([page([googleEvent("both", TODAY, { etag: `"new"`, summary: "Theirs" })])]);
    await syncUser(TEST_USER_ID);

    expect(google.sent.map(s => s.method)).toEqual(["PATCH", "GET"]);
    expect(google.writes()[0].body).toMatchObject({ summary: "Ours, edited" });
  });

  it("keeps trying after a passing failure, and drops a change Google refuses for good", async () => {
    await synced();
    await insertEvent({ title: "A", date: TODAY, type: "event", gcalSync: true });
    const [row] = await rows();
    await updateEvent(row.id, { title: "B" });
    fakeGoogle([], { writeStatus: 503 });
    await flush();
    expect(await db.select().from(gcalOutbox)).toMatchObject([{ attempts: 1 }]);

    fakeGoogle([], { writeStatus: 400 });
    await syncUser(TEST_USER_ID);
    expect(await db.select().from(gcalOutbox)).toEqual([]);
  });
});

describe("deleting", () => {
  it("removes an item that began here from Google too", async () => {
    await synced();
    const google = fakeGoogle();
    const row = await insertEvent({ title: "Mine", date: TODAY, type: "event", gcalEventId: "mine", gcalSync: true });
    await deleteEvent(row.id);
    await flush();
    expect(google.writes()).toMatchObject([{ method: "DELETE" }]);
    expect(google.writes()[0].url).toContain("/events/mine");
  });

  it("leaves Google alone for an item that began there, and doesn't import it again", async () => {
    await connect();
    const google = fakeGoogle([page([googleEvent("meeting"), googleEvent("converted")]), page([googleEvent("meeting"), googleEvent("converted")])]);
    await syncUser(TEST_USER_ID);
    await addToTaskmaster((await rowFor("converted"))!.id, "task");

    await deleteEvent((await rowFor("meeting"))!.id);
    await deleteEvent((await rowFor("converted"))!.id);
    await flush();
    expect(google.writes()).toEqual([]);

    // A full sync sees both events again
    await db.update(gcalConnection).set({ syncToken: null, syncStartedAt: null });
    await syncUser(TEST_USER_ID);
    expect(await rows()).toEqual([]);
  });

  it("leaves a read-only invite in Google but lets it go from the planner", async () => {
    await connect();
    const google = fakeGoogle([page([googleEvent("invite", TODAY, { organizer: { self: false } })])]);
    await syncUser(TEST_USER_ID);
    await deleteEvent((await rowFor("invite"))!.id);
    await flush();
    expect(await rows()).toEqual([]);
    expect(google.writes()).toEqual([]);
  });

  it("never reaches Google from a prune", async () => {
    await synced();
    const google = fakeGoogle();
    await insertEvent({ title: "Ancient", date: "2019-01-01", type: "event", gcalEventId: "ancient", gcalSync: true });
    await deletePrunedData();
    await flush();
    await syncUser(TEST_USER_ID);
    expect(await rows()).toEqual([]);
    expect(google.writes()).toEqual([]);
  });
});

describe("changes from Google", () => {
  const linked = (values: Partial<EventRow> = {}) =>
    insertEvent({ title: "Linked", date: TODAY, type: "event", gcalEventId: "linked", gcalEtag: `"linked-1"`, gcalSync: true, ...values });

  it("updates a row, keeping what the player chose for it", async () => {
    await synced();
    await linked({ tier: "epic" });
    fakeGoogle([page([googleEvent("linked", "2026-10-15", { etag: `"linked-2"`, summary: "Moved" })])]);
    await syncUser(TEST_USER_ID);
    expect(await rowFor("linked")).toMatchObject({ title: "Moved", date: "2026-10-15", tier: "epic", gcalEtag: `"linked-2"` });
  });

  it("skips its own push", async () => {
    await synced();
    await linked();
    fakeGoogle([page([googleEvent("linked", TODAY, { summary: "Same version" })])]);
    expect(await syncUser(TEST_USER_ID)).toEqual({ ran: true, changed: 0 });
    expect(await rowFor("linked")).toMatchObject({ title: "Linked" });
  });

  it("removes what was deleted there, but a completed task keeps its XP", async () => {
    await synced();
    await linked();
    await insertEvent({ title: "Done", date: TODAY, type: "task", completed: true, gcalEventId: "done", gcalSync: true });
    fakeGoogle([page([{ id: "linked", status: "cancelled" }, { id: "done", status: "cancelled" }])]);
    await syncUser(TEST_USER_ID);
    expect((await rows()).map(r => [r.title, r.gcalEventId])).toEqual([["Done", null]]);
    expect((await getProfile(TODAY)).xp).toBe(30);
  });

  it("doesn't move a completed task to Google's date", async () => {
    await synced();
    await linked({ type: "task", completed: true });
    fakeGoogle([page([googleEvent("linked", "2026-10-20", { etag: `"linked-2"` })])]);
    await syncUser(TEST_USER_ID);
    expect(await rowFor("linked")).toMatchObject({ date: TODAY, gcalEtag: `"linked-2"` });
  });

  it("starts over from the first sync's day when Google forgets its marker", async () => {
    await synced();
    const google = fakeGoogle([410, page([googleEvent("back", "2026-10-05"), googleEvent("older", "2026-09-30")], "fresh")]);
    await syncUser(TEST_USER_ID);
    expect((await rows()).map(r => r.gcalEventId)).toEqual(["back"]);
    expect(google.sent[1].url).toContain("timeMin=2026-09-30");
    expect((await db.select().from(gcalConnection))[0].syncToken).toBe("fresh");
  });

  it("redraws the window once a month, so far-off occurrences arrive", async () => {
    await synced();
    await db.update(gcalConnection).set({ fullSyncedAt: new Date("2026-09-01T00:00:00Z") });
    fakeGoogle([page([]), page([googleEvent("standup", "2026-10-30")], "fresh")]);
    await syncUser(TEST_USER_ID);
    expect(await rowFor("standup")).toBeTruthy();
  });

  it("reads every page", async () => {
    await synced();
    fakeGoogle([{ items: [googleEvent("a")], nextPageToken: "two", timeZone: "UTC" }, page([googleEvent("b")])]);
    await syncUser(TEST_USER_ID);
    expect(await rows()).toHaveLength(2);
  });
});

describe("the connection", () => {
  it("runs one sync at a time, and leaves a longer gap in the background", async () => {
    await synced();
    const google = fakeGoogle();
    expect((await syncUser(TEST_USER_ID)).ran).toBe(true);
    expect((await syncUser(TEST_USER_ID)).ran).toBe(false);
    expect((await syncUser(TEST_USER_ID, { manual: true })).ran).toBe(false);
    await releaseLock();
    expect((await syncUser(TEST_USER_ID)).ran).toBe(true);
    expect(google.sent).toHaveLength(2);
  });

  it("asks the player to reconnect when Google ends the grant, then stops trying", async () => {
    await synced();
    fakeGoogle([], { tokenStatus: 400 });
    await syncUser(TEST_USER_ID);
    expect((await getGoogleCalendarStatus()).error).toBe("reconnect");
    await releaseLock();
    expect((await syncUser(TEST_USER_ID)).ran).toBe(false);
  });

  it("keeps a failed sync's marker and clears the error on the next good one", async () => {
    await synced();
    fakeGoogle([500]);
    await syncUser(TEST_USER_ID);
    expect(await getGoogleCalendarStatus()).toMatchObject({ error: "failed" });
    expect((await db.select().from(gcalConnection))[0].syncToken).toBe("token-0");
    await releaseLock();
    fakeGoogle();
    await syncGoogleCalendar();
    expect(await getGoogleCalendarStatus()).toMatchObject({ error: null });
  });

  it("revokes access on disconnect and keeps imported rows at 0 XP", async () => {
    await connect();
    const google = fakeGoogle([page([googleEvent("kept")])]);
    await syncUser(TEST_USER_ID);
    await disconnectGoogleCalendar();
    expect(google.sent.some(s => s.url.includes("revoke"))).toBe(true);
    expect(await db.select().from(gcalConnection)).toEqual([]);
    expect(await rowFor("kept")).toMatchObject({ gcalImported: true });
    expect((await getProfile("2026-10-11")).xp).toBe(0);
  });

  it("is per player", async () => {
    await connect();
    fakeGoogle([page([googleEvent("mine")])]);
    await syncUser(TEST_USER_ID);
    actAs(OTHER_USER_ID);
    expect(await getGoogleCalendarStatus()).toMatchObject({ connected: false });
    expect((await syncUser(OTHER_USER_ID)).ran).toBe(false);
    expect(await db.select().from(event).where(and(eq(event.userId, OTHER_USER_ID)))).toEqual([]);
  });
});

describe("the consent callback", () => {
  const callbackWith = (query: string, cookie = "right") =>
    callback(new NextRequest(`http://localhost:3000/api/gcal/callback?${query}`, { headers: { cookie: `gcal_state=${cookie}` } }));

  it("stores the token encrypted", async () => {
    fakeGoogle();
    const response = await callbackWith("code=abc&state=right");
    expect(response.headers.get("location")).toContain("gcal=connected");
    const [connection] = await db.select().from(gcalConnection);
    expect(connection.userId).toBe(TEST_USER_ID);
    expect(connection.refreshToken).not.toContain("new-refresh");
  });

  it("refuses a state that doesn't match", async () => {
    fakeGoogle();
    const response = await callbackWith("code=abc&state=wrong");
    expect(response.headers.get("location")).toContain("gcal=failed");
    expect(await db.select().from(gcalConnection)).toEqual([]);
  });

  it("handles the player saying no", async () => {
    fakeGoogle();
    const response = await callbackWith("error=access_denied&state=right");
    expect(response.headers.get("location")).toContain("gcal=declined");
  });
});

describe("multi-day events", () => {
  const local = (date: string) => new Date(`${date}T12:00:00`);
  const allDay = { title: "Trip", type: "event", date: "2026-10-10", startTime: null, endTime: new Date("2026-10-13T00:00:00Z") };

  it("labels each day of an all-day event, using Google's exclusive end", () => {
    expect(multiDayLength(allDay)).toBe(3);
    expect(dayTitle(allDay, local("2026-10-10"))).toBe("Trip (Day 1/3)");
    expect(dayTitle(allDay, local("2026-10-12"))).toBe("Trip (Day 3/3)");
    expect(occursOn(allDay, local("2026-10-13"))).toBe(false);
    expect(occursOn(allDay, local("2026-10-09"))).toBe(false);
  });

  it("spans timed events of 24 hours or more, ending at midnight on the last full day", () => {
    const conference = { title: "Conf", type: "event", date: "2026-10-10", startTime: new Date("2026-10-10T09:00:00"), endTime: new Date("2026-10-12T00:00:00") };
    expect(multiDayLength(conference)).toBe(2);
    expect(multiDayPart(conference, local("2026-10-12"))).toBeNull();
  });

  it("leaves an overnight event, a one-day event and a task on their own day", () => {
    const overnight = { title: "Gig", type: "event", date: "2026-10-10", startTime: new Date("2026-10-10T23:00:00"), endTime: new Date("2026-10-11T01:00:00") };
    expect(dayTitle(overnight, local("2026-10-10"))).toBe("Gig");
    expect(occursOn(overnight, local("2026-10-11"))).toBe(false);
    expect(multiDayLength({ ...allDay, endTime: new Date("2026-10-11T00:00:00Z") })).toBe(1);
    expect(multiDayLength({ ...allDay, type: "task" })).toBe(1);
  });

  it("shows up in a month that began after the event did", async () => {
    await insertEvent({ ...allDay, date: "2026-09-29", endTime: new Date("2026-10-03T00:00:00Z") });
    await insertEvent({ title: "Over", type: "event", date: "2026-09-20", endTime: new Date("2026-09-22T00:00:00Z") });
    const found = await getCalendarEvents(local("2026-10-01"), local("2026-10-31"));
    expect(found.map(e => e.title)).toEqual(["Trip"]);
  });

  it("stays on the dashboard while it's running", async () => {
    await insertEvent({ ...allDay, date: "2026-10-08", endTime: new Date("2026-10-13T00:00:00Z") });
    await insertEvent({ title: "Finished", type: "event", date: "2026-10-01", endTime: new Date(`${TODAY}T00:00:00.000Z`) });
    expect((await getDashboardTasks(TODAY)).map(e => e.title)).toEqual(["Trip"]);
  });

  it("stays one row and one Google event", async () => {
    await connect();
    fakeGoogle([page([googleEvent("trip", TODAY, { start: { date: "2026-10-10" }, end: { date: "2026-10-13" } })])]);
    await syncUser(TEST_USER_ID);
    expect(await rows()).toHaveLength(1);
  });
});

describe("mapping", () => {
  const row = (values: Partial<EventRow>) => ({
    title: "T", description: null, date: TODAY, type: "event", startTime: null, endTime: null, gcalOrigin: false, ...values,
  }) as EventRow;

  it("uses the calendar's timezone for the day", () => {
    const late = googleEvent("x", TODAY, { start: { dateTime: "2026-10-10T20:00:00Z" } });
    expect(fromGoogle(late, "Asia/Kolkata")?.date).toBe("2026-10-11");
  });

  it("keeps a multi-day all-day event's length through an edit", () => {
    const trip = googleEvent("trip", TODAY, { start: { date: "2026-10-10" }, end: { date: "2026-10-13" } });
    const fields = fromGoogle(trip, "UTC")!;
    expect(fields).toMatchObject({ date: "2026-10-10", startTime: null });
    expect(toGoogle(row(fields), null).end).toEqual({ date: "2026-10-13", dateTime: null });
  });

  it("gives a one-day all-day item Google's exclusive end", () => {
    expect(toGoogle(row({ date: "2026-10-31" }), "UTC").end).toEqual({ date: "2026-11-01", dateTime: null });
  });

  it("repairs an end that's before the start", () => {
    const start = new Date(`${TODAY}T10:00:00Z`);
    const body = toGoogle(row({ startTime: start, endTime: new Date(`${TODAY}T09:00:00Z`) }), "UTC");
    expect(body.end.dateTime).toBe(new Date(`${TODAY}T11:00:00Z`).toISOString());
  });

  it("leaves an imported event's free/busy setting alone", () => {
    expect(toGoogle(row({ type: "task", gcalOrigin: true }), "UTC")).not.toHaveProperty("transparency");
  });

  it("moves an all-day end by the same number of days", () => {
    const moved = shiftedEnd(
      { date: "2026-10-10", startTime: null, endTime: new Date("2026-10-13T00:00:00Z") },
      { date: "2026-10-20", startTime: null }
    );
    expect(moved).toEqual(new Date("2026-10-23T00:00:00Z"));
  });

  it("only syncs tasks and events that don't repeat", () => {
    expect(isSyncable({ type: "task", repeatsYearly: false })).toBe(true);
    expect(isSyncable({ type: "event", repeatsYearly: true })).toBe(false);
    expect(isSyncable({ type: "special_day", repeatsYearly: false })).toBe(false);
  });
});
