import { describe, it, expect, vi } from "vitest";
import { safeGenerateContent } from "@/lib/ai-utils";
import { askTaskmaster, getTaskmasterRemainingQueries } from "@/app/actions/taskmaster";
import { note } from "@/db/schema";
import { db } from "./helpers/test-db";
import { insertNote } from "./helpers/fixtures";

const ai = vi.mocked(safeGenerateContent);

// First AI call builds the SQL; second turns the query result into an answer
function aiWrites(sql: string, answer = "The Taskmaster speaks.") {
  ai.mockResolvedValueOnce(sql).mockResolvedValueOnce(answer);
}
const queryDataSentToAI = () => String(ai.mock.calls[1]?.[0] ?? "");

describe("askTaskmaster", () => {
  it("runs the generated SELECT and answers from its result", async () => {
    await insertNote("2026-09-01", "a");
    await insertNote("2026-09-02", "b");
    aiWrites('```sql\nSELECT count(*)::int AS notes FROM "Note";\n```');

    const result = await askTaskmaster("How many notes?", "2026-09-28");
    expect(result).toMatchObject({ success: true, answer: "The Taskmaster speaks.", remaining: 2 });
    expect(queryDataSentToAI()).toContain('"notes": 2');
  });

  it("refuses anything that is not a query", async () => {
    await insertNote("2026-09-01", "keep me");
    ai.mockResolvedValueOnce('DELETE FROM "Note"');

    const result = await askTaskmaster("Delete everything", "2026-09-28");
    expect(result.success).toBe(false);
    expect(ai).toHaveBeenCalledTimes(1);
    expect(await db.select().from(note)).toHaveLength(1);
  });

  it("cannot sneak a second statement after a SELECT", async () => {
    await insertNote("2026-09-01", "keep me");
    // The same trick on the first try and on the retry
    ai.mockResolvedValueOnce('SELECT 1; DELETE FROM "Note"').mockResolvedValueOnce('SELECT 1; DELETE FROM "Note"');

    expect((await askTaskmaster("Sneaky", "2026-09-28")).success).toBe(false);
    expect(await db.select().from(note)).toHaveLength(1);
  });

  it("cannot write through a data-modifying CTE", async () => {
    await insertNote("2026-09-01", "keep me");
    const sneaky = 'WITH d AS (DELETE FROM "Note" RETURNING *) SELECT count(*)::int FROM d';
    ai.mockResolvedValueOnce(sneaky).mockResolvedValueOnce(sneaky);

    expect((await askTaskmaster("Sneaky CTE", "2026-09-28")).success).toBe(false);
    expect(await db.select().from(note)).toHaveLength(1);
  });

  it("gets one chance to fix a query the database rejects, and is told what went wrong", async () => {
    await insertNote("2026-09-01", "a");
    ai.mockResolvedValueOnce('SELECT count(*)::int AS notes FROM "Note" WHERE "date" > now() - interval \'7 days\'')
      .mockResolvedValueOnce('Here you go:\n```sql\nSELECT count(*)::int AS notes FROM "Note" WHERE "date" >= \'2026-09-01\';\n```')
      .mockResolvedValueOnce("One note.");

    const result = await askTaskmaster("Notes this month?", "2026-09-28");
    expect(result).toMatchObject({ success: true, answer: "One note.", remaining: 2 });
    // The retry was shown its own SQL and the database's complaint
    expect(String(ai.mock.calls[1][0])).toContain("YOUR PREVIOUS ATTEMPT FAILED");
    expect(String(ai.mock.calls[1][0])).toContain("now() - interval");
    expect(String(ai.mock.calls[2][0])).toContain('"notes": 1');
  });

  it("gives up without spending a question when the retry fails too", async () => {
    ai.mockResolvedValueOnce('SELECT nope FROM "Note"').mockResolvedValueOnce('SELECT still_nope FROM "Note"');
    const result = await askTaskmaster("Q", "2026-09-28");
    expect(result).toMatchObject({ success: false, message: expect.stringContaining("did not use up a query") });
    expect(await getTaskmasterRemainingQueries("2026-09-28")).toEqual({ remaining: 3 });
  });

  it("hands the model ready-made dates so it never does arithmetic on text dates", async () => {
    aiWrites("SELECT 1 AS one");
    await askTaskmaster("Q", "2026-03-02");
    const prompt = String(ai.mock.calls[0][0]);
    expect(prompt).toContain("TODAY: 2026-03-02 (Monday)");
    expect(prompt).toContain("last 7 days: from '2026-02-24'");
    expect(prompt).toContain("last month: '2026-02-01' to '2026-02-28'");
  });

  it("allows 3 questions per day", async () => {
    for (let i = 0; i < 3; i++) {
      aiWrites("SELECT 1 AS one");
      expect((await askTaskmaster(`Q${i}`, "2026-09-28")).success).toBe(true);
    }
    const fourth = await askTaskmaster("Q4", "2026-09-28");
    expect(fourth).toMatchObject({ success: false, message: expect.stringContaining("exhausted") });
    expect(await getTaskmasterRemainingQueries("2026-09-28")).toEqual({ remaining: 0 });
    expect(await getTaskmasterRemainingQueries("2026-09-29")).toEqual({ remaining: 3 });
  });

  it("does not use up a question when the AI gives no answer", async () => {
    ai.mockResolvedValueOnce("");
    expect((await askTaskmaster("Q", "2026-09-28")).success).toBe(false);
    expect(await getTaskmasterRemainingQueries("2026-09-28")).toEqual({ remaining: 3 });
  });

  it("does not use up a question when the AI is unreachable", async () => {
    expect(await askTaskmaster("Q", "2026-09-28")).toMatchObject({ success: false });
    expect(await getTaskmasterRemainingQueries("2026-09-28")).toEqual({ remaining: 3 });
  });
});
