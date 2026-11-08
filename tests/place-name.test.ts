import { describe, it, expect, beforeEach, vi } from "vitest";
import { safeGenerateContent } from "@/lib/ai-utils";
import { getReliefRecommendation } from "@/app/actions/relief";
import { NO_LOCATION, UNNAMED_AREA, isNamedPlace, placeName } from "@/lib/weather";
import { setToday, insertRelief, jsonResponse } from "./helpers/fixtures";

const ai = vi.mocked(safeGenerateContent);
const TUESDAY = "2026-09-29";

// The weather service answers clear; the map service answers with `address`
function mockServices(address: Record<string, string>) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const host = new URL(url).hostname;
    if (host === "api.open-meteo.com") {
      return jsonResponse({ daily: {
        time: [TUESDAY], weathercode: [0], temperature_2m_max: [30], temperature_2m_min: [20],
        apparent_temperature_max: [31], precipitation_probability_max: [0], wind_speed_10m_max: [5],
      } });
    }
    if (host === "nominatim.openstreetmap.org") return jsonResponse({ address });
    throw new Error(`Unexpected fetch: ${url}`);
  }));
}

beforeEach(() => setToday(TUESDAY));

describe("naming the player's place", () => {
  it("takes the most local name the map has", () => {
    expect(placeName({ suburb: "Koramangala", city: "Bengaluru" })).toBe("Koramangala");
    expect(placeName({ city: "Bengaluru", state: "Karnataka" })).toBe("Bengaluru");
    // Rural spots: no suburb, city or town
    expect(placeName({ village: "Hampi", county: "Vijayanagara", state: "Karnataka" })).toBe("Hampi");
    expect(placeName({ county: "Kodagu", state: "Karnataka" })).toBe("Kodagu");
    expect(placeName({ country: "India" })).toBeNull();
    expect(placeName(undefined)).toBeNull();
  });

  it("only shows places that have a name", () => {
    expect(isNamedPlace("Hampi")).toBe(true);
    expect(isNamedPlace(UNNAMED_AREA)).toBe(false);
    expect(isNamedPlace(NO_LOCATION)).toBe(false);
    expect(isNamedPlace(null)).toBe(false);
  });

  it("names a rural spot by its village", async () => {
    mockServices({ village: "Hampi", state: "Karnataka" });
    ai.mockResolvedValueOnce(JSON.stringify({ recommendations: [{ title: "Sunset walk", type: "activity", description: "Go" }], alternatives: [] }));
    expect(await getReliefRecommendation(15.3, 76.5, TUESDAY)).toMatchObject({ location: "Hampi", weather: "Clear" });
  });

  it("keeps the real weather for a spot the map can't name, without borrowing an old place", async () => {
    await insertRelief({ date: "2026-09-20", location: "Pune", weather: "Rainy", temp: "24" });
    mockServices({ country: "India" });
    ai.mockResolvedValueOnce(JSON.stringify({ recommendations: [{ title: "Sunset walk", type: "activity", description: "Go" }], alternatives: [] }));
    expect(await getReliefRecommendation(15.3, 76.5, TUESDAY)).toMatchObject({ location: UNNAMED_AREA, weather: "Clear", temp: "30" });
  });

  it("never falls back to an unnamed spot as the last known place", async () => {
    await insertRelief({ date: "2026-09-20", location: "Pune", weather: "Rainy", temp: "24" });
    await insertRelief({ date: "2026-09-25", location: UNNAMED_AREA, weather: "Foggy", temp: "18" });
    // No device location this time: the last named place stands in
    expect(await getReliefRecommendation(undefined, undefined, TUESDAY)).toMatchObject({ location: "Pune", weather: "Rainy" });
  });
});
