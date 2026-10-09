// Relief queries shared between actions, for one user (server only)
import { db } from "@/db";
import { reliefRecommendation } from "@/db/schema";
import { eq, desc, gte, lte, lt, ne, asc, and, isNotNull } from "drizzle-orm";

// Relief rows in [fromDate, toDate] (ascending), with missing locations/weather carried
// forward from the most recent earlier row that had a real location.
export async function reliefsWithCarriedLocation(userId: string, fromDate: string, toDate?: string) {
  const [rows, [seed]] = await Promise.all([
    db.select().from(reliefRecommendation)
      .where(toDate
        ? and(eq(reliefRecommendation.userId, userId), gte(reliefRecommendation.date, fromDate), lte(reliefRecommendation.date, toDate))
        : and(eq(reliefRecommendation.userId, userId), gte(reliefRecommendation.date, fromDate)))
      .orderBy(asc(reliefRecommendation.date)),
    db.select().from(reliefRecommendation)
      .where(and(
        eq(reliefRecommendation.userId, userId),
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
