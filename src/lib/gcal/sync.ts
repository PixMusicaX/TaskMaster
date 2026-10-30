// Two-way sync with a player's Google Calendar (server only). Changes made here wait in the
// outbox; a sync pushes those first, then pulls, so an edit that hasn't reached Google yet is
// never overwritten by the older copy there.
import { after } from "next/server";
import { and, asc, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { event, gcalConnection, gcalIgnored, gcalOutbox } from "@/db/schema";
import { decryptSecret } from "@/lib/ai-config";
import { invalidateSnapshots } from "@/lib/data/stats";
import type { EventRow } from "@/lib/types";
import { accessTokenFor, deleteEvent, GoogleApiError, GoogleAuthError, insertEvent, listEvents, patchEvent, type EventPage } from "./api";
import { fromGoogle, googleIdFor, isSyncable, isUnwanted, localDay, toGoogle, type GoogleEvent } from "./map";

type Connection = typeof gcalConnection.$inferSelect;

const BACKGROUND_GAP_MS = 45_000; // Under the client's one-minute poll, so a poll is never turned away
const MANUAL_GAP_MS = 15_000;
// Occurrences of a recurring event only arrive once they're inside the window, so it gets redrawn
const FULL_SYNC_EVERY_MS = 30 * 86_400_000;
const WINDOW_AHEAD_MS = 365 * 86_400_000;
const MAX_ATTEMPTS = 8;

export async function connectionFor(userId: string) {
  const [row] = await db.select().from(gcalConnection).where(eq(gcalConnection.userId, userId)).limit(1);
  return row ?? null;
}

// ─── Queueing changes ─────────────────────────────────────────────────────────

// Repeat edits share one entry. Its time moves on, so a push already under way can tell the
// entry changed behind it and leave it for the next one.
export async function queueUpsert(userId: string, eventId: string) {
  await db.insert(gcalOutbox).values({ userId, eventId, op: "upsert" })
    .onConflictDoUpdate({ target: [gcalOutbox.userId, gcalOutbox.eventId], set: { op: "upsert", createdAt: new Date(), attempts: 0 } });
}

// Call before the row goes. Whatever began in Google stays there and is remembered, so it isn't
// imported again; only an item that began here is deleted from Google. Returns whether a push is due.
export async function queueRemoval(row: EventRow) {
  const { userId, id: eventId, gcalEventId } = row;
  await db.delete(gcalOutbox).where(and(eq(gcalOutbox.userId, userId), eq(gcalOutbox.eventId, eventId)));
  if (!gcalEventId) return false;
  if (row.gcalOrigin) {
    await db.insert(gcalIgnored).values({ userId, gcalEventId }).onConflictDoNothing();
    return false;
  }
  if (!row.gcalSync || !(await connectionFor(userId))) return false;
  await db.insert(gcalOutbox).values({ userId, eventId, gcalEventId, op: "delete" });
  return true;
}

// Sends what's queued as soon as the player's request has finished
export function pushSoon(userId: string) {
  after(async () => {
    const connection = await connectionFor(userId);
    if (!connection || connection.lastError === "reconnect") return;
    try {
      await pushQueued(connection, await tokenFor(connection));
    } catch (e) {
      await recordFailure(userId, e);
    }
  });
}

// ─── Pushing ──────────────────────────────────────────────────────────────────

async function tokenFor(connection: Connection) {
  const refreshToken = decryptSecret(connection.refreshToken);
  if (!refreshToken) throw new GoogleAuthError();
  return accessTokenFor(refreshToken);
}

async function recordFailure(userId: string, error: unknown) {
  const reconnect = error instanceof GoogleAuthError;
  if (!reconnect) console.error("Google Calendar sync failed:", error);
  await db.update(gcalConnection).set({ lastError: reconnect ? "reconnect" : "failed" }).where(eq(gcalConnection.userId, userId));
}

const isMissing = (e: unknown) => e instanceof GoogleApiError && (e.status === 404 || e.status === 410);

// Some other refusal that a retry won't change. 403 is left out because Google also uses it for rate limits.
const isPermanent = (e: unknown) =>
  e instanceof GoogleApiError && e.status >= 400 && e.status < 500 && ![403, 408, 429].includes(e.status);

const unlink = (eventId: string) =>
  db.update(event).set({ gcalEventId: null, gcalEtag: null, gcalSync: false }).where(eq(event.id, eventId));

async function pushRow(connection: Connection, token: string, row: EventRow) {
  if (!isSyncable(row)) {
    // Edited into something that stays in the app
    if (row.gcalEventId) {
      if (row.gcalOrigin) await db.insert(gcalIgnored).values({ userId: row.userId, gcalEventId: row.gcalEventId }).onConflictDoNothing();
      else await deleteEvent(token, row.gcalEventId).catch(e => { if (!isMissing(e)) throw e; });
      await unlink(row.id);
    }
    return;
  }
  if (!row.gcalSync) return;

  const body = toGoogle(row, connection.timeZone);
  const gcalEventId = row.gcalEventId ?? googleIdFor(row.id);
  let saved: GoogleEvent;
  try {
    saved = row.gcalEventId ? await patchEvent(token, gcalEventId, body) : await insertEvent(token, gcalEventId, body);
  } catch (e) {
    if (isMissing(e)) return unlink(row.id); // Deleted in Google while this edit waited
    if (row.gcalEventId || !(e instanceof GoogleApiError) || e.status !== 409) throw e;
    saved = await patchEvent(token, gcalEventId, body); // An earlier attempt got through
  }
  await db.update(event).set({ gcalEventId, gcalEtag: saved.etag ?? null }).where(eq(event.id, row.id));
}

async function pushQueued(connection: Connection, token: string) {
  const { userId } = connection;
  const queued = await db.select().from(gcalOutbox).where(eq(gcalOutbox.userId, userId)).orderBy(asc(gcalOutbox.createdAt));

  for (const item of queued) {
    try {
      if (item.op === "delete") {
        if (item.gcalEventId) await deleteEvent(token, item.gcalEventId).catch(e => { if (!isMissing(e)) throw e; });
      } else {
        const [row] = await db.select().from(event).where(and(eq(event.id, item.eventId), eq(event.userId, userId)));
        if (row) await pushRow(connection, token, row);
      }
      await db.delete(gcalOutbox).where(and(eq(gcalOutbox.id, item.id), eq(gcalOutbox.createdAt, item.createdAt)));
    } catch (e) {
      if (e instanceof GoogleAuthError) throw e;
      if (isPermanent(e) || item.attempts + 1 >= MAX_ATTEMPTS) {
        console.error("Giving up on a Google Calendar change:", e);
        await db.delete(gcalOutbox).where(eq(gcalOutbox.id, item.id));
      } else {
        await db.update(gcalOutbox).set({ attempts: item.attempts + 1 }).where(eq(gcalOutbox.id, item.id));
      }
    }
  }
}

// ─── Pulling ──────────────────────────────────────────────────────────────────

async function fetchPages(token: string, params: Record<string, string>) {
  const items = new Map<string, GoogleEvent>();
  let page: EventPage;
  let pageToken: string | undefined;
  let timeZone: string | undefined;
  do {
    page = await listEvents(token, pageToken ? { ...params, pageToken } : params);
    (page.items ?? []).forEach(item => items.set(item.id, item));
    timeZone ??= page.timeZone;
    pageToken = page.nextPageToken;
  } while (pageToken);
  return { items: [...items.values()], syncToken: page.nextSyncToken ?? null, timeZone: timeZone ?? "UTC" };
}

// Applies one batch from Google and returns how many rows it changed
async function applyChanges(userId: string, items: GoogleEvent[], timeZone: string, syncFrom: string) {
  const ids = items.map(i => i.id);
  if (ids.length === 0) return 0;

  const [rows, ignored, waiting] = await Promise.all([
    db.select().from(event).where(and(eq(event.userId, userId), inArray(event.gcalEventId, ids))),
    db.select().from(gcalIgnored).where(and(eq(gcalIgnored.userId, userId), inArray(gcalIgnored.gcalEventId, ids))),
    db.select().from(gcalOutbox).where(eq(gcalOutbox.userId, userId)),
  ]);
  const byGoogleId = new Map(rows.map(r => [r.gcalEventId, r]));
  const skip = new Set(ignored.map(i => i.gcalEventId));
  // Anything still queued here wins over Google's copy
  waiting.forEach(w => {
    skip.add(googleIdFor(w.eventId));
    if (w.gcalEventId) skip.add(w.gcalEventId);
  });
  rows.filter(r => waiting.some(w => w.eventId === r.id)).forEach(r => skip.add(r.gcalEventId!));

  const touched = new Set<string>();
  const toInsert: (typeof event.$inferInsert)[] = [];
  let changed = 0;

  for (const item of items) {
    if (skip.has(item.id)) continue;
    const row = byGoogleId.get(item.id);
    if (row && !row.gcalSync) continue; // The player switched this one off

    if (isUnwanted(item)) {
      if (!row) continue;
      // A finished task keeps its XP; its Google copy is simply gone
      if (row.type === "task" && row.completed) await unlink(row.id);
      else await db.delete(event).where(eq(event.id, row.id));
      touched.add(row.date);
      changed++;
      continue;
    }
    if (row?.gcalEtag && row.gcalEtag === item.etag) continue; // Our own push, or nothing new

    const fields = fromGoogle(item, timeZone);
    if (!fields) continue;
    if (!row) {
      if (fields.date < syncFrom) continue;
      toInsert.push({
        ...fields, userId, type: "event", tier: "side", notification: false,
        gcalEventId: item.id, gcalSync: true, gcalOrigin: true, gcalImported: true,
      });
    } else if (row.type === "task" && row.completed) {
      // A completed task's date is the day it was done, so Google's date doesn't apply any more
      await db.update(event).set({ gcalEtag: fields.gcalEtag }).where(eq(event.id, row.id));
    } else {
      await db.update(event).set(fields).where(eq(event.id, row.id));
      touched.add(row.date);
      touched.add(fields.date);
      changed++;
    }
  }

  if (toInsert.length > 0) {
    await db.insert(event).values(toInsert).onConflictDoNothing();
    changed += toInsert.length;
  }
  await invalidateSnapshots(userId, ...touched);
  return changed;
}

async function pull(connection: Connection, token: string) {
  const { userId } = connection;
  const now = new Date();
  let { syncToken, syncFrom } = connection;
  let timeZone = connection.timeZone;
  let changed = 0;

  if (syncToken) {
    try {
      const incremental = await fetchPages(token, { syncToken });
      timeZone = incremental.timeZone;
      changed += await applyChanges(userId, incremental.items, timeZone, syncFrom ?? localDay(now, timeZone));
      syncToken = incremental.syncToken;
    } catch (e) {
      if (!(e instanceof GoogleApiError) || e.status !== 410) throw e;
      syncToken = null; // Google has forgotten this marker: start over from syncFrom
    }
  }

  const fullDue = !connection.fullSyncedAt || now.getTime() - connection.fullSyncedAt.getTime() >= FULL_SYNC_EVERY_MS;
  let fullSyncedAt = connection.fullSyncedAt;
  if (!syncToken || fullDue) {
    // A day of slack either side of the timezone; applyChanges holds the exact line at syncFrom
    const earliest = syncFrom ? new Date(`${syncFrom}T00:00:00.000Z`).getTime() : now.getTime();
    const full = await fetchPages(token, {
      timeMin: new Date(earliest - 86_400_000).toISOString(),
      timeMax: new Date(now.getTime() + WINDOW_AHEAD_MS).toISOString(),
    });
    timeZone = full.timeZone;
    syncFrom ??= localDay(now, timeZone);
    changed += await applyChanges(userId, full.items, timeZone, syncFrom);
    syncToken = full.syncToken;
    fullSyncedAt = now;
  }

  await db.update(gcalConnection).set({ syncToken, syncFrom, timeZone, fullSyncedAt }).where(eq(gcalConnection.userId, userId));
  return changed;
}

// ─── A full round ─────────────────────────────────────────────────────────────

// `manual` is the Sync button. A sync that's too soon after the last one, or a connection that
// needs the player to reconnect, doesn't run.
export async function syncUser(userId: string, { manual = false } = {}) {
  const started = new Date();
  const [connection] = await db.update(gcalConnection).set({ syncStartedAt: started }).where(and(
    eq(gcalConnection.userId, userId),
    or(isNull(gcalConnection.lastError), eq(gcalConnection.lastError, "failed")),
    or(
      isNull(gcalConnection.syncStartedAt),
      lt(gcalConnection.syncStartedAt, new Date(started.getTime() - (manual ? MANUAL_GAP_MS : BACKGROUND_GAP_MS)))
    )
  )).returning();
  if (!connection) return { ran: false, changed: 0 };

  try {
    const token = await tokenFor(connection);
    await pushQueued(connection, token);
    const changed = await pull(connection, token);
    await db.update(gcalConnection).set({ lastSyncedAt: new Date(), lastError: null }).where(eq(gcalConnection.userId, userId));
    return { ran: true, changed };
  } catch (e) {
    await recordFailure(userId, e);
    return { ran: true, changed: 0 };
  }
}
