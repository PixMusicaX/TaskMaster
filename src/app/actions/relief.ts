"use server";

import { db } from "@/db";
import { reliefRecommendation, note } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { format, subDays } from "date-fns";
import { getReliefRecommendationPrompt } from "@/lib/prompts";
import { isRepeat, rollReliefBrief } from "@/lib/relief-dice";
import { resolvePersonaStyle } from "@/lib/persona";
import { requireUserId } from "@/lib/current-user";
import { invalidateSnapshots } from "@/lib/data/stats";
import { eventsByDateRange } from "@/lib/data/events";
import { reliefsWithCarriedLocation } from "@/lib/data/relief";
import { safeGenerateContent } from "@/lib/ai-utils";
import { AiNotConfiguredError } from "@/lib/ai-config";
import { OFFLINE_TAG, pickOfflineRelief } from "@/lib/offline-missions";
import { personalizationFor } from "@/lib/data/preferences";
import { parseNoteLines, type ReliefAlternative } from "@/lib/types";
import { eq, desc, gte, ne, and } from "drizzle-orm";

// How far back the Tavern remembers what it has already suggested
const RELIEF_MEMORY_DAYS = 120;

type ReliefPick = { title: string; type: string; description: string };

// `persona` is the Persona style the client is showing (null for a normal day; left out, the
// calendar decides).
export async function getReliefRecommendation(
  lat?: number,
  lon?: number,
  clientDateStr?: string,
  cachedLocation?: string,
  cachedWeather?: string,
  cachedTemp?: string,
  persona?: string | null
) {
  return reliefFor(await requireUserId(), lat, lon, clientDateStr, cachedLocation, cachedWeather, cachedTemp, persona);
}

