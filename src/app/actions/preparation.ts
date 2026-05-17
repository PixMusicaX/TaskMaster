"use server";

import { db } from "@/db";
import { preparationTip, event } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { format, addDays } from "date-fns";
import { getPreparationTipPrompt } from "@/lib/prompts";
import { safeGenerateContent } from "@/lib/ai-utils";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { subDays } from "date-fns";
import { addXP, getProfile } from "./gamification";

const GEMINI_API_KEY = process.env.gemini_key;

export async function getPreparationTip(clientDateStr?: string) {
  const today = clientDateStr || format(new Date(), "yyyy-MM-dd");
  
  try {
    let tip = await db.query.preparationTip.findFirst({
      where: eq(preparationTip.date, today)
    });

    if (!tip && GEMINI_API_KEY) {
      const clientNow = new Date(today);
      const horizon = addDays(clientNow, 28);
      const twoWeeksAgo = format(subDays(clientNow, 14), "yyyy-MM-dd");
      const todayStr = today;
      const horizonStr = format(horizon, "yyyy-MM-dd");
      
      const [futureTasks, history, profile] = await Promise.all([
        db.select().from(event).where(
          and(
            gte(event.date, todayStr),
            lte(event.date, horizonStr)
          )
        ),
        getPreparationTipHistory(twoWeeksAgo),
        getProfile(todayStr)
      ]);

      const prompt = getPreparationTipPrompt({
        futureTasks: futureTasks
          .filter(t => !t.completed) // Only prepare for pending tasks
          .slice(0, 30)
          .map(t => ({
            title: t.title,
            type: t.type,
            date: t.date
          })),
        history: history.map(h => ({ title: h.title, completed: h.completed })),
        today,
        profile: {
          level: profile.level,
          title: profile.title,
          topStat: profile.topStat,
          stats: profile.stats
        }
      });

      const content = await safeGenerateContent(prompt, {
        model: "gemini-1.5-flash",
        responseMimeType: "application/json"
      });

      if (content) {
        const data = JSON.parse(content);
        const [newTip] = await db.insert(preparationTip).values({
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
  try {
    const tip = await db.query.preparationTip.findFirst({
      where: eq(preparationTip.id, id)
    });

    await db.update(preparationTip)
      .set({ completed })
      .where(eq(preparationTip.id, id));

    if (completed && tip) {
      const xp = tip.xpReward;
      await addXP(xp, tip.stat || undefined);
    }

    revalidatePath("/");
    return { success: true };
  } catch (e) {
    console.error("Error in togglePreparationTip:", e);
    return { success: false };
  }
}

export async function regeneratePreparationTip(clientDateStr?: string) {
  const today = clientDateStr || format(new Date(), "yyyy-MM-dd");
  try {
    await db.delete(preparationTip).where(eq(preparationTip.date, today));
    return await getPreparationTip(clientDateStr);
  } catch (e) {
    return null;
  }
}

export async function getPreparationTipHistory(sinceDate?: string) {
  try {
    const since = sinceDate || format(subDays(new Date(), 14), "yyyy-MM-dd");
    return await db.select().from(preparationTip)
      .where(gte(preparationTip.date, since))
      .orderBy(desc(preparationTip.date));
  } catch (e) {
    console.error("Error fetching preparation history:", e);
    return [];
  }
}
