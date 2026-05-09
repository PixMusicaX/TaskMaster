import { db } from "@/db";
import { preparationTip } from "@/db/schema";

async function check() {
  const tips = await db.select().from(preparationTip);
  console.log("Prep Tips:", tips.map(t => ({ title: t.title, stat: t.stat, xp: t.xpReward })));
}

check().catch(console.error).finally(() => process.exit());