// `exclude` lists titles to treat as already suggested (a regenerate passes the picks it just
// threw away)
async function reliefFor(
  userId: string,
  lat?: number,
  lon?: number,
  clientDateStr?: string,
  cachedLocation?: string,
  cachedWeather?: string,
  cachedTemp?: string,
  persona?: string | null,
  exclude: string[] = []
) {
  const today = clientDateStr || format(new Date(), "yyyy-MM-dd");

  try {
    let recommendation = await db.query.reliefRecommendation.findFirst({
      where: and(eq(reliefRecommendation.userId, userId), eq(reliefRecommendation.date, today))
    });

    if (!recommendation) {
      const weatherInfo: { weather: string; temp: string; location: string; precipitation?: number; windSpeed?: number } = { 
        weather: cachedWeather || "Clear", 
        temp: cachedTemp || "22", 
        location: cachedLocation || "No location found" 
      };

      if (!cachedLocation || cachedLocation === "No location found") {
        const lastValid = await db.query.reliefRecommendation.findFirst({
           where: and(eq(reliefRecommendation.userId, userId), ne(reliefRecommendation.location, "No location found")),
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

      {
        try {
          const clientNow = new Date(today);
          const twoWeeksAgo = subDays(clientNow, 14);
          const twoWeeksAgoStr = format(twoWeeksAgo, "yyyy-MM-dd");
          // Mood comes from the last two weeks; the do-not-repeat list reaches back four months
          const [taskData, notesData, history, personal] = await Promise.all([
            eventsByDateRange(userId, twoWeeksAgo, clientNow),
            db.select().from(note).where(and(eq(note.userId, userId), gte(note.date, twoWeeksAgoStr))),
            reliefHistoryFor(userId, format(subDays(clientNow, RELIEF_MEMORY_DAYS), "yyyy-MM-dd")),
            personalizationFor(userId)
          ]);

          const past = [
            ...exclude.map(title => ({ title, type: "just replaced" as string | null })),
            ...history.flatMap((r) => [
              { title: r.title, type: r.type },
              ...((r.alternatives as ReliefAlternative[] | null) || []).map((alt) => ({ title: alt.title, type: alt.type }))
            ]),
          ].filter(h => !h.title.includes(OFFLINE_TAG));
          const pastTitles = past.map(h => h.title);
          // The model is bad at dice, so today's types and angles are rolled here
          const brief = rollReliefBrief(history.map(r => r.type));

          const ask = async (rejected: string[]) => {
            const content = await safeGenerateContent(getReliefRecommendationPrompt({
              ...weatherInfo,
              recentNotes: notesData.map((n) => parseNoteLines(n.content)?.map(p => p.text).join(" ") ?? n.content),
              recentTasks: taskData.map((t) => ({
                title: t.title,
                completed: t.completed
              })),
              history: past,
              today,
              brief,
              rejected,
              persona: resolvePersonaStyle(persona, today),
              personal,
            }), {
              userId,
              model: "gemini-3.1-flash-lite",
              responseMimeType: "application/json",
              temperature: 1.15,
            });
            const data = JSON.parse(content) as { recommendations: ReliefPick[]; alternatives?: ReliefAlternative[] };
            return { main: data.recommendations[0], alternatives: data.alternatives || [] };
          };

          let picks = await ask([]);
          // It still repeats now and then: name the repeats and ask once more
          const repeats = [picks.main, ...picks.alternatives].filter(p => isRepeat(p.title, pastTitles)).map(p => p.title);
          if (repeats.length) {
            try {
              const second = await ask(repeats);
              const stillRepeats = [second.main, ...second.alternatives].filter(p => isRepeat(p.title, pastTitles)).length;
              if (stillRepeats < repeats.length) picks = second;
            } catch (retryError) {
              console.error("Relief retry failed, keeping the first answer:", retryError);
            }
          }

          if (picks.main) {
            const main = picks.main;
            const [newRec] = await db.insert(reliefRecommendation).values({
              userId,
              date: today,
              title: main.title,
              description: main.description,
              type: main.type,
              location: weatherInfo.location,
              weather: weatherInfo.weather,
              temp: weatherInfo.temp.split('°')[0], // Store only the max temp for display
              alternatives: picks.alternatives,
              xpReward: 10,
              stat: "charisma"
            }).returning();
            recommendation = newRec;
          }
        } catch (error) {
          // No key on this account is expected; anything else is worth a log line
          if (!(error instanceof AiNotConfiguredError)) console.error("Relief AI Error:", error);
        }
      }

      if (!recommendation) {
        const recent = await reliefHistoryFor(userId, format(subDays(new Date(today), 30), "yyyy-MM-dd"));
        const offline = pickOfflineRelief(weatherInfo.weather, [...exclude, ...recent.map(r => r.title)]);
        const [fallbackRec] = await db.insert(reliefRecommendation).values({
          userId,
          date: today,
          title: offline.title,
          description: offline.description,
          type: offline.type,
          location: weatherInfo.location,
          weather: weatherInfo.weather,
          temp: weatherInfo.temp ? weatherInfo.temp.split('°')[0] : "22", // Store only the max temp for display
          alternatives: offline.alternatives,
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
  const userId = await requireUserId();
  try {
    const updateData: Partial<typeof reliefRecommendation.$inferInsert> = {};
    if (index === 0) updateData.completed = completed;
    else if (index === 1) updateData.alt1Completed = completed;
    else if (index === 2) updateData.alt2Completed = completed;

    const [updated] = await db.update(reliefRecommendation)
      .set(updateData)
      .where(and(eq(reliefRecommendation.id, id), eq(reliefRecommendation.userId, userId)))
      .returning({ date: reliefRecommendation.date });
    await invalidateSnapshots(userId, updated?.date);
    revalidatePath("/home");
    return { success: true };
  } catch (e) {
    console.error("Error in toggleReliefRecommendation:", e);
    return { success: false };
  }
}

export async function getReliefsWithCarriedLocation(fromDate: string, toDate?: string) {
  return reliefsWithCarriedLocation(await requireUserId(), fromDate, toDate);
}

export async function getReliefHistory(sinceDate?: string) {
  return reliefHistoryFor(await requireUserId(), sinceDate);
}

async function reliefHistoryFor(userId: string, sinceDate?: string) {
  try {
    const since = sinceDate || format(subDays(new Date(), 14), "yyyy-MM-dd");
    const processed = await reliefsWithCarriedLocation(userId, since);
    return processed.sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

export async function regenerateReliefRecommendation(
  lat?: number, 
  lon?: number, 
  clientDateStr?: string,
  cachedLocation?: string,
  cachedWeather?: string,
  cachedTemp?: string,
  persona?: string | null
) {
  const userId = await requireUserId();
  const today = clientDateStr || format(new Date(), "yyyy-MM-dd");
  try {
    // The picks being thrown away must not come straight back
    const discarded = await db.delete(reliefRecommendation).where(and(eq(reliefRecommendation.userId, userId), eq(reliefRecommendation.date, today)))
      .returning({ title: reliefRecommendation.title, alternatives: reliefRecommendation.alternatives });
    const exclude = discarded.flatMap(r => [r.title, ...((r.alternatives as ReliefAlternative[] | null) || []).map(a => a.title)]);
    return await reliefFor(userId, lat, lon, clientDateStr, cachedLocation, cachedWeather, cachedTemp, persona, exclude);
  } catch {
    return null;
  }
}

