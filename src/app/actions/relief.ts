"use server";

import { db } from "@/db";
import { reliefRecommendation, note } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { format, subDays } from "date-fns";
import { getReliefRecommendationPrompt } from "@/lib/prompts";
import { getProfile } from "./gamification";
import { getHabits } from "./habits";
import { getEventsByDateRange } from "./events";
import { safeGenerateContent } from "@/lib/ai-utils";
import { eq, desc, gte } from "drizzle-orm";

const GEMINI_API_KEY = process.env.gemini_key;

export async function getReliefRecommendation(lat?: number, lon?: number, clientDateStr?: string) {
  const today = clientDateStr || format(new Date(), "yyyy-MM-dd");

  try {
    let recommendation = await db.query.reliefRecommendation.findFirst({
      where: eq(reliefRecommendation.date, today)
    });

    if (!recommendation) {
      let weatherInfo = { weather: "Clear", temp: "22", location: "No location found" };

      if (lat && lon) {
        try {
          const [weatherRes, geoRes] = await Promise.all([
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max&timezone=auto&forecast_days=3`),
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`, {
              headers: { "User-Agent": "TaskMaster/1.0" }
            })
          ]);

          const weatherData = await weatherRes.json();
          const geoData = await geoRes.json();

          if (weatherData.daily) {
            // Match today's date explicitly so timezone shifts can't silently return the wrong day
            const todayIndex = weatherData.daily.time?.indexOf(today) ?? 0;
            const idx = todayIndex >= 0 ? todayIndex : 0;

            const maxTemp = Math.round(weatherData.daily.temperature_2m_max[idx]);
            const minTemp = Math.round(weatherData.daily.temperature_2m_min[idx]);
            const feelsLike = Math.round(weatherData.daily.apparent_temperature_max[idx]);
            weatherInfo.temp = `${maxTemp}° (${minTemp}–${maxTemp}, feels ${feelsLike})`;

            const code = weatherData.daily.weathercode[idx];
            if (code === 0) weatherInfo.weather = "Clear";
            else if (code <= 3) weatherInfo.weather = "Partly Cloudy";
            else if (code <= 48) weatherInfo.weather = "Foggy";
            else if (code <= 67) weatherInfo.weather = "Rainy";
            else if (code <= 77) weatherInfo.weather = "Snowy";
            else weatherInfo.weather = "Stormy";
          }

          if (geoData.address) {
            weatherInfo.location = geoData.address.suburb || geoData.address.city_district || geoData.address.city || geoData.address.town || "Area detected";
          }
        } catch (e) {
          console.error("Relief context fetch failed:", e);
        }
      }

      if (GEMINI_API_KEY) {
        try {
          const twoWeeksAgo = subDays(new Date(), 14);
          const twoWeeksAgoStr = format(twoWeeksAgo, "yyyy-MM-dd");
          const [habitData, taskData, notesData, history] = await Promise.all([
            getHabits(),
            getEventsByDateRange(twoWeeksAgo, new Date()),
            db.select().from(note).where(gte(note.date, twoWeeksAgoStr)),
            getReliefHistory(twoWeeksAgoStr)
          ]);

          const prompt = getReliefRecommendationPrompt({
            ...weatherInfo,
            recentNotes: notesData.map((n: any) => {
              try {
                const parsed = JSON.parse(n.content);
                return Array.isArray(parsed) ? parsed.map((p: any) => p.text).join(" ") : n.content;
              } catch (e) { return n.content; }
            }),
            recentTasks: taskData.map((t: any) => ({ title: t.title })),
            history: history.map((r: any) => ({ title: r.title, type: r.type })),
            today
          });

          const content = await safeGenerateContent(prompt, {
            model: "gemini-3.1-flash-lite",
            responseMimeType: "application/json"
          });

          if (content) {
            const data = JSON.parse(content);
            const main = data.recommendations[0];
            const [newRec] = await db.insert(reliefRecommendation).values({
              date: today,
              title: main.title,
              description: main.description,
              type: main.type,
              location: weatherInfo.location,
              weather: weatherInfo.weather,
              temp: weatherInfo.temp.split('°')[0], // Store only the max temp for display
              alternatives: data.alternatives || [],
              xpReward: 10,
              stat: "charisma"
            }).returning();
            recommendation = newRec;
          }
        } catch (error) {
          console.error("Relief AI Error:", error);
        }
      }

      if (!recommendation) {
        const [fallbackRec] = await db.insert(reliefRecommendation).values({
          date: today,
          title: "Listen to 'Lo-fi Girl' Radio [OFF]",
          description: "Perfect background for unwinding after a productive day.",
          type: "song",
          location: weatherInfo.location,
          weather: weatherInfo.weather,
          temp: weatherInfo.temp ? weatherInfo.temp.split('°')[0] : "22", // Store only the max temp for display
          alternatives: [
            { title: "Quick 5-min Stretch", type: "activity" },
            { title: "Hot Herbal Tea", type: "food" }
          ],
          xpReward: 10,
          stat: "charisma"
        }).returning();
        recommendation = fallbackRec;
      }
    }

    return recommendation;
  } catch (e) {
    console.error("Error in getReliefRecommendation:", e);
    return null;
  }
}

export async function toggleReliefRecommendation(id: string, completed: boolean, index: number = 0) {
  try {
    const updateData: any = {};
    if (index === 0) updateData.completed = completed;
    else if (index === 1) updateData.alt1Completed = completed;
    else if (index === 2) updateData.alt2Completed = completed;

    await db.update(reliefRecommendation)
      .set(updateData)
      .where(eq(reliefRecommendation.id, id));
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    console.error("Error in toggleReliefRecommendation:", e);
    return { success: false };
  }
}

export async function getReliefHistory(sinceDate?: string) {
  try {
    const since = sinceDate || format(subDays(new Date(), 14), "yyyy-MM-dd");
    return await db.select().from(reliefRecommendation)
      .where(gte(reliefRecommendation.date, since))
      .orderBy(desc(reliefRecommendation.date));
  } catch (e) {
    return [];
  }
}

export async function regenerateReliefRecommendation(lat?: number, lon?: number, clientDateStr?: string) {
  const today = clientDateStr || format(new Date(), "yyyy-MM-dd");
  try {
    await db.delete(reliefRecommendation).where(eq(reliefRecommendation.date, today));
    return await getReliefRecommendation(lat, lon, clientDateStr);
  } catch (e) {
    return null;
  }
}

