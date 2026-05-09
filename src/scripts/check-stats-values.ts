import { db } from "@/db";
import { smartMission, reliefRecommendation, preparationTip } from "@/db/schema";

async function checkStats() {
  const missions = await db.select().from(smartMission);
  console.log("Missions stats:", missions.map(m => ({ title: m.title, stat: m.stat, completed: m.completed, xp: m.xpReward })));

  const relief = await db.select().from(reliefRecommendation);
  console.log("Relief stats:", relief.map(r => ({ title: r.title, stat: r.stat, completed: r.completed, xp: r.xpReward })));
}

checkStats().catch(console.error).finally(() => process.exit());
