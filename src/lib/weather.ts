export function formatReliefTemp(temp?: string | null) {
  if (!temp) return "";
  return temp.split("°")[0].split(" ")[0];
}

// What a relief row's location holds when there is no place to name: no location at all, or a
// spot the map service knows but has no name for (the weather there is still real)
export const NO_LOCATION = "No location found";
export const UNNAMED_AREA = "Area detected";

// A place worth showing: one with a name
export function isNamedPlace(location: string | null | undefined): location is string {
  return !!location && location !== NO_LOCATION && location !== UNNAMED_AREA;
}

// The most local name in a reverse-geocoded address (OpenStreetMap Nominatim). Rural spots often
// have no suburb, city or town, only a village, a county or a state.
const PLACE_KEYS = ["suburb", "city_district", "city", "town", "village", "hamlet", "municipality", "county", "state_district", "state"] as const;
export function placeName(address: Partial<Record<string, unknown>> | null | undefined): string | null {
  for (const key of PLACE_KEYS) {
    const name = address?.[key];
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  return null;
}
