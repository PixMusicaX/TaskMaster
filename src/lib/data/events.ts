// Event queries shared between actions, for one user (server only)
import { db } from "@/db";
import { event } from "@/db/schema";
import { eq, and, gte, lte, asc, inArray } from "drizzle-orm";
import { format } from "date-fns";
import { invalidateSnapshots } from "./stats";

export async function eventsByDateRange(userId: string, start: Date, end: Date) {
  const startStr = format(start, "yyyy-MM-dd");
  const endStr = format(end, "yyyy-MM-dd");
  return await db.select().from(event).where(
    and(
      eq(event.userId, userId),
      gte(event.date, startStr),
      lte(event.date, endStr)
    )
  ).orderBy(asc(event.date), asc(event.startTime));
}

export async function syncRecurringEventsFor(userId: string) {
  const recurringEvents = await db.select().from(event).where(and(eq(event.userId, userId), eq(event.repeatsYearly, true)));
  if (recurringEvents.length === 0) return 0;

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1, currentYear + 2, currentYear + 3];

  // Build every target instance up front, then check existence with a single query
  const candidates = recurringEvents.flatMap((sourceEvent) => {
    const [, month, day] = sourceEvent.date.split("-");
    return years
      .map((year) => ({ sourceEvent, year, targetDate: `${year}-${month}-${day}` }))
      // Don't overwrite the source event itself if it's in this year
      .filter(({ targetDate }) => targetDate !== sourceEvent.date);
  });

  const existing = await db.select({ title: event.title, date: event.date, type: event.type }).from(event).where(
    and(
      eq(event.userId, userId),
      inArray(event.title, Array.from(new Set(recurringEvents.map(e => e.title)))),
      inArray(event.date, Array.from(new Set(candidates.map(c => c.targetDate))))
    )
  );
  const existingKeys = new Set(existing.map(e => `${e.title}|${e.date}|${e.type}`));

  const seen = new Set<string>();
  const toInsert = candidates.flatMap(({ sourceEvent, year, targetDate }) => {
    const key = `${sourceEvent.title}|${targetDate}|${sourceEvent.type}`;
    if (existingKeys.has(key) || seen.has(key)) return [];
    seen.add(key);
    // Create a copy for the future year
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- drop DB-generated fields before re-inserting
      const { id, createdAt, ...eventData } = sourceEvent;
    return [{
      ...eventData,
      date: targetDate,
      completed: false,
      isApi: true, // Mark instances as system-managed
      startTime: sourceEvent.startTime ? new Date(new Date(sourceEvent.startTime).setFullYear(year)) : null,
      endTime: sourceEvent.endTime ? new Date(new Date(sourceEvent.endTime).setFullYear(year)) : null,
    }];
  });

  if (toInsert.length > 0) {
    await db.insert(event).values(toInsert);
    await invalidateSnapshots(userId, ...toInsert.map(e => e.date));
  }
  return toInsert.length;
}
