import { db } from "@/db";
import { smartMission, reliefRecommendation, preparationTip } from "@/db/schema";
import { eq } from "drizzle-orm";

async function migrate() {
  console.log("Starting XP reward migration...");

  // Update Smart Missions: 25 -> 50
  const mResult = await db.update(smartMission)
    .set({ xpReward: 50 })
    .where(eq(smartMission.xpReward, 25));
  console.log(`Updated Smart Missions. Status:`, mResult);

  // Update Relief Recommendations: 5 -> 10
  const rResult = await db.update(reliefRecommendation)
    .set({ xpReward: 10 })
    .where(eq(reliefRecommendation.xpReward, 5));
  console.log(`Updated Relief Recommendations. Status:`, rResult);

  // Update Preparation Tips: 15 -> 25
  const pResult = await db.update(preparationTip)
    .set({ xpReward: 25 })
    .where(eq(preparationTip.xpReward, 15));
  console.log(`Updated Preparation Tips. Status:`, pResult);

  console.log("Migration complete.");
}

migrate().catch(console.error).finally(() => process.exit());
