// Saving a day's note for one user (server only; shared by the action and the autosave route)
import { db } from "@/db";
import { note } from "@/db/schema";
import { invalidateSnapshots } from "./stats";

export async function saveNoteFor(userId: string, date: string, content: string, mood: string = "neutral") {
  const [savedNote] = await db.insert(note)
    .values({
      userId,
      date,
      content,
      mood,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [note.userId, note.date],
      set: { content, mood, updatedAt: new Date() },
    })
    .returning();
  await invalidateSnapshots(userId, date);
  return savedNote;
}
