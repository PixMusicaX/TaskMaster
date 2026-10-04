"use server";

import { db } from "@/db";
import { reliefRecommendation, note } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { format, subDays } from "date-fns";
import { getReliefRecommendationPrompt } from "@/lib/prompts";
import { isRepeat, rollReliefBrief } from "@/lib/relief-dice";
import { resolvePersonaStyle } from "@/lib/persona";
import { invalidateSeasonSnapshots } from "./gamification";
import { getEventsByDateRange } from "./events";
import { safeGenerateContent } from "@/lib/ai-utils";
import { parseNoteLines, type ReliefAlternative } from "@/lib/types";
import { eq, desc, gte, lte, lt, ne, asc, and, isNotNull } from "drizzle-orm";

const GEMINI_API_KEY = process.env.gemini_key;

// How far back the Tavern remembers what it has already suggested
const RELIEF_MEMORY_DAYS = 120;

type ReliefPick = { title: string; type: string; description: string };

// `persona` is the Persona style the client is showing (null for a normal day; left out, the
// calendar decides). `exclude` lists titles to treat as already suggested (a regenerate passes
// the picks it just threw away).
export async function getReliefRecommendation(
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
      where: eq(reliefRecommendation.date, today)
    });

    if (!recommendation) {
      const weatherInfo: { weather: string; temp: string; location: string; precipitation?: number; windSpeed?: number } = { 
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
          // Mood comes from the last two weeks; the do-not-repeat list reaches back four months
          const [taskData, notesData, history] = await Promise.all([
            getEventsByDateRange(twoWeeksAgo, clientNow),
            db.select().from(note).where(gte(note.date, twoWeeksAgoStr)),
            getReliefHistory(format(subDays(clientNow, RELIEF_MEMORY_DAYS), "yyyy-MM-dd"))
          ]);

          const past = [
            ...exclude.map(title => ({ title, type: "just replaced" as string | null })),
            ...history.flatMap((r) => [
              { title: r.title, type: r.type },
              ...((r.alternatives as ReliefAlternative[] | null) || []).map((alt) => ({ title: alt.title, type: alt.type }))
            ]),
          ].filter(h => !h.title.includes("[OFF]"));
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
            }), {
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
    const updateData: Partial<typeof reliefRecommendation.$inferInsert> = {};
    if (index === 0) updateData.completed = completed;
    else if (index === 1) updateData.alt1Completed = completed;
    else if (index === 2) updateData.alt2Completed = completed;

    const [updated] = await db.update(reliefRecommendation)
      .set(updateData)
      .where(eq(reliefRecommendation.id, id))
      .returning({ date: reliefRecommendation.date });
    await invalidateSeasonSnapshots(updated?.date);
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    console.error("Error in toggleReliefRecommendation:", e);
    return { success: false };
  }
}

// Relief rows in [fromDate, toDate] (ascending), with missing locations/weather carried
// forward from the most recent earlier row that had a real location.
export async function getReliefsWithCarriedLocation(fromDate: string, toDate?: string) {
  const [rows, [seed]] = await Promise.all([
    db.select().from(reliefRecommendation)
      .where(toDate
        ? and(gte(reliefRecommendation.date, fromDate), lte(reliefRecommendation.date, toDate))
        : gte(reliefRecommendation.date, fromDate))
      .orderBy(asc(reliefRecommendation.date)),
    db.select().from(reliefRecommendation)
      .where(and(
        lt(reliefRecommendation.date, fromDate),
        isNotNull(reliefRecommendation.location),
        ne(reliefRecommendation.location, ""),
        ne(reliefRecommendation.location, "No location found")
      ))
      .orderBy(desc(reliefRecommendation.date))
      .limit(1)
  ]);

  let lastValidLocation = seed?.location || "No location found";
  let lastValidWeather = seed?.weather || "Clear";
  let lastValidTemp = seed?.temp || "22";

  return rows.map(r => {
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
}

export async function getReliefHistory(sinceDate?: string) {
  try {
    const since = sinceDate || format(subDays(new Date(), 14), "yyyy-MM-dd");
    const processed = await getReliefsWithCarriedLocation(since);
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
  const today = clientDateStr || format(new Date(), "yyyy-MM-dd");
  try {
    // The picks being thrown away must not come straight back
    const discarded = await db.delete(reliefRecommendation).where(eq(reliefRecommendation.date, today))
      .returning({ title: reliefRecommendation.title, alternatives: reliefRecommendation.alternatives });
    const exclude = discarded.flatMap(r => [r.title, ...((r.alternatives as ReliefAlternative[] | null) || []).map(a => a.title)]);
    return await getReliefRecommendation(lat, lon, clientDateStr, cachedLocation, cachedWeather, cachedTemp, persona, exclude);
  } catch {
    return null;
  }
}

