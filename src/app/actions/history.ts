"use server";

import { db } from "@/db";
import { event, note, habitLog, reliefRecommendation } from "@/db/schema";
import { and, gte, lte, or, eq, desc, ilike, inArray, asc } from "drizzle-orm";
import { format, subDays } from "date-fns";

export type HistoryDay = {
  date: string;
  notes: typeof note.$inferSelect[];
  events: typeof event.$inferSelect[];
  specialDays: typeof event.$inferSelect[];
  tasks: typeof event.$inferSelect[];
  habits: typeof habitLog.$inferSelect[];
  relief: typeof reliefRecommendation.$inferSelect | null;
};

export async function getHistory(endDateStr: string, limitDays: number = 28, query: string = ""): Promise<HistoryDay[]> {
  let notesResult: typeof note.$inferSelect[] = [];
  let eventsAndTasksResult: typeof event.$inferSelect[] = [];
  let habitsResult: typeof habitLog.$inferSelect[] = [];

  if (query.trim() !== "") {
    // Search mode: Ignore limitDays, search all time up to yesterday
    const searchPattern = `%${query.trim()}%`;
    const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");
    
    let parsedDateStr: string | null = null;
    const yearSuffix = /\d{4}/.test(query) ? "" : " " + new Date().getFullYear();
    const parsed = new Date(query.trim() + yearSuffix);
    if (!isNaN(parsed.getTime())) {
      parsedDateStr = format(parsed, "yyyy-MM-dd");
    }

    const matchedNotes = await db.select({ date: note.date }).from(note).where(
      and(
        ilike(note.content, searchPattern),
        lte(note.date, yesterdayStr)
      )
    );

    const matchedEvents = await db.select({ date: event.date }).from(event).where(
      and(
        or(
          ilike(event.title, searchPattern),
          ilike(event.description, searchPattern)
        ),
        or(
          eq(event.type, "event"),
          eq(event.type, "special_day"),
          and(
            eq(event.type, "task"),
            eq(event.completed, true)
          )
        ),
        lte(event.date, yesterdayStr)
      )
    );

    const matchedHabits = await db.select({ date: habitLog.date }).from(habitLog).where(
      and(
        ilike(habitLog.habitName, searchPattern),
        eq(habitLog.completed, true),
        lte(habitLog.date, yesterdayStr)
      )
    );

    const uniqueDatesArray = [
      ...matchedNotes.map(n => n.date),
      ...matchedEvents.map(e => e.date),
      ...matchedHabits.map(h => h.date)
    ];
    
    if (parsedDateStr && parsedDateStr <= yesterdayStr) {
      uniqueDatesArray.push(parsedDateStr);
    }
    
    const uniqueDates = Array.from(new Set(uniqueDatesArray));

    if (uniqueDates.length > 0) {
      notesResult = await db.select().from(note).where(inArray(note.date, uniqueDates)).orderBy(desc(note.createdAt));
      
      eventsAndTasksResult = await db.select().from(event).where(
        and(
          inArray(event.date, uniqueDates),
          or(
            eq(event.type, "event"),
            eq(event.type, "special_day"),
            and(
              eq(event.type, "task"),
              eq(event.completed, true)
            )
          )
        )
      ).orderBy(desc(event.startTime));

      habitsResult = await db.select().from(habitLog).where(
        and(inArray(habitLog.date, uniqueDates), eq(habitLog.completed, true))
      ).orderBy(desc(habitLog.date));
    }
  } else {
    const endDate = new Date(endDateStr);
    const startDate = subDays(endDate, limitDays - 1);
    
    const startStr = format(startDate, "yyyy-MM-dd");
    const endStr = format(endDate, "yyyy-MM-dd");

    // Fetch Notes in range
    notesResult = await db.select().from(note).where(
      and(
        gte(note.date, startStr),
        lte(note.date, endStr)
      )
    ).orderBy(desc(note.createdAt));

    // Fetch Events and Tasks in range
    eventsAndTasksResult = await db.select().from(event).where(
      and(
        gte(event.date, startStr),
        lte(event.date, endStr),
        or(
          eq(event.type, "event"),
          eq(event.type, "special_day"),
          and(
            eq(event.type, "task"),
            eq(event.completed, true)
          )
        )
      )
    ).orderBy(desc(event.startTime));

    // Fetch completed habits in range
    habitsResult = await db.select().from(habitLog).where(
      and(
        gte(habitLog.date, startStr),
        lte(habitLog.date, endStr),
        eq(habitLog.completed, true)
      )
    ).orderBy(desc(habitLog.date));
  }

  // Fetch and process all relief recommendations to carry forward valid locations
  const allReliefs = await db.select().from(reliefRecommendation).orderBy(asc(reliefRecommendation.date));
  const reliefMap = new Map();
  let lastLoc = "No location found";
  let lastWea = "Clear";
  let lastTem = "22";

  for (const r of allReliefs) {
    if (r.location && r.location !== "No location found") {
      lastLoc = r.location;
      lastWea = r.weather || "Clear";
      lastTem = r.temp || "22";
    } else {
      r.location = lastLoc;
      r.weather = lastWea;
      r.temp = lastTem;
    }
    reliefMap.set(r.date, r);
  }

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
