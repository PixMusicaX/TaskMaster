import { db } from "../db";
import { event, note, habitLog, smartMission, reliefRecommendation, preparationTip } from "../db/schema";
import { lt } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

// Get date 5 years ago
const cutoffDate = new Date();
cutoffDate.setFullYear(cutoffDate.getFullYear() - 5);
const cutoffStr = cutoffDate.toISOString().split("T")[0]; // YYYY-MM-DD

async function run() {
  console.log(`Starting Database Prune Process...`);
  console.log(`Cutoff Date: ${cutoffStr} (Keeping everything newer than this)`);

  const archiveData: any[] = [];

  // Fetch old records (string comparison works for YYYY-MM-DD)
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

  if (archiveData.length === 0) {
    console.log("No data older than 5 years found. Exiting.");
    process.exit(0);
  }

  console.log(`Found ${archiveData.length} records to archive and delete.`);

  // Write to CSV manually
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

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = path.join(process.cwd(), `archive_${timestamp}.csv`);
  
  fs.writeFileSync(filename, rows.join("\n"), "utf-8");
  console.log(`Successfully wrote archive to ${filename}`);

  console.log("Deleting records from database...");
  
  if (oldEvents.length > 0) await db.delete(event).where(lt(event.date, cutoffStr));
  if (oldNotes.length > 0) await db.delete(note).where(lt(note.date, cutoffStr));
  if (oldHabitLogs.length > 0) await db.delete(habitLog).where(lt(habitLog.date, cutoffStr));
  if (oldMissions.length > 0) await db.delete(smartMission).where(lt(smartMission.date, cutoffStr));
  if (oldReliefs.length > 0) await db.delete(reliefRecommendation).where(lt(reliefRecommendation.date, cutoffStr));
  if (oldPreps.length > 0) await db.delete(preparationTip).where(lt(preparationTip.date, cutoffStr));

  console.log("Database pruning completed successfully.");
  process.exit(0);
}

run().catch(err => {
  console.error("Error during prune:", err);
  process.exit(1);
});
