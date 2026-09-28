import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { saveNote, getNoteByDate, getRecentNotes, getMoodsByDateRange } from "@/app/actions/notes";
import { POST as autosave } from "@/app/api/notes/autosave/route";
import { note } from "@/db/schema";
import { db } from "./helpers/test-db";
import { insertNote, noteLines } from "./helpers/fixtures";

describe("saveNote", () => {
  it("creates a note, then updates the same day's note instead of duplicating it", async () => {
    await saveNote("2026-09-01", noteLines("first"), "neutral");
    const updated = await saveNote("2026-09-01", noteLines("second"), "good");

    expect(updated.content).toBe(noteLines("second"));
    expect(updated.mood).toBe("good");
    expect(await db.select().from(note)).toHaveLength(1);
    expect((await getNoteByDate("2026-09-01"))?.mood).toBe("good");
  });

  it("defaults the mood to neutral", async () => {
    const saved = await saveNote("2026-09-02", noteLines("x"));
    expect(saved.mood).toBe("neutral");
  });
});

describe("getRecentNotes", () => {
  it("returns the newest notes first, up to the limit", async () => {
    await insertNote("2026-09-01", "a");
    await insertNote("2026-09-03", "c");
    await insertNote("2026-09-02", "b");
    const recent = await getRecentNotes(2);
    expect(recent.map(n => n.date)).toEqual(["2026-09-03", "2026-09-02"]);
  });
});

describe("getMoodsByDateRange", () => {
  it("returns moods for every note inside the range, including both ends", async () => {
    await insertNote("2026-06-30", "before", "bad");
    await insertNote("2026-07-01", "start", "good");
    await insertNote("2026-07-15", "middle", "neutral");
    await insertNote("2026-07-31", "end", "bad");
    await insertNote("2026-08-01", "after", "good");

    const moods = await getMoodsByDateRange("2026-07-01", "2026-07-31");
    expect(moods.sort((a, b) => a.date.localeCompare(b.date))).toEqual([
      { date: "2026-07-01", mood: "good" },
      { date: "2026-07-15", mood: "neutral" },
      { date: "2026-07-31", mood: "bad" },
    ]);
  });

  it("works for months long before the most recent notes", async () => {
    for (let d = 1; d <= 28; d++) {
      await insertNote(`2026-09-${String(d).padStart(2, "0")}`, "recent");
    }
    await insertNote("2025-01-10", "old", "good");
    expect(await getMoodsByDateRange("2025-01-01", "2025-01-31")).toEqual([{ date: "2025-01-10", mood: "good" }]);
  });
});

describe("POST /api/notes/autosave", () => {
  const post = (body: unknown) =>
    autosave(new NextRequest("http://localhost/api/notes/autosave", { method: "POST", body: JSON.stringify(body) }));

  it("saves the note", async () => {
    const res = await post({ date: "2026-09-05", content: noteLines("beacon"), mood: "good" });
    expect(res.status).toBe(200);
    expect((await getNoteByDate("2026-09-05"))?.content).toBe(noteLines("beacon"));
  });

  it("rejects requests with missing fields", async () => {
    const res = await post({ date: "2026-09-05" });
    expect(res.status).toBe(400);
    expect(await db.select().from(note)).toHaveLength(0);
  });
});
