"use server";

import { db } from "@/db";
import { note } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, desc } from "drizzle-orm";

export async function getNoteByDate(date: string) {
  return await db.query.note.findFirst({
    where: eq(note.date, date),
  });
}

export async function saveNote(date: string, content: string, mood: string = "neutral") {
  const [savedNote] = await db.insert(note)
    .values({
      date,
      content,
      mood,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [note.date],
      set: { content, mood, updatedAt: new Date() },
    })
    .returning();
    
  revalidatePath("/notes");
  revalidatePath("/");
  return savedNote;
}

export async function getRecentNotes(limit: number = 7) {
  return await db.select().from(note)
    .orderBy(desc(note.date))
    .limit(limit);
}

