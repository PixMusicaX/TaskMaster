"use server";

import { db } from "@/db";
import { note } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { requireUserId } from "@/lib/current-user";
import { saveNoteFor } from "@/lib/data/notes";

export async function getNoteByDate(date: string) {
  const userId = await requireUserId();
  return await db.query.note.findFirst({
    where: and(eq(note.userId, userId), eq(note.date, date)),
  });
}

// `mood` is "good", "neutral", "bad", or "" when none has been picked
export async function saveNote(date: string, content: string, mood: string = "") {
  const savedNote = await saveNoteFor(await requireUserId(), date, content, mood);

  revalidatePath("/notes");
  revalidatePath("/home");
  return savedNote;
}

// Moods for every note in [startDate, endDate] (YYYY-MM-DD), for calendar views
export async function getMoodsByDateRange(startDate: string, endDate: string) {
  const userId = await requireUserId();
  return await db.select({ date: note.date, mood: note.mood }).from(note)
    .where(and(eq(note.userId, userId), gte(note.date, startDate), lte(note.date, endDate)));
}

export async function getRecentNotes(limit: number = 7) {
  const userId = await requireUserId();
  return await db.select().from(note)
    .where(eq(note.userId, userId))
    .orderBy(desc(note.date))
    .limit(limit);
}
