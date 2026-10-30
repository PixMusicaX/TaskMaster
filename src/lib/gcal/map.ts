// Translating between a Google Calendar event and a planner row (no database, no network)
import type { EventRow } from "@/lib/types";

type GoogleTime = { date?: string | null; dateTime?: string | null; timeZone?: string | null };

export type GoogleEvent = {
  id: string;
  status?: string;
  etag?: string;
  summary?: string;
  description?: string;
  eventType?: string;
  start?: GoogleTime;
  end?: GoogleTime;
  organizer?: { self?: boolean };
  guestsCanModify?: boolean;
  attendees?: { self?: boolean; responseStatus?: string }[];
};

const DEFAULT_LENGTH_MS = 3_600_000;

// Google requires an end, and the app's items often have none
const atUtcMidnight = (date: string) => new Date(`${date}T00:00:00.000Z`);
const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const nextDay = (date: string) => isoDay(new Date(atUtcMidnight(date).getTime() + 86_400_000));

// Google ids may only use a-v and 0-9. Deriving ours from the row's id means a retry after a lost
// response finds the first attempt (409) instead of making a second copy.
export const googleIdFor = (eventId: string) => Buffer.from(eventId).toString("hex");

// The day an instant falls on in the calendar's timezone
export const localDay = (instant: Date, timeZone: string) => instant.toLocaleDateString("en-CA", { timeZone });

// Special days and yearly repeats stay in the app: the planner keeps yearly repeats as copies,
// which would all land in Google as separate events
export const isSyncable = (row: Pick<EventRow, "type" | "repeatsYearly">) =>
  (row.type === "task" || row.type === "event") && !row.repeatsYearly;

// Entries that shouldn't be in the planner: cancelled, declined, or calendar furniture like
// working-location blocks
export function isUnwanted(item: GoogleEvent) {
  if (item.status === "cancelled") return true;
  if (item.eventType && item.eventType !== "default") return true;
  return item.attendees?.some(a => a.self && a.responseStatus === "declined") ?? false;
}

// The fields Google owns on a row. All-day events keep their exclusive end date in endTime, so
// editing one here doesn't shorten a multi-day event in Google.
export function fromGoogle(item: GoogleEvent, timeZone: string) {
  const start = item.start?.dateTime ? new Date(item.start.dateTime) : null;
  const allDay = item.start?.date ?? null;
  if (!start && !allDay) return null;
  const end = item.end?.dateTime ? new Date(item.end.dateTime) : item.end?.date ? atUtcMidnight(item.end.date) : null;
  return {
    title: item.summary?.trim() || "(No title)",
    description: item.description || null,
    date: allDay ?? localDay(start!, timeZone),
    startTime: start,
    endTime: end,
    gcalEtag: item.etag ?? null,
    gcalReadOnly: !(item.organizer?.self || item.guestsCanModify),
  };
}

// The nulls matter on a PATCH, which would otherwise merge a date into an existing dateTime
export function toGoogle(row: EventRow, timeZone: string | null) {
  const details = {
    summary: row.title,
    description: row.description ?? "",
    // A to-do shouldn't block the player's availability. Events from Google keep their own setting.
    ...(row.type === "task" && !row.gcalOrigin ? { transparency: "transparent" } : {}),
  };
  if (!row.startTime) {
    const end = row.endTime ? isoDay(row.endTime) : "";
    return {
      ...details,
      start: { date: row.date, dateTime: null },
      end: { date: end > row.date ? end : nextDay(row.date), dateTime: null },
    };
  }
  const end = row.endTime && row.endTime > row.startTime ? row.endTime : new Date(row.startTime.getTime() + DEFAULT_LENGTH_MS);
  const zone = timeZone ? { timeZone } : {};
  return {
    ...details,
    start: { date: null, dateTime: row.startTime.toISOString(), ...zone },
    end: { date: null, dateTime: end.toISOString(), ...zone },
  };
}

// Where an end should land when its item moves, keeping the same length
export function shiftedEnd(
  before: Pick<EventRow, "date" | "startTime" | "endTime">,
  after: Pick<EventRow, "date" | "startTime">
) {
  if (!before.endTime) return null;
  const from = before.startTime ?? atUtcMidnight(before.date);
  const to = after.startTime ?? atUtcMidnight(after.date);
  return new Date(before.endTime.getTime() + to.getTime() - from.getTime());
}
