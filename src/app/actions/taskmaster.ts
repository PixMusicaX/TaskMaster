"use server";

import { db } from "@/db";
import { taskmasterQueryCount } from "@/db/schema";
import { format } from "date-fns";
import { eq, sql } from "drizzle-orm";
import { getTaskmasterQueryBuilderPrompt, getTaskmasterAnswerPrompt } from "@/lib/prompts";
import { getProfile } from "./gamification";
import { safeGenerateContent } from "@/lib/ai-utils";

export async function askTaskmaster(question: string, clientDateStr?: string) {
  const today = clientDateStr || format(new Date(), "yyyy-MM-dd");
  const isDev = process.env.NODE_ENV === "development";

  try {
    let queryRecord = await db.query.taskmasterQueryCount.findFirst({
      where: eq(taskmasterQueryCount.date, today)
    });

    if (!isDev && queryRecord && queryRecord.count >= 3) {
      return { success: false, message: "The Taskmaster rests. You have exhausted your 3 queries for today." };
    }

    // Step 1: Query Builder
    const builderPrompt = getTaskmasterQueryBuilderPrompt(question, today);
    let generatedSql = await safeGenerateContent(builderPrompt, {
      model: "gemini-flash-latest",
    });

    if (!generatedSql) {
      return { success: false, message: "The Taskmaster's inner mind is silent. (Failed to build query)" };
    }

    // Clean up SQL (remove markdown blocks if AI included them)
    generatedSql = generatedSql.replace(/```sql/gi, "").replace(/```/g, "").trim();

    // Security & Reliability Validation
    if (!generatedSql.toUpperCase().startsWith("SELECT")) {
      return { success: false, message: "The Taskmaster attempted a forbidden spell. Only SELECT queries are allowed." };
    }

    // Execute the query
    let queryData = "[]";
    try {
      const result = await db.execute(sql.raw(generatedSql));
      queryData = JSON.stringify(result, null, 2);
      // Optional: limit string size to avoid token limit errors
      if (queryData.length > 5000) {
         queryData = queryData.slice(0, 5000) + "\n... [TRUNCATED DUE TO SIZE]";
      }
    } catch (sqlError: any) {
      console.error("SQL Execution Error:", sqlError);
      queryData = `[Error executing query: ${sqlError.message || "Unknown SQL Error"}]`;
    }

    // Step 2: Answer Formulator
    const profile = await getProfile();
    const answerPrompt = getTaskmasterAnswerPrompt({
      level: profile.level,
      xp: profile.xp,
      stats: profile.stats,
      queryData,
      question,
    });

    const content = await safeGenerateContent(answerPrompt, {
      model: "gemini-flash-latest",
    });

    if (!content) {
      return { success: false, message: "The Taskmaster pondered deeply, but could not form a response." };
    }

    // Record the query usage
    if (!queryRecord) {
      await db.insert(taskmasterQueryCount).values({
        date: today,
        count: 1
      });
      queryRecord = { id: "", date: today, count: 1 };
    } else {
      await db.update(taskmasterQueryCount)
        .set({ count: queryRecord.count + 1 })
        .where(eq(taskmasterQueryCount.id, queryRecord.id));
      queryRecord.count += 1;
    }

    return { 
      success: true, 
      answer: content,
      remaining: isDev ? "∞" : 3 - queryRecord.count
    };

  } catch (error) {
    console.error("Error in askTaskmaster:", error);
    return { success: false, message: "The Taskmaster's connection was disrupted." };
  }
}

export async function getTaskmasterRemainingQueries(clientDateStr?: string) {
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) return { remaining: "∞" };

  const today = clientDateStr || format(new Date(), "yyyy-MM-dd");
  try {
    const queryRecord = await db.query.taskmasterQueryCount.findFirst({
      where: eq(taskmasterQueryCount.date, today)
    });
    return { remaining: 3 - (queryRecord?.count || 0) };
  } catch (e) {
    return { remaining: 0 };
  }
}
