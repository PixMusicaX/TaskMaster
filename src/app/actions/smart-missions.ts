"use server";

import { db } from "@/db";
import { smartMission, note } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { format, subDays } from "date-fns";
import { getSmartMissionPrompt } from "@/lib/prompts";
import { resolvePersonaStyle } from "@/lib/persona";
import { requireUserId } from "@/lib/current-user";
import { profileFor, invalidateSnapshots } from "@/lib/data/stats";
import { habitsFor } from "@/lib/data/habits";
import { eventsByDateRange } from "@/lib/data/events";
import { dailyQuoteFor } from "@/lib/data/daily-quote";
import { safeGenerateContent } from "@/lib/ai-utils";
import { AiNotConfiguredError } from "@/lib/ai-config";
import { rollMissionBrief } from "@/lib/mission-dice";
import { pickOfflineMission } from "@/lib/offline-missions";
import { noteTextLines } from "@/lib/types";
import { personalizationFor } from "@/lib/data/preferences";
import { and, eq, desc, gte } from "drizzle-orm";

// `persona` is the Persona style the client is showing (null for a normal day; left out, the
// calendar decides), so the mission is written in that game's voice
export async function getSmartMission(clientDateStr?: string, persona?: string | null) {
  return missionFor(await requireUserId(), clientDateStr, persona);
}

async function missionFor(userId: string, clientDateStr?: string, persona?: string | null) {
  const today = clientDateStr || format(new Date(), "yyyy-MM-dd");

  try {
    let mission = await db.query.smartMission.findFirst({
      where: and(eq(smartMission.userId, userId), eq(smartMission.date, today))
    });

    if (!mission) {
      {
        try {
          const clientNow = new Date(today);
          const twoWeeksAgo = subDays(clientNow, 14);
          const twoWeeksAgoStr = format(twoWeeksAgo, "yyyy-MM-dd");

          const [profile, habitData, taskData, notesData, history, personal] = await Promise.all([
            profileFor(userId, today),
            habitsFor(userId, today), // only names are needed, so skip log history
            eventsByDateRange(userId, twoWeeksAgo, clientNow),
            db.select().from(note).where(and(eq(note.userId, userId), gte(note.date, twoWeeksAgoStr))),
            missionHistoryFor(userId, twoWeeksAgoStr),
            personalizationFor(userId)
          ]);

          const prompt = getSmartMissionPrompt({
            level: profile.level,
            xp: profile.xp,
            stats: profile.stats,
            title: profile.title,
            habits: habitData.map((h) => h.name),
            // Holidays and other system entries say nothing about what the player has been doing
            recentTasks: taskData.filter((t) => !t.isApi).map((t) => ({
              title: t.title,
              type: t.type,
              date: t.date,
              startTime: t.startTime,
              completed: t.completed
            })),
            // Notes are stored as JSON bullet lines; the model gets their text, newest first
            recentNotes: notesData
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((n) => ({ date: n.date, mood: n.mood, text: noteTextLines(n.content).join("; ") }))
              .filter((n) => n.text)
              .map((n) => `${n.date} (mood: ${n.mood || "not set"}): ${n.text}`),
            missionHistory: history.map((m) => ({ title: m.title, completed: m.completed })),
            brief: rollMissionBrief(history),
            today,
            persona: resolvePersonaStyle(persona, today),
            personal,
          });

          const content = await safeGenerateContent(prompt, {
            userId,
            model: "gemini-flash-latest",
            responseMimeType: "application/json"
          });

          if (content) {
            const data = JSON.parse(content);
            const zenQuote = await dailyQuoteFor(today);
            const [newMission] = await db.insert(smartMission).values({
              userId,
              date: today,
              title: data.title,
              description: data.description,
              quote: zenQuote,
              xpReward: 50,
              stat: "charisma"
            }).returning();
            mission = newMission;
          }
        } catch (error) {
          // No key on this account is expected; anything else is worth a log line
          if (!(error instanceof AiNotConfiguredError)) console.error("Smart mission AI error:", error);
        }
      }

      // Fallback if the AI fails or the account has no key
      if (!mission) {
        const zenQuoteFallback = await dailyQuoteFor(today);
        // Nothing the player has been handed in the last six weeks
        const recent = await missionHistoryFor(userId, format(subDays(new Date(today), 45), "yyyy-MM-dd"));
        const selected = pickOfflineMission(recent.map(m => m.title));

        const [fallbackMission] = await db.insert(smartMission).values({
          userId,
          date: today,
          title: selected.title,
          description: selected.description,
          quote: zenQuoteFallback,
          xpReward: 50,
          stat: "charisma"
        }).returning();
        mission = fallbackMission;
      }
    }

    return mission;
  } catch (e) {
    console.error("Error in getSmartMission:", e);
    return null;
  }
}

export async function toggleSmartMission(id: string, completed: boolean) {
  const userId = await requireUserId();
  try {
    const [updated] = await db.update(smartMission)
      .set({ completed })
      .where(and(eq(smartMission.id, id), eq(smartMission.userId, userId)))
      .returning({ date: smartMission.date });
    await invalidateSnapshots(userId, updated?.date);
    revalidatePath("/home");
    return { success: true };
  } catch (e) {
    console.error("Error in toggleSmartMission:", e);
    return { success: false };
  }
}

export async function getSmartMissionHistory(sinceDate?: string) {
  return missionHistoryFor(await requireUserId(), sinceDate);
}

async function missionHistoryFor(userId: string, sinceDate?: string) {
  try {
    const since = sinceDate || format(subDays(new Date(), 14), "yyyy-MM-dd");
    return await db.select().from(smartMission)
      .where(and(eq(smartMission.userId, userId), gte(smartMission.date, since)))
      .orderBy(desc(smartMission.date));
  } catch (e) {
    console.error("Error fetching mission history:", e);
    return [];
  }
}

export async function regenerateSmartMission(clientDateStr?: string, persona?: string | null) {
  const userId = await requireUserId();
  const today = clientDateStr || format(new Date(), "yyyy-MM-dd");
  try {
    await db.delete(smartMission).where(and(eq(smartMission.userId, userId), eq(smartMission.date, today)));
    return await missionFor(userId, clientDateStr, persona);
  } catch (e) {
    console.error("Error in regenerateSmartMission:", e);
    return null;
  }
}

