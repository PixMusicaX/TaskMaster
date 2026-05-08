"use server";

import { db } from "@/db";
import { preparationTip, event } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { format, addDays } from "date-fns";
import { getPreparationTipPrompt } from "@/lib/prompts";
import { safeGenerateContent } from "@/lib/ai-utils";
import { eq, and, gte, lte } from "drizzle-orm";

const GEMINI_API_KEY = process.env.gemini_key;

export async function getPreparationTip(clientDateStr?: string) {
  const today = clientDateStr || format(new Date(), "yyyy-MM-dd");
  
  try {
    let tip = await db.query.preparationTip.findFirst({
      where: eq(preparationTip.date, today)
    });

    if (!tip && GEMINI_API_KEY) {
      const horizon = addDays(new Date(), 28);
      const futureTasks = await db.select().from(event).where(
        and(
          gte(event.startTime, new Date()),
          lte(event.startTime, horizon)
        )
      );

      const prompt = getPreparationTipPrompt({
        futureTasks: futureTasks.map(t => ({
          title: t.title,
          type: t.type,
          date: t.date
        }))
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
          xpReward: 15,
          stat: "intelligence"
        }).returning();
        tip = newTip;
      }
    }

    if (!tip) {
      // Fallback
      const [fallbackTip] = await db.insert(preparationTip).values({
        date: today,
        title: "Strategic Observation",
        description: "Your path ahead is clear. Use this time to refine your existing skills.",
        xpReward: 15,
        stat: "intelligence"
      }).returning();
      tip = fallbackTip;
    }

    return tip;
  } catch (e) {
    console.error("Error in getPreparationTip:", e);
    return null;
  }
}

export async function togglePreparationTip(id: string, completed: boolean) {
  try {
    await db.update(preparationTip)
      .set({ completed })
      .where(eq(preparationTip.id, id));
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
