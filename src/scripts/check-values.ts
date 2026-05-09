import { db } from "@/db";
import { smartMission, reliefRecommendation, preparationTip } from "@/db/schema";

async function checkValues() {
  const missions = await db.select().from(smartMission).limit(5);
  console.log("Missions:", missions.map(m => m.xpReward));

  const relief = await db.select().from(reliefRecommendation).limit(5);
  console.log("Relief:", relief.map(r => r.xpReward));

  const prep = await db.select().from(preparationTip).limit(5);
  console.log("Prep Tips:", prep.map(p => p.xpReward));
}

checkValues().catch(console.error).finally(() => process.exit());
