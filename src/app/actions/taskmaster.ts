"use server";

import { db, client } from "@/db";
import { taskmasterQueryCount } from "@/db/schema";
import { format } from "date-fns";
import { and, eq } from "drizzle-orm";
import { getTaskmasterQueryBuilderPrompt, getTaskmasterRepairPrompt, getTaskmasterAnswerPrompt } from "@/lib/prompts";
import { personalizationFor } from "@/lib/data/preferences";
import { requireUserId } from "@/lib/current-user";
import { profileFor } from "@/lib/data/stats";
import { safeGenerateContent } from "@/lib/ai-utils";
import { AiNotConfiguredError } from "@/lib/ai-config";
import { resolvePersonaStyle } from "@/lib/persona";

// The tables the Taskmaster may read, and the database role its query runs as. That role has no
// rights on the real tables (see scripts/migrate-multi-user.mjs); it only sees per-question
// copies holding the asker's own rows, so no question can reach another player's data or the
// sign-in tables, however the generated SQL is written.
const SANDBOX_TABLES = ["Habit", "HabitLog", "Note", "Event", "SmartMission", "PreparationTip", "ReliefRecommendation", "SeasonSnapshot"];
const SANDBOX_ROLE = "taskmaster_reader";

class SandboxError extends Error {}

// The model's reply as bare SQL: no code fence, no commentary before it, no trailing semicolon
function cleanSql(reply: string | null | undefined) {
  const text = (reply ?? "").replace(/```(?:sql)?/gi, "").trim();
  const start = text.search(/\b(SELECT|WITH)\b/i);
  return (start > 0 ? text.slice(start) : text).trim().replace(/;+\s*$/, "");
}

const isReadQuery = (sql: string) => /^(SELECT|WITH)\b/i.test(sql);
const errorText = (error: unknown) => (error instanceof Error && error.message) || "Unknown SQL error";

async function runInSandbox(userId: string, sql: string) {
  return client.begin(async (tx) => {
    try {
      await tx`SET LOCAL statement_timeout = 5000`;
      for (const table of SANDBOX_TABLES) {
        await tx.unsafe(`CREATE TEMP TABLE "${table}" (LIKE public."${table}") ON COMMIT DROP`);
        await tx.unsafe(`INSERT INTO pg_temp."${table}" SELECT * FROM public."${table}" WHERE "userId" = $1`, [userId]);
        await tx.unsafe(`GRANT SELECT ON pg_temp."${table}" TO ${SANDBOX_ROLE}`);
      }
      await tx.unsafe(`SET TRANSACTION READ ONLY`);
      await tx.unsafe(`SET LOCAL ROLE ${SANDBOX_ROLE}`);
    } catch (setupError) {
      throw new SandboxError(setupError instanceof Error ? setupError.message : "Sandbox setup failed");
    }
    // The extended protocol (simple: false) rejects multiple statements, so
    // "SELECT 1; RESET ROLE; ..." can't step back out.
    // `simple` is a valid postgres.js option missing from its typings
    return tx.unsafe(sql, [], { simple: false } as unknown as Parameters<typeof tx.unsafe>[2]);
  });
}

// `persona` is the Persona style the client is showing (null for a normal day; left out, the
// calendar decides), so the answer comes in that game's voice
export async function askTaskmaster(question: string, clientDateStr?: string, persona?: string | null) {
  const userId = await requireUserId();
  const today = clientDateStr || format(new Date(), "yyyy-MM-dd");
  const isDev = process.env.NODE_ENV === "development";

  try {
    const queryRecord = await db.query.taskmasterQueryCount.findFirst({
      where: and(eq(taskmasterQueryCount.userId, userId), eq(taskmasterQueryCount.date, today))
    });

    if (!isDev && queryRecord && queryRecord.count >= 3) {
      return { success: false, message: "The Taskmaster rests. You have exhausted your 3 queries for today." };
    }

    // Step 1: Query Builder
    const firstSql = cleanSql(await safeGenerateContent(getTaskmasterQueryBuilderPrompt(question, today), {
      userId,
      model: "gemini-flash-latest",
    }));

    if (!firstSql) {
      return { success: false, message: "The Taskmaster's inner mind is silent. (Failed to build query)" };
    }
    if (!isReadQuery(firstSql)) {
      return { success: false, message: "The Taskmaster attempted a forbidden spell. Only SELECT queries are allowed." };
    }

    // Execute the query. If the database rejects it, the model gets one chance to correct its
    // own SQL from the error; a question that still can't be read is not answered from nothing.
    let queryData: string;
    try {
      let rows: unknown;
      try {
        rows = await runInSandbox(userId, firstSql);
      } catch (firstError) {
        if (firstError instanceof SandboxError) throw firstError;
        const repaired = cleanSql(await safeGenerateContent(
          getTaskmasterRepairPrompt(question, today, firstSql, errorText(firstError)),
          { userId, model: "gemini-flash-latest" },
        ).catch(() => ""));
        if (!repaired || !isReadQuery(repaired)) throw firstError;
        rows = await runInSandbox(userId, repaired);
      }
      queryData = JSON.stringify(rows, null, 2);
      // Optional: limit string size to avoid token limit errors
      if (queryData.length > 5000) {
         queryData = queryData.slice(0, 5000) + "\n... [TRUNCATED DUE TO SIZE]";
      }
    } catch (sqlError: unknown) {
      if (sqlError instanceof SandboxError) {
        // Never fall back to querying the real tables
        console.error("Taskmaster sandbox unavailable:", sqlError.message);
        return { success: false, message: "The Taskmaster's archive is sealed. (Its reading room is not set up on this server.)" };
      }
      console.error("SQL Execution Error:", sqlError);
      return { success: false, message: "The Taskmaster searched the archive but could not read it for that question. Try asking it another way; this one did not use up a query." };
    }

    // Step 2: Answer Formulator
    const [profile, personal] = await Promise.all([profileFor(userId, today), personalizationFor(userId)]);
    const answerPrompt = getTaskmasterAnswerPrompt({
      level: profile.level,
      xp: profile.xp,
      stats: profile.stats,
      queryData,
      question,
      persona: resolvePersonaStyle(persona, today),
      personal,
    });

    const content = await safeGenerateContent(answerPrompt, {
      userId,
      model: "gemini-flash-latest",
    });

    if (!content) {
      return { success: false, message: "The Taskmaster pondered deeply, but could not form a response." };
    }

    // Record the query usage
    const count = (queryRecord?.count ?? 0) + 1;
    await db.insert(taskmasterQueryCount).values({ userId, date: today, count })
      .onConflictDoUpdate({ target: [taskmasterQueryCount.userId, taskmasterQueryCount.date], set: { count } });

    return {
      success: true,
      answer: content,
      remaining: isDev ? "∞" : 3 - count
    };

  } catch (error) {
    if (error instanceof AiNotConfiguredError) {
      return { success: false, message: "The Taskmaster has no voice yet. Add your AI key on the Account page to wake him." };
    }
    console.error("Error in askTaskmaster:", error);
    return { success: false, message: "The Taskmaster's connection was disrupted." };
  }
}

export async function getTaskmasterRemainingQueries(clientDateStr?: string) {
  const userId = await requireUserId();
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) return { remaining: "∞" };

  const today = clientDateStr || format(new Date(), "yyyy-MM-dd");
  try {
    const queryRecord = await db.query.taskmasterQueryCount.findFirst({
      where: and(eq(taskmasterQueryCount.userId, userId), eq(taskmasterQueryCount.date, today))
    });
    return { remaining: 3 - (queryRecord?.count || 0) };
  } catch {
    return { remaining: 0 };
  }
}
