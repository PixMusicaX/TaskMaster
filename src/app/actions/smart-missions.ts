"use server";

import { db } from "@/db";
import { smartMission, note } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { format, subDays } from "date-fns";
import { getSmartMissionPrompt } from "@/lib/prompts";
import { getProfile } from "./gamification";
import { getHabits } from "./habits";
import { getEventsByDateRange } from "./events";
import { safeGenerateContent } from "@/lib/ai-utils";
import { eq, desc, gte } from "drizzle-orm";

const GEMINI_API_KEY = process.env.gemini_key;

export async function getSmartMission() {
  const today = format(new Date(), "yyyy-MM-dd");

  try {
    let mission = await db.query.smartMission.findFirst({
      where: eq(smartMission.date, today)
    });

    if (!mission) {
      if (GEMINI_API_KEY) {
        try {
          const lastWeek = subDays(new Date(), 7);
          const lastWeekStr = format(lastWeek, "yyyy-MM-dd");

          const [profile, habitData, taskData, notesData, history] = await Promise.all([
            getProfile(),
            getHabits(),
            getEventsByDateRange(lastWeek, new Date()),
            db.select().from(note).where(gte(note.date, lastWeekStr)),
            getSmartMissionHistory(30)
          ]);

          const prompt = getSmartMissionPrompt({
            level: profile.level,
            xp: profile.xp,
            stats: profile.stats,
            habits: habitData.map((h: any) => h.name),
            recentTasks: taskData.map((t: any) => ({
              title: t.title,
              type: t.type,
              startTime: t.startTime
            })),
            recentNotes: notesData.map((n: any) => n.content),
            missionHistory: history.map((m: any) => ({ title: m.title, completed: m.completed }))
          });

          console.log("=== GEMINI SDK SMART MISSION PROMPT ===");
          const content = await safeGenerateContent(prompt, {
            model: "gemini-flash-latest",
            responseMimeType: "application/json"
          });

          if (content) {
            const data = JSON.parse(content);
            const [newMission] = await db.insert(smartMission).values({
              date: today,
              title: data.title,
              description: data.description,
              quote: data.quote,
              xpReward: 50,
              stat: "charisma"
            }).returning();
            mission = newMission;
          }
        } catch (error) {
          console.error("Gemini SDK Error:", error);
        }
      }

      // Fallback if Gemini fails or no key
      if (!mission) {
        const missions = [
          { title: "Compliment a Stranger [OFF]", description: "Brighten someone's day with a sincere compliment. (AI Offline)" },
          { title: "Network with a Peer [OFF]", description: "Reach out to a colleague or peer for a 5-minute chat. (AI Offline)" },
          { title: "Host a Mini-Game [OFF]", description: "Suggest a quick fun activity for your team or friends. (AI Offline)" },
          { title: "Active Listening [OFF]", description: "Practice active listening in your next conversation." },
          { title: "Digital Declutter [OFF]", description: "Delete 10 unneeded files or emails to clear your mind. (AI Offline)" },
          { title: "Hydration Hero [OFF]", description: "Drink a full glass of water right now for a quick health boost. (AI Offline)" },
          { title: "Mindful Minute [OFF]", description: "Close your eyes and breathe deeply for 60 seconds. (AI Offline)" },
          { title: "Gratitude Journal [OFF]", description: "Write down one thing you're genuinely thankful for today. (AI Offline)" },
          { title: "Walk in Nature [OFF]", description: "Take a 5-minute walk outside to refresh your spirit. (AI Offline)" },
          { title: "Quick Stretch [OFF]", description: "Spend 3 minutes stretching your body to release tension. (AI Offline)" }
        ];
        const selected = missions[Math.floor(Math.random() * missions.length)];

        const [fallbackMission] = await db.insert(smartMission).values({
          date: today,
          title: selected.title,
          description: selected.description,
          quote: "Every grand legend begins with a single modest step.",
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
  try {
    await db.update(smartMission)
      .set({ completed })
      .where(eq(smartMission.id, id));
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    console.error("Error in toggleSmartMission:", e);
    return { success: false };
  }
}

export async function getSmartMissionHistory(limit: number = 30) {
  try {
    return await db.select().from(smartMission)
      .orderBy(desc(smartMission.date))
      .limit(limit);
  } catch (e) {
    console.error("Error fetching mission history:", e);
    return [];
  }
}

export async function regenerateSmartMission() {
  const today = format(new Date(), "yyyy-MM-dd");
  try {
    await db.delete(smartMission).where(eq(smartMission.date, today));
    return await getSmartMission();
  } catch (e) {
    console.error("Error in regenerateSmartMission:", e);
    return null;
  }
}

