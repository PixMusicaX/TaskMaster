import { describe, it, expect, beforeEach, vi } from "vitest";
import { safeGenerateContent } from "@/lib/ai-utils";
import {
  getReliefRecommendation, regenerateReliefRecommendation, toggleReliefRecommendation,
  getReliefHistory, getReliefsWithCarriedLocation,
} from "@/app/actions/relief";
import { getSmartMission, regenerateSmartMission, toggleSmartMission } from "@/app/actions/smart-missions";
import { getPreparationTip, togglePreparationTip } from "@/app/actions/preparation";
import { getDailyQuote } from "@/app/actions/daily-quote";
import { reliefRecommendation, smartMission, dailyQuote } from "@/db/schema";
import { db } from "./helpers/test-db";
import { setToday, insertRelief, jsonResponse } from "./helpers/fixtures";

const ai = vi.mocked(safeGenerateContent);

// Route mocked network calls by host
function mockNetwork(routes: Record<string, unknown>) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const host = new URL(url).hostname;
    if (!(host in routes)) throw new Error(`Unexpected fetch: ${url}`);
    return jsonResponse(routes[host]);
  }));
}

beforeEach(() => setToday("2026-09-28"));

describe("getReliefsWithCarriedLocation", () => {
  it("fills missing locations from the last known one, even before the range", async () => {
    await insertRelief({ date: "2026-01-01", location: "Pune", weather: "Clear", temp: "28" });
    await insertRelief({ date: "2026-09-01", location: "No location found" });
    await insertRelief({ date: "2026-09-02", location: "Delhi", weather: "Foggy", temp: "18" });
    await insertRelief({ date: "2026-09-03", location: null });

    const rows = await getReliefsWithCarriedLocation("2026-09-01");
    expect(rows.map(r => [r.date, r.location, r.weather])).toEqual([
      ["2026-09-01", "Pune", "Clear"],
      ["2026-09-02", "Delhi", "Foggy"],
      ["2026-09-03", "Delhi", "Foggy"],
    ]);
  });

  it("uses defaults when there has never been a location", async () => {
    await insertRelief({ date: "2026-09-01" });
    const [row] = await getReliefsWithCarriedLocation("2026-09-01");
    expect(row).toMatchObject({ location: "No location found", weather: "Clear", temp: "22" });
  });

  it("history is returned newest first", async () => {
    await insertRelief({ date: "2026-09-20" });
    await insertRelief({ date: "2026-09-22" });
    expect((await getReliefHistory("2026-09-01")).map(r => r.date)).toEqual(["2026-09-22", "2026-09-20"]);
  });
});

describe("getReliefRecommendation", () => {
  it("returns today's saved recommendation without calling the AI", async () => {
    await insertRelief({ date: "2026-09-28", title: "Saved" });
    expect((await getReliefRecommendation(undefined, undefined, "2026-09-28"))?.title).toBe("Saved");
    expect(ai).not.toHaveBeenCalled();
  });

  it("stores the AI suggestion with weather and location from the APIs", async () => {
    mockNetwork({
      "api.open-meteo.com": {
        daily: {
          time: ["2026-09-28"], weathercode: [95], temperature_2m_max: [32.4], temperature_2m_min: [24],
          apparent_temperature_max: [35], precipitation_probability_max: [80], wind_speed_10m_max: [20],
        },
      },
      "nominatim.openstreetmap.org": { address: { suburb: "Koramangala" } },
    });
    ai.mockResolvedValueOnce(JSON.stringify({
      recommendations: [{ title: "Watch a film", description: "Rainy day pick", type: "movie" }],
      alternatives: [{ title: "Tea", type: "food" }],
    }));

    const rec = await getReliefRecommendation(12.9, 77.6, "2026-09-28");
    expect(rec).toMatchObject({
      title: "Watch a film", type: "movie", location: "Koramangala", weather: "Stormy", temp: "32",
      alternatives: [{ title: "Tea", type: "food" }],
    });
  });

  it("falls back to a default suggestion when the AI fails, keeping the cached location", async () => {
    const rec = await getReliefRecommendation(undefined, undefined, "2026-09-28", "Pune", "Rainy", "26");
    expect(rec).toMatchObject({ location: "Pune", weather: "Rainy", temp: "26" });
    expect(rec?.title).toContain("[OFF]");
    expect(await db.select().from(reliefRecommendation)).toHaveLength(1);
  });

  it("regenerating replaces today's recommendation", async () => {
    await insertRelief({ date: "2026-09-28", title: "Old" });
    const rec = await regenerateReliefRecommendation(undefined, undefined, "2026-09-28");
    expect(rec?.title).not.toBe("Old");
    expect(await db.select().from(reliefRecommendation)).toHaveLength(1);
  });

  it("toggles the main suggestion and each alternative separately", async () => {
    const r = await insertRelief({ date: "2026-09-28" });
    await toggleReliefRecommendation(r.id, true, 1);
    const [row] = await db.select().from(reliefRecommendation);
    expect(row).toMatchObject({ completed: false, alt1Completed: true, alt2Completed: false });
  });
});

