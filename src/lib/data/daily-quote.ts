// The quote of the day: one for everybody, fetched once and kept (server only)
import { format } from "date-fns";
import { db } from "@/db";
import { dailyQuote } from "@/db/schema";
import { eq } from "drizzle-orm";

const QUOTE_TIMEOUT = 4000;

export async function dailyQuoteFor(clientDateStr?: string) {
  const today = clientDateStr || format(new Date(), "yyyy-MM-dd");

  try {
    const existing = await db.query.dailyQuote.findFirst({
      where: eq(dailyQuote.date, today)
    });

    if (existing) {
      return existing.quote;
    }

    // The saved row above is the day's cache, so this always asks for today's. Everything else on
    // the home page queues behind this call, so it gives up quickly and the fallback takes over.
    const response = await fetch("https://zenquotes.io/api/today", { cache: "no-store", signal: AbortSignal.timeout(QUOTE_TIMEOUT) });
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
    // Over its rate limit it answers 200 with a notice in place of the quote, which must not be
    // saved as everyone's quote of the day
    if (/too many requests|auth key/i.test(quote) || /zenquotes/i.test(author ?? "")) {
      throw new Error("ZenQuotes rate limit reached");
    }

    const formatted = author ? `${quote} — ${author}` : quote;
    // Two players can ask for the first quote of the day at once; the first one in wins
    await db.insert(dailyQuote).values({
      date: today,
      quote: formatted
    }).onConflictDoNothing();

    return formatted;
  } catch (error) {
    console.error("Daily quote fetch error:", error);
    return "Every grand legend begins with a single modest step.";
  }
}
