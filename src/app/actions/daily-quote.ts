"use server";

import { format } from "date-fns";
import { db } from "@/db";
import { dailyQuote } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getDailyQuote(clientDateStr?: string) {
  const today = clientDateStr || format(new Date(), "yyyy-MM-dd");

  try {
    const existing = await db.query.dailyQuote.findFirst({
      where: eq(dailyQuote.date, today)
    });

    if (existing) {
      return existing.quote;
    }

    const response = await fetch("https://zenquotes.io/api/today", { next: { revalidate: 86400 } });
    if (!response.ok) {
      throw new Error(`ZenQuotes API status ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Unexpected ZenQuotes response");
    }

    const quote = data[0]?.q?.trim();
    const author = data[0]?.a?.trim();
    if (!quote) {
      throw new Error("ZenQuotes returned empty quote");
    }

    const formatted = author ? `${quote} — ${author}` : quote;
    await db.insert(dailyQuote).values({
      date: today,
      quote: formatted
    });

    return formatted;
  } catch (error) {
    console.error("Daily quote fetch error:", error);
    return "Every grand legend begins with a single modest step.";
  }
}
