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
import { eq, desc, gte, ne, asc } from "drizzle-orm";

const GEMINI_API_KEY = process.env.gemini_key;

export async function getReliefRecommendation(
  lat?: number, 
  lon?: number, 
  clientDateStr?: string,
  cachedLocation?: string,
  cachedWeather?: string,
  cachedTemp?: string
) {
  const today = clientDateStr || format(new Date(), "yyyy-MM-dd");

  try {
    let recommendation = await db.query.reliefRecommendation.findFirst({
      where: eq(reliefRecommendation.date, today)
    });

    if (!recommendation) {
      let weatherInfo: { weather: string; temp: string; location: string; precipitation?: number; windSpeed?: number } = { 
        weather: cachedWeather || "Clear", 
        temp: cachedTemp || "22", 
        location: cachedLocation || "No location found" 
      };

      if (!cachedLocation || cachedLocation === "No location found") {
        const lastValid = await db.query.reliefRecommendation.findFirst({
           where: ne(reliefRecommendation.location, "No location found"),
           orderBy: [desc(reliefRecommendation.date)]
        });
        if (lastValid) {
           weatherInfo.location = lastValid.location || "No location found";
           if (!cachedWeather || cachedWeather === "Clear") weatherInfo.weather = lastValid.weather || "Clear";
           if (!cachedTemp || cachedTemp === "22") weatherInfo.temp = lastValid.temp || "22";
        }
      }

      if (lat && lon) {
        try {
          const [weatherRes, geoRes] = await Promise.all([
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=3`),
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
            weatherInfo.precipitation = weatherData.daily.precipitation_probability_max[idx];
            weatherInfo.windSpeed = Math.round(weatherData.daily.wind_speed_10m_max[idx]);

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
          const clientNow = new Date(today);
          const twoWeeksAgo = subDays(clientNow, 14);
          const twoWeeksAgoStr = format(twoWeeksAgo, "yyyy-MM-dd");
          const [habitData, taskData, notesData, history] = await Promise.all([
            getHabits(),
            getEventsByDateRange(twoWeeksAgo, clientNow),
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
            recentTasks: taskData.map((t: any) => ({
              title: t.title,
              completed: t.completed
            })),
            history: history.flatMap((r: any) => [
              { title: r.title, type: r.type },
              ...(r.alternatives || []).map((alt: any) => ({ title: alt.title, type: alt.type }))
            ]),
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
    const allRecords = await db.select().from(reliefRecommendation).orderBy(asc(reliefRecommendation.date));
    
    let lastValidLocation = "No location found";
    let lastValidWeather = "Clear";
    let lastValidTemp = "22";

    const processed = allRecords.map(r => {
      if (r.location && r.location !== "No location found") {
         lastValidLocation = r.location;
         lastValidWeather = r.weather || "Clear";
         lastValidTemp = r.temp || "22";
      } else {
         r.location = lastValidLocation;
         r.weather = lastValidWeather;
         r.temp = lastValidTemp;
      }
      return r;
    });

    return processed
      .filter(r => r.date >= since)
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch (e) {
    return [];
  }
}

export async function regenerateReliefRecommendation(
  lat?: number, 
  lon?: number, 
  clientDateStr?: string,
  cachedLocation?: string,
  cachedWeather?: string,
  cachedTemp?: string
) {
  const today = clientDateStr || format(new Date(), "yyyy-MM-dd");
  try {
    await db.delete(reliefRecommendation).where(eq(reliefRecommendation.date, today));
    return await getReliefRecommendation(lat, lon, clientDateStr, cachedLocation, cachedWeather, cachedTemp);
  } catch (e) {
    return null;
  }
}

