"use server";

export async function getDailyQuote(_clientDateStr?: string) {
  try {
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

    return author ? `${quote} — ${author}` : quote;
  } catch (error) {
    console.error("Daily quote fetch error:", error);
    return "Every grand legend begins with a single modest step.";
  }
}
