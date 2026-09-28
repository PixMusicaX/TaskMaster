import { vi } from "vitest";
import { db } from "./test-db";
import { event, habit, habitLog, note, reliefRecommendation, smartMission, preparationTip } from "@/db/schema";

// Pin "now" without faking timers (PGlite relies on real timers)
export function setToday(isoDate: string) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${isoDate}T10:00:00`));
}

export const noteLines = (...texts: string[]) =>
  JSON.stringify(texts.map((text, i) => ({ id: `l${i}`, bullet: "○", text })));

export async function insertNote(date: string, content: string, mood = "neutral") {
  const [row] = await db.insert(note).values({ date, content, mood }).returning();
  return row;
}

export async function insertEvent(values: Partial<typeof event.$inferInsert> & { title: string; date: string }) {
  const [row] = await db.insert(event).values({ type: "task", ...values }).returning();
  return row;
}

export async function insertHabit(values: Partial<typeof habit.$inferInsert> & { name: string }) {
  const [row] = await db.insert(habit).values(values).returning();
  return row;
}

export async function insertHabitLog(habitId: string, date: string, habitName = "Habit") {
  const [row] = await db.insert(habitLog).values({ habitId, habitName, date, completed: true }).returning();
  return row;
}

export async function insertRelief(values: Partial<typeof reliefRecommendation.$inferInsert> & { date: string }) {
  const [row] = await db.insert(reliefRecommendation).values({ title: "Relief", ...values }).returning();
  return row;
}

export async function insertMission(values: Partial<typeof smartMission.$inferInsert> & { date: string }) {
  const [row] = await db.insert(smartMission).values({ title: "Mission", ...values }).returning();
  return row;
}

export async function insertPrepTip(values: Partial<typeof preparationTip.$inferInsert> & { date: string }) {
  const [row] = await db.insert(preparationTip).values({ title: "Tip", ...values }).returning();
  return row;
}

// Minimal fetch Response stand-in for mocked network calls
export const jsonResponse = (body: unknown, ok = true) =>
  ({ ok, status: ok ? 200 : 500, json: async () => body }) as Response;
