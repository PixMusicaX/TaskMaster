"use server";

import { requireUserId } from "@/lib/current-user";
import { dailyQuoteFor } from "@/lib/data/daily-quote";

// Shared by every player, but still only for signed-in ones
export async function getDailyQuote(clientDateStr?: string) {
  await requireUserId();
  return dailyQuoteFor(clientDateStr);
}
