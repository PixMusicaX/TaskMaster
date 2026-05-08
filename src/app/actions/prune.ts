"use server";

import { db } from "@/db";
import { event, note, habitLog, smartMission, reliefRecommendation, preparationTip } from "@/db/schema";
import { lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function generatePruneArchive() {
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - 5);
  const cutoffStr = cutoffDate.toISOString().split("T")[0];

  const archiveData: any[] = [];
  
  const oldEvents = await db.select().from(event).where(lt(event.date, cutoffStr));
  oldEvents.forEach(e => archiveData.push({ table: 'event', ...e }));

  const oldNotes = await db.select().from(note).where(lt(note.date, cutoffStr));
  oldNotes.forEach(n => archiveData.push({ table: 'note', ...n }));

  const oldHabitLogs = await db.select().from(habitLog).where(lt(habitLog.date, cutoffStr));
  oldHabitLogs.forEach(h => archiveData.push({ table: 'habitLog', ...h }));

  const oldMissions = await db.select().from(smartMission).where(lt(smartMission.date, cutoffStr));
  oldMissions.forEach(m => archiveData.push({ table: 'smartMission', ...m }));

  const oldReliefs = await db.select().from(reliefRecommendation).where(lt(reliefRecommendation.date, cutoffStr));
  oldReliefs.forEach(r => archiveData.push({ table: 'reliefRecommendation', ...r }));

  const oldPreps = await db.select().from(preparationTip).where(lt(preparationTip.date, cutoffStr));
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
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - 5);
  const cutoffStr = cutoffDate.toISOString().split("T")[0];
  
  await db.delete(event).where(lt(event.date, cutoffStr));
  await db.delete(note).where(lt(note.date, cutoffStr));
  await db.delete(habitLog).where(lt(habitLog.date, cutoffStr));
  await db.delete(smartMission).where(lt(smartMission.date, cutoffStr));
  await db.delete(reliefRecommendation).where(lt(reliefRecommendation.date, cutoffStr));
  await db.delete(preparationTip).where(lt(preparationTip.date, cutoffStr));
  
  revalidatePath("/");
  return true;
}
