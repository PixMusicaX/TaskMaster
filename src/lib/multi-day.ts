// Events that run across several days are one row, shown on each day as "Title (Day 1/3)"
// (safe to import from the client)
import { addDays, differenceInCalendarDays, format, isSameDay, parseISO, startOfDay } from "date-fns";
import type { EventRow } from "@/lib/types";

type Span = Pick<EventRow, "type" | "date" | "startTime" | "endTime">;

const DAY_MS = 86_400_000;

// First day, last day and number of days. Null for anything on one day: a timed event under 24 hours stays
// on its start day even if it runs past midnight. Tasks stay single too, having one tick.
function span(event: Span) {
  if (event.type !== "event" || !event.endTime) return null;
  const end = new Date(event.endTime);
  let first: Date;
  let last: Date;
  if (event.startTime) {
    const start = new Date(event.startTime);
    if (end.getTime() - start.getTime() < DAY_MS) return null;
    first = startOfDay(start);
    last = new Date(end.getTime() - 1); // Ending exactly at midnight doesn't touch the next day
  } else {
    // All-day ends come from Google, which stores the day after the last one
    first = parseISO(event.date);
    last = addDays(parseISO(end.toISOString().slice(0, 10)), -1);
  }
  const days = differenceInCalendarDays(last, first) + 1;
  return days > 1 ? { first, last, days } : null;
}

export const multiDayLength = (event: Span) => span(event)?.days ?? 1;

// Which day of a multi-day event this is, or null if it's single-day or not on this day
export function multiDayPart(event: Span, day: Date) {
  const found = span(event);
  if (!found) return null;
  const index = differenceInCalendarDays(day, found.first) + 1;
  return index >= 1 && index <= found.days ? { day: index, total: found.days } : null;
}

export function occursOn(event: Span, day: Date) {
  return span(event) ? multiDayPart(event, day) !== null : isSameDay(new Date(event.startTime || event.date), day);
}

// Which of the next `days` days an event falls on, counted from tomorrow as 1. A multi-day event
// already under way gives only the days it has left.
export function upcomingDays(event: Span, today: Date, days: number) {
  return Array.from({ length: days }, (_, i) => i + 1).filter(n => occursOn(event, addDays(today, n)));
}

// How an upcoming list describes a multi-day event seen from `day`: its dates if it hasn't begun,
// or how far along it will be if it has. Null for a single day.
export function multiDayLabel(event: Span, day: Date) {
  const found = span(event);
  const part = multiDayPart(event, day);
  if (!found || !part) return null;
  return part.day > 1 ? `Day ${part.day}/${part.total}` : `${format(found.first, "MMM dd")} – ${format(found.last, "MMM dd")}`;
}

export function dayTitle(event: Span & Pick<EventRow, "title">, day: Date) {
  const part = multiDayPart(event, day);
  return part ? `${event.title} (Day ${part.day}/${part.total})` : event.title;
}
