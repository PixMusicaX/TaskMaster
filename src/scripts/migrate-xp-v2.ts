import { db } from "@/db";
import { smartMission, reliefRecommendation, preparationTip } from "@/db/schema";
import { eq, or } from "drizzle-orm";

async function migrate() {
  console.log("Starting DB Sync (Phase 2 + Stat Change)...");

  // Update Smart Missions: 25 -> 50
  const mResult = await db.update(smartMission)
    .set({ xpReward: 50 })
    .where(eq(smartMission.xpReward, 25));
  console.log(`Updated Smart Missions rewards. Status:`, mResult);

  // Update Relief Recommendations: 5 -> 10
  const rResult = await db.update(reliefRecommendation)
    .set({ xpReward: 10 })
    .where(eq(reliefRecommendation.xpReward, 5));
  console.log(`Updated Relief Recommendations rewards. Status:`, rResult);

  // Update Preparation Tips: 15 -> 25 AND stat: intelligence -> charisma
  const pResult = await db.update(preparationTip)
    .set({ xpReward: 25, stat: "charisma" })
    .where(or(eq(preparationTip.xpReward, 15), eq(preparationTip.stat, "intelligence")));
  console.log(`Updated Preparation Tips (rewards & stats). Status:`, pResult);

  console.log("Migration complete.");
}

migrate().catch(console.error).finally(() => process.exit());
