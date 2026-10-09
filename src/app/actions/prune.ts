"use server";

import { db } from "@/db";
import { event, note, habitLog, smartMission, reliefRecommendation, preparationTip } from "@/db/schema";
import { and, eq, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/current-user";

function pruneCutoff() {
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - 5);
  return cutoffDate.toISOString().split("T")[0];
}

// The signed-in user's records older than 5 years, as CSV (null when there are none)
export async function generatePruneArchive() {
  const userId = await requireUserId();
  const cutoffStr = pruneCutoff();

  const archiveData: Record<string, unknown>[] = [];

  const oldEvents = await db.select().from(event).where(and(eq(event.userId, userId), lt(event.date, cutoffStr)));
  oldEvents.forEach(e => archiveData.push({ table: 'event', ...e }));

  const oldNotes = await db.select().from(note).where(and(eq(note.userId, userId), lt(note.date, cutoffStr)));
  oldNotes.forEach(n => archiveData.push({ table: 'note', ...n }));

  const oldHabitLogs = await db.select().from(habitLog).where(and(eq(habitLog.userId, userId), lt(habitLog.date, cutoffStr)));
  oldHabitLogs.forEach(h => archiveData.push({ table: 'habitLog', ...h }));

  const oldMissions = await db.select().from(smartMission).where(and(eq(smartMission.userId, userId), lt(smartMission.date, cutoffStr)));
  oldMissions.forEach(m => archiveData.push({ table: 'smartMission', ...m }));

  const oldReliefs = await db.select().from(reliefRecommendation).where(and(eq(reliefRecommendation.userId, userId), lt(reliefRecommendation.date, cutoffStr)));
  oldReliefs.forEach(r => archiveData.push({ table: 'reliefRecommendation', ...r }));

  const oldPreps = await db.select().from(preparationTip).where(and(eq(preparationTip.userId, userId), lt(preparationTip.date, cutoffStr)));
  oldPreps.forEach(p => archiveData.push({ table: 'preparationTip', ...p }));

  if (archiveData.length === 0) return null;

  const headers = ["table", "id", "date", "title_or_name", "content_or_desc", "completed"];
  const rows = [headers.join(",")];

  archiveData.forEach(row => {
    const title = row.title || row.name || "";
    const content = row.content || row.description || "";
    const cleanTitle = title.toString().replace(/,/g, " ").replace(/\n/g, " ");
    const cleanContent = content.toString().replace(/,/g, " ").replace(/\n/g, " ");
    rows.push([
      row.table,
      row.id,
      row.date,
      cleanTitle,
      cleanContent,
      row.completed ? "true" : "false"
    ].join(","));
  });

  return rows.join("\n");
}

export async function deletePrunedData() {
  const userId = await requireUserId();
  const cutoffStr = pruneCutoff();

  await db.delete(event).where(and(eq(event.userId, userId), lt(event.date, cutoffStr)));
  await db.delete(note).where(and(eq(note.userId, userId), lt(note.date, cutoffStr)));
  await db.delete(habitLog).where(and(eq(habitLog.userId, userId), lt(habitLog.date, cutoffStr)));
  await db.delete(smartMission).where(and(eq(smartMission.userId, userId), lt(smartMission.date, cutoffStr)));
  await db.delete(reliefRecommendation).where(and(eq(reliefRecommendation.userId, userId), lt(reliefRecommendation.date, cutoffStr)));
  await db.delete(preparationTip).where(and(eq(preparationTip.userId, userId), lt(preparationTip.date, cutoffStr)));

  revalidatePath("/home");
  return true;
}
