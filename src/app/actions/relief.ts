"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { format, subDays } from "date-fns";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getReliefRecommendationPrompt } from "@/lib/prompts";
import { getProfile } from "./gamification";
import { getHabits } from "./habits";
import { getEventsByDateRange } from "./events";

const GEMINI_API_KEY = process.env.gemini_key;

export async function getReliefRecommendation(lat?: number, lon?: number) {
  const today = format(new Date(), "yyyy-MM-dd");
  
  try {
    let recommendation = await (prisma as any).reliefRecommendation.findUnique({
      where: { date: today }
    });

    if (!recommendation) {
      let weatherInfo = { weather: "Clear", temp: "22", location: "No location found" };
      
      if (lat && lon) {
        try {
          const [weatherRes, geoRes] = await Promise.all([
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max&timezone=auto`),
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`, {
              headers: { "User-Agent": "TaskMaster/1.0" }
            })
          ]);
          
          const weatherData = await weatherRes.json();
          const geoData = await geoRes.json();

          if (weatherData.daily) {
            weatherInfo.temp = Math.round(weatherData.daily.temperature_2m_max[0]).toString();
            const code = weatherData.daily.weathercode[0];
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
          const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
          const model = genAI.getGenerativeModel({ 
            model: "gemini-3.1-flash-lite",
            generationConfig: { responseMimeType: "application/json" }
          });

          const lastWeek = subDays(new Date(), 7);
          const [habitData, taskData, notesData, history] = await Promise.all([
            getHabits(),
            getEventsByDateRange(lastWeek, new Date()),
            prisma.note.findMany({
              where: { date: { gte: format(lastWeek, "yyyy-MM-dd") } }
            }),
            getReliefHistory(10)
          ]);

          const prompt = getReliefRecommendationPrompt({
            ...weatherInfo,
            recentNotes: notesData.map((n: any) => {
              try {
                const parsed = JSON.parse(n.content);
                return Array.isArray(parsed) ? parsed.map((p:any) => p.text).join(" ") : n.content;
              } catch(e) { return n.content; }
            }),
            recentTasks: taskData.map((t: any) => ({ title: t.title })),
            history: history.map((r: any) => ({ title: r.title, type: r.type }))
          });

          const result = await model.generateContent(prompt);
          const content = result.response.text();
          
          if (content) {
            const data = JSON.parse(content);
            const main = data.recommendations[0];
            recommendation = await (prisma as any).reliefRecommendation.create({
              data: {
                date: today,
                title: main.title,
                description: main.description,
                type: main.type,
                location: weatherInfo.location,
                weather: weatherInfo.weather,
                temp: weatherInfo.temp,
                alternatives: data.alternatives || [],
                xpReward: 10,
                stat: "charisma"
              }
            });
          }
        } catch (error) {
          console.error("Relief AI Error:", error);
        }
      }

      if (!recommendation) {
        recommendation = await (prisma as any).reliefRecommendation.create({
          data: {
            date: today,
            title: "Listen to 'Lo-fi Girl' Radio",
            description: "Perfect background for unwinding after a productive day.",
            type: "song",
            location: weatherInfo.location,
            weather: weatherInfo.weather,
            temp: weatherInfo.temp,
            alternatives: [
              { title: "Quick 5-min Stretch", type: "activity" },
              { title: "Hot Herbal Tea", type: "food" }
            ],
            xpReward: 10,
            stat: "charisma"
          }
        });
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

    await (prisma as any).reliefRecommendation.update({
      where: { id },
      data: updateData
    });
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    console.error("Error in toggleReliefRecommendation:", e);
    return { success: false };
  }
}

export async function getReliefHistory(limit: number = 10) {
  try {
    return await (prisma as any).reliefRecommendation.findMany({
      orderBy: { date: "desc" },
      take: limit
    });
  } catch (e) {
    return [];
  }
}

export async function regenerateReliefRecommendation(lat?: number, lon?: number) {
  const today = format(new Date(), "yyyy-MM-dd");
  try {
    await (prisma as any).reliefRecommendation.deleteMany({
      where: { date: today }
    });
    return await getReliefRecommendation(lat, lon);
  } catch (e) {
    return null;
  }
}
