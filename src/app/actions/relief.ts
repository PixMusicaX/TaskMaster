"use server";

import { db } from "@/db";
import { reliefRecommendation, note } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { endOfDay, format, parseISO, subDays } from "date-fns";
import { getRaidPrompt, getReliefRecommendationPrompt } from "@/lib/prompts";
import { isRepeat, rollReliefBrief } from "@/lib/relief-dice";
import { resolvePersonaStyle } from "@/lib/persona";
import { requireUserId } from "@/lib/current-user";
import { invalidateSnapshots, profileFor, statsForPeriod } from "@/lib/data/stats";
import { habitsFor } from "@/lib/data/habits";
import { plannerEventsByDateRange } from "@/lib/data/events";
import { reliefsWithCarriedLocation } from "@/lib/data/relief";
import { safeGenerateContent } from "@/lib/ai-utils";
import { AiUnavailableError } from "@/lib/ai-errors";
import { AI_GENERATOR_DEADLINE_MS } from "@/lib/ai-guard";
import { OFFLINE_TAG, pickOfflineRaid, pickOfflineRelief } from "@/lib/offline-missions";
import { personalizationFor } from "@/lib/data/preferences";
import { RAID_STAT_MEANING, RAID_TYPE, RAID_XP, isRaid, isRaidDay, raidTargets, type RaidRecap } from "@/lib/raid";
import { noteTextLines, parseNoteLines, type Relief, type ReliefAlternative, type ReliefRow, type StatName } from "@/lib/types";
import { eq, desc, gte, and, notInArray } from "drizzle-orm";
import { NO_LOCATION, UNNAMED_AREA, placeName } from "@/lib/weather";

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
): Promise<Relief | null> {
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
           // An unnamed spot is no use as "the last place": it can't be shown
           where: and(eq(reliefRecommendation.userId, userId), notInArray(reliefRecommendation.location, [NO_LOCATION, UNNAMED_AREA])),
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
            // A slow weather or map service must not hold the Tavern up: past this it goes without
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=3`, {
              signal: AbortSignal.timeout(CONTEXT_TIMEOUT_MS)
            }),
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`, {
              headers: { "User-Agent": "TaskMaster/1.0" },
              signal: AbortSignal.timeout(CONTEXT_TIMEOUT_MS)
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
            // The weather is real either way; the place just goes unnamed when the map has no name for it
            weatherInfo.location = placeName(geoData.address) ?? UNNAMED_AREA;
          }
        } catch (e) {
          console.error("Relief context fetch failed:", e);
        }
      }

      // Mondays are raid day: the Tavern's row holds the week's raid instead (with the day's
      // weather, which the clock shows)
      if (isRaidDay(today)) {
        recommendation = await createRaid(userId, today, persona, exclude, weatherInfo);
      }

      if (!recommendation) {
        try {
          const clientNow = new Date(today);
          const twoWeeksAgo = subDays(clientNow, 14);
          const twoWeeksAgoStr = format(twoWeeksAgo, "yyyy-MM-dd");
          // Mood comes from the last two weeks; the do-not-repeat list reaches back four months
          const [taskData, notesData, history, personal] = await Promise.all([
            plannerEventsByDateRange(userId, twoWeeksAgo, clientNow),
            db.select().from(note).where(and(eq(note.userId, userId), gte(note.date, twoWeeksAgoStr))),
            reliefHistoryFor(userId, format(subDays(clientNow, RELIEF_MEMORY_DAYS), "yyyy-MM-dd")),
            personalizationFor(userId)
          ]);

          // Raids are a different game: they stay out of the Tavern's memory and its dice
          const reliefs = history.filter(r => !isRaid(r));
          const past = [
            ...exclude.map(title => ({ title, type: "just replaced" as string | null })),
            ...reliefs.flatMap((r) => [
              { title: r.title, type: r.type },
              ...((r.alternatives as ReliefAlternative[] | null) || []).map((alt) => ({ title: alt.title, type: alt.type }))
            ]),
          ].filter(h => !h.title.includes(OFFLINE_TAG));
          const pastTitles = past.map(h => h.title);
          // The model is bad at dice, so today's types and angles are rolled here
          const brief = rollReliefBrief(reliefs.map(r => r.type));

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
              // The lite model: quick, and the Tavern's picks don't need deep thought
              model: "gemini-flash-lite-latest",
              responseMimeType: "application/json",
              temperature: 1.15,
              // The second ask (for repeats) gets less time: the first answer is already in hand
              deadlineMs: rejected.length ? AI_GENERATOR_DEADLINE_MS / 2 : AI_GENERATOR_DEADLINE_MS,
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
          // No key, a spent budget or a slow provider is expected; anything else is worth a log line
          if (!(error instanceof AiUnavailableError)) console.error("Relief AI Error:", error);
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

    return isRaid(recommendation) ? { ...recommendation, raidRecap: await raidRecapFor(userId, today) } : recommendation;
  } catch (e) {
    console.error("Error in getReliefRecommendation:", e);
    return null;
  }
}

