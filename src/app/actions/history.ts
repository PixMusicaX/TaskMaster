"use server";

import { db } from "@/db";
import { event, note, habitLog, reliefRecommendation } from "@/db/schema";
import { and, gte, lte, or, eq, desc, ilike, inArray } from "drizzle-orm";
import { format, subDays } from "date-fns";
import { getReliefsWithCarriedLocation } from "./relief";

export type HistoryDay = {
  date: string;
  notes: typeof note.$inferSelect[];
  events: typeof event.$inferSelect[];
  specialDays: typeof event.$inferSelect[];
  tasks: typeof event.$inferSelect[];
  habits: typeof habitLog.$inferSelect[];
  relief: typeof reliefRecommendation.$inferSelect | null;
};

// Events, special days, and completed tasks are what the history shows
const historyEventFilter = or(
  eq(event.type, "event"),
  eq(event.type, "special_day"),
  and(
    eq(event.type, "task"),
    eq(event.completed, true)
  )
);

export async function getHistory(endDateStr: string, limitDays: number = 28, query: string = "", clientDateStr?: string): Promise<HistoryDay[]> {
  let notesResult: typeof note.$inferSelect[] = [];
  let eventsAndTasksResult: typeof event.$inferSelect[] = [];
  let habitsResult: typeof habitLog.$inferSelect[] = [];
  let reliefFrom: string | null = null;
  let reliefTo: string | null = null;

  if (query.trim() !== "") {
    // Search mode: Ignore limitDays, search all time up to yesterday
    const searchPattern = `%${query.trim()}%`;
    const now = clientDateStr ? new Date(clientDateStr) : new Date();
    const yesterdayStr = format(subDays(now, 1), "yyyy-MM-dd");
    
    let parsedDateStr: string | null = null;
    const yearSuffix = /\d{4}/.test(query) ? "" : " " + now.getFullYear();
    const parsed = new Date(query.trim() + yearSuffix);
    if (!isNaN(parsed.getTime())) {
      parsedDateStr = format(parsed, "yyyy-MM-dd");
    }

    const [matchedNotes, matchedEvents, matchedHabits] = await Promise.all([
      db.select({ date: note.date }).from(note).where(
        and(
          ilike(note.content, searchPattern),
          lte(note.date, yesterdayStr)
        )
      ),
      db.select({ date: event.date }).from(event).where(
        and(
          or(
            ilike(event.title, searchPattern),
            ilike(event.description, searchPattern)
          ),
          historyEventFilter,
          lte(event.date, yesterdayStr)
        )
      ),
      db.select({ date: habitLog.date }).from(habitLog).where(
        and(
          ilike(habitLog.habitName, searchPattern),
          eq(habitLog.completed, true),
          lte(habitLog.date, yesterdayStr)
        )
      )
    ]);

    const uniqueDatesArray = [
      ...matchedNotes.map(n => n.date),
      ...matchedEvents.map(e => e.date),
      ...matchedHabits.map(h => h.date)
    ];
    
    if (parsedDateStr && parsedDateStr <= yesterdayStr) {
      uniqueDatesArray.push(parsedDateStr);
    }
    
    const uniqueDates = Array.from(new Set(uniqueDatesArray)).sort();

    if (uniqueDates.length > 0) {
      reliefFrom = uniqueDates[0];
      reliefTo = uniqueDates[uniqueDates.length - 1];

      [notesResult, eventsAndTasksResult, habitsResult] = await Promise.all([
        db.select().from(note).where(inArray(note.date, uniqueDates)).orderBy(desc(note.createdAt)),
        db.select().from(event).where(
          and(
            inArray(event.date, uniqueDates),
            historyEventFilter
          )
        ).orderBy(desc(event.startTime)),
        db.select().from(habitLog).where(
          and(inArray(habitLog.date, uniqueDates), eq(habitLog.completed, true))
        ).orderBy(desc(habitLog.date))
      ]);
    }
  } else {
    const endDate = new Date(endDateStr);
    const startDate = subDays(endDate, limitDays - 1);
    
    const startStr = format(startDate, "yyyy-MM-dd");
    const endStr = format(endDate, "yyyy-MM-dd");
    reliefFrom = startStr;
    reliefTo = endStr;

    [notesResult, eventsAndTasksResult, habitsResult] = await Promise.all([
      // Notes in range
      db.select().from(note).where(
        and(
          gte(note.date, startStr),
          lte(note.date, endStr)
        )
      ).orderBy(desc(note.createdAt)),

      // Events and Tasks in range
      db.select().from(event).where(
        and(
          gte(event.date, startStr),
          lte(event.date, endStr),
          historyEventFilter
        )
      ).orderBy(desc(event.startTime)),

      // Completed habits in range
      db.select().from(habitLog).where(
        and(
          gte(habitLog.date, startStr),
          lte(habitLog.date, endStr),
          eq(habitLog.completed, true)
        )
      ).orderBy(desc(habitLog.date))
    ]);
  }

  // Relief recommendations for the covered dates, with valid locations carried forward
  const reliefs = reliefFrom && reliefTo ? await getReliefsWithCarriedLocation(reliefFrom, reliefTo) : [];
  const reliefMap = new Map(reliefs.map(r => [r.date, r]));

  // Group by date
  const historyMap = new Map<string, HistoryDay>();
  
  const addToMap = (date: string) => {
    if (!historyMap.has(date)) {
      historyMap.set(date, { date, notes: [], events: [], specialDays: [], tasks: [], habits: [], relief: reliefMap.get(date) || null });
    }
    return historyMap.get(date)!;
  };

  notesResult.forEach((n) => {
    addToMap(n.date).notes.push(n);
  });

  eventsAndTasksResult.forEach((e) => {
    const day = addToMap(e.date);
    if (e.type === "task") {
      day.tasks.push(e);
    } else if (e.type === "special_day") {
      day.specialDays.push(e);
    } else {
      day.events.push(e);
    }
  });

  habitsResult.forEach((h) => {
    addToMap(h.date).habits.push(h);
  });

  // Convert map to array and sort by date descending
  const historyList = Array.from(historyMap.values()).sort((a, b) => {
    return b.date.localeCompare(a.date);
  });

  return historyList;
}