describe("getSmartMission", () => {
  it("stores the AI mission together with the daily quote", async () => {
    mockNetwork({ "zenquotes.io": [{ q: "Keep going.", a: "Someone" }] });
    ai.mockResolvedValueOnce(JSON.stringify({ title: "Call a friend", description: "Catch up for 10 minutes" }));

    const mission = await getSmartMission("2026-09-28");
    expect(mission).toMatchObject({ title: "Call a friend", quote: "Keep going. — Someone", date: "2026-09-28" });
    // The quote is fetched once and cached for the day
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("falls back to an offline mission when the AI fails", async () => {
    mockNetwork({ "zenquotes.io": [{ q: "Rest.", a: "" }] });
    const mission = await getSmartMission("2026-09-28");
    expect(mission?.title).toContain("[OFF]");
    expect(mission?.quote).toBe("Rest.");
  });

  it("returns the saved mission on later calls and can regenerate it", async () => {
    mockNetwork({ "zenquotes.io": [{ q: "Q", a: "A" }] });
    ai.mockResolvedValueOnce(JSON.stringify({ title: "First", description: "" }));
    await getSmartMission("2026-09-28");
    expect((await getSmartMission("2026-09-28"))?.title).toBe("First");

    ai.mockResolvedValueOnce(JSON.stringify({ title: "Second", description: "" }));
    expect((await regenerateSmartMission("2026-09-28"))?.title).toBe("Second");
    expect(await db.select().from(smartMission)).toHaveLength(1);
  });

  it("toggles completion", async () => {
    mockNetwork({ "zenquotes.io": [{ q: "Q", a: "A" }] });
    const mission = await getSmartMission("2026-09-28");
    await toggleSmartMission(mission!.id, true);
    expect((await getSmartMission("2026-09-28"))?.completed).toBe(true);
  });
});

describe("getPreparationTip", () => {
  it("stores the AI tip", async () => {
    ai.mockResolvedValueOnce(JSON.stringify({ title: "Pack early", description: "Trip on Friday" }));
    const tip = await getPreparationTip("2026-09-28");
    expect(tip).toMatchObject({ title: "Pack early", xpReward: 25 });

    await togglePreparationTip(tip!.id, true);
    expect((await getPreparationTip("2026-09-28"))?.completed).toBe(true);
  });

  it("returns nothing when the AI fails", async () => {
    expect(await getPreparationTip("2026-09-28")).toBeFalsy();
  });
});

describe("getDailyQuote", () => {
  it("fetches once per day and caches it", async () => {
    mockNetwork({ "zenquotes.io": [{ q: "Stay curious.", a: "Anon" }] });
    expect(await getDailyQuote("2026-09-28")).toBe("Stay curious. — Anon");
    expect(await getDailyQuote("2026-09-28")).toBe("Stay curious. — Anon");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("uses a default quote (not cached) when the API fails", async () => {
    const quote = await getDailyQuote("2026-09-28");
    expect(quote).toBe("Every grand legend begins with a single modest step.");
    expect(await db.select().from(dailyQuote)).toHaveLength(0);
  });
});
