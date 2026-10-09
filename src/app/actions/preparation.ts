"use server";

import { db } from "@/db";
import { preparationTip, event } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { format, addDays } from "date-fns";
import { getPreparationTipPrompt } from "@/lib/prompts";
import { resolvePersonaStyle } from "@/lib/persona";
import { safeGenerateContent } from "@/lib/ai-utils";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { subDays } from "date-fns";
import { requireUserId } from "@/lib/current-user";
import { profileFor, invalidateSnapshots } from "@/lib/data/stats";
import { AiNotConfiguredError } from "@/lib/ai-config";
import { pickOfflinePrepTip } from "@/lib/offline-missions";

// `persona` is the Persona style the client is showing (null for a normal day; left out, the
// calendar decides), so the tip is written in that game's voice
export async function getPreparationTip(clientDateStr?: string, persona?: string | null) {
  return tipFor(await requireUserId(), clientDateStr, persona);
}

async function tipFor(userId: string, clientDateStr?: string, persona?: string | null) {
  const today = clientDateStr || format(new Date(), "yyyy-MM-dd");
  
  try {
    let tip = await db.query.preparationTip.findFirst({
      where: and(eq(preparationTip.userId, userId), eq(preparationTip.date, today))
    });

    if (!tip) {
      const clientNow = new Date(today);
      const horizon = addDays(clientNow, 28);
      const twoWeeksAgo = format(subDays(clientNow, 14), "yyyy-MM-dd");
      const todayStr = today;
      const horizonStr = format(horizon, "yyyy-MM-dd");
      
      const [futureTasks, history, profile] = await Promise.all([
        db.select().from(event).where(
          and(
            eq(event.userId, userId),
            gte(event.date, todayStr),
            lte(event.date, horizonStr)
          )
        ),
        tipHistoryFor(userId, twoWeeksAgo),
        profileFor(userId, todayStr)
      ]);

      // Only pending items, soonest first. The player's own plans are listed in full before
      // holidays, which would otherwise crowd them out of the prompt.
      const pending = futureTasks
        .filter(t => !t.completed)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(t => ({ title: t.title, type: t.type, date: t.date }));
      const upcoming = [
        ...pending.filter(t => t.type !== "special_day").slice(0, 30),
        ...pending.filter(t => t.type === "special_day").slice(0, 8),
      ];

      const prompt = getPreparationTipPrompt({
        futureTasks: upcoming,
        history: history.map(h => ({ title: h.title, completed: h.completed })),
        today,
        profile: {
          level: profile.level,
          title: profile.title,
          topStat: profile.topStat,
          stats: profile.stats
        },
        persona: resolvePersonaStyle(persona, today),
      });

      let data: { title: string; description: string } | null = null;
      try {
        const content = await safeGenerateContent(prompt, {
          userId,
          model: "gemini-1.5-flash",
          responseMimeType: "application/json"
        });
        if (content) data = JSON.parse(content);
      } catch (aiError) {
        // An account with no AI key gets a tip built from its calendar. A provider that failed
        // is different: nothing is saved, so the card can offer "Try Again".
        if (!(aiError instanceof AiNotConfiguredError)) throw aiError;
        data = pickOfflinePrepTip(upcoming, today, history.map(h => h.title));
      }

      if (data) {
        const [newTip] = await db.insert(preparationTip).values({
          userId,
          date: today,
          title: data.title,
          description: data.description,
          xpReward: 25,
          stat: "charisma"
        }).returning();
        tip = newTip;
      }
    }

    return tip;
  } catch (e) {
    console.error("Error in getPreparationTip:", e);
    return null;
  }
}

export async function togglePreparationTip(id: string, completed: boolean) {
  const userId = await requireUserId();
  try {
    const [tip] = await db.update(preparationTip)
      .set({ completed })
      .where(and(eq(preparationTip.id, id), eq(preparationTip.userId, userId)))
      .returning({ date: preparationTip.date });
    await invalidateSnapshots(userId, tip?.date);

    revalidatePath("/home");
    return { success: true };
  } catch (e) {
    console.error("Error in togglePreparationTip:", e);
    return { success: false };
  }
}

export async function regeneratePreparationTip(clientDateStr?: string, persona?: string | null) {
  const userId = await requireUserId();
  const today = clientDateStr || format(new Date(), "yyyy-MM-dd");
  try {
    await db.delete(preparationTip).where(and(eq(preparationTip.userId, userId), eq(preparationTip.date, today)));
    return await tipFor(userId, clientDateStr, persona);
  } catch {
    return null;
  }
}

export async function getPreparationTipHistory(sinceDate?: string) {
  return tipHistoryFor(await requireUserId(), sinceDate);
}

async function tipHistoryFor(userId: string, sinceDate?: string) {
  try {
    const since = sinceDate || format(subDays(new Date(), 14), "yyyy-MM-dd");
    return await db.select().from(preparationTip)
      .where(and(eq(preparationTip.userId, userId), gte(preparationTip.date, since)))
      .orderBy(desc(preparationTip.date));
  } catch (e) {
    console.error("Error fetching preparation history:", e);
    return [];
  }
}