// How long the Tavern waits for the weather and the place name
const CONTEXT_TIMEOUT_MS = 4_000;

type RaidObjective = { title: string; description?: string; stat: StatName };

// The week's raid (see lib/raid.ts): written by the AI when it can, picked offline when it can't
async function createRaid(
  userId: string, today: string, persona: string | null | undefined, exclude: string[],
  weather: { location: string; weather: string; temp: string },
): Promise<ReliefRow> {
  const twoWeeksAgo = subDays(parseISO(today), 14);
  const [profile, habitData, taskData, notesData, history, personal] = await Promise.all([
    profileFor(userId, today),
    habitsFor(userId, today),
    plannerEventsByDateRange(userId, twoWeeksAgo, parseISO(today)),
    db.select().from(note).where(and(eq(note.userId, userId), gte(note.date, format(twoWeeksAgo, "yyyy-MM-dd")))),
    reliefHistoryFor(userId, format(subDays(parseISO(today), RELIEF_MEMORY_DAYS), "yyyy-MM-dd")),
    personalizationFor(userId),
  ]);
  const targets = raidTargets(profile.stats);
  const pastTitles = [
    ...exclude,
    ...history.filter(r => isRaid(r)).flatMap(r => [r.title, ...((r.alternatives as ReliefAlternative[] | null) || []).map(a => a.title)]),
  ];

  let objectives: RaidObjective[] | null = null;
  try {
    const content = await safeGenerateContent(getRaidPrompt({
      stats: profile.stats,
      targets: targets.map(stat => ({ stat, meaning: RAID_STAT_MEANING[stat] })),
      habits: habitData.map(h => h.name),
      recentTasks: taskData.filter(t => !t.isApi).map(t => ({ title: t.title, completed: t.completed })),
      recentNotes: notesData.sort((a, b) => b.date.localeCompare(a.date)).map(n => noteTextLines(n.content).join("; ")).filter(Boolean),
      history: pastTitles.filter(t => !t.includes(OFFLINE_TAG)),
      today,
      persona: resolvePersonaStyle(persona, today),
      personal,
    }), { userId, model: "gemini-flash-latest", responseMimeType: "application/json", deadlineMs: AI_GENERATOR_DEADLINE_MS });
    const data = JSON.parse(content) as { objectives?: { title?: string; description?: string }[] };
    const written = (data.objectives ?? []).filter(o => o.title?.trim());
    // The stats are ours, whatever the model wrote back
    if (written.length >= targets.length) {
      objectives = targets.map((stat, i) => ({ title: written[i].title!.trim(), description: written[i].description, stat }));
    }
  } catch (error) {
    if (!(error instanceof AiUnavailableError)) console.error("Raid AI Error:", error);
  }
  objectives ??= pickOfflineRaid(targets, pastTitles);

  const [main, ...rest] = objectives;
  // Two requests at once (a second tab, say) both end up with the one raid
  const [row] = await db.insert(reliefRecommendation).values({
    userId,
    date: today,
    title: main.title,
    description: main.description ?? null,
    type: RAID_TYPE,
    location: weather.location,
    weather: weather.weather,
    temp: weather.temp.split("°")[0],
    alternatives: rest.map(o => ({ title: o.title, type: RAID_TYPE, description: o.description, stat: o.stat })),
    xpReward: RAID_XP,
    stat: main.stat,
  }).onConflictDoNothing({ target: [reliefRecommendation.userId, reliefRecommendation.date] }).returning();
  return row ?? (await db.query.reliefRecommendation.findFirst({
    where: and(eq(reliefRecommendation.userId, userId), eq(reliefRecommendation.date, today))
  }))!;
}

// Last week (Monday to Sunday) against the week before, and how last Monday's raid went
async function raidRecapFor(userId: string, today: string): Promise<RaidRecap> {
  const day = (n: number) => subDays(parseISO(today), n);
  const [lastWeek, weekBefore, lastRaid] = await Promise.all([
    statsForPeriod(userId, day(7), endOfDay(day(1))),
    statsForPeriod(userId, day(14), endOfDay(day(8))),
    db.query.reliefRecommendation.findFirst({
      where: and(eq(reliefRecommendation.userId, userId), eq(reliefRecommendation.date, format(day(7), "yyyy-MM-dd")))
    }),
  ]);
  const cleared = lastRaid && isRaid(lastRaid)
    ? [lastRaid.completed, lastRaid.alt1Completed, lastRaid.alt2Completed].filter(Boolean).length
    : null;
  return { xp: lastWeek?.xp ?? 0, previousXp: weekBefore?.xp ?? 0, cleared };
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

