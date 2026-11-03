// What every AI request goes through on its way to a provider (server only; see lib/ai-utils.ts):
// identical requests in flight at once share one answer, an answer may be kept for a while, each
// player has a daily budget of requests, and no request may run past its deadline.
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { aiUsage } from "@/db/schema";
import { AiBudgetError, AiTimeoutError } from "./ai-errors";

// Requests per player per (UTC) day. The daily generators make a handful; the rest is headroom for
// regenerating and the Taskmaster, so this only bites a runaway loop or a script.
export const AI_DAILY_BUDGET = 60;
// How long a request may take, retries and model fallbacks included, unless the caller says otherwise
export const AI_DEFAULT_DEADLINE_MS = 25_000;
const CACHE_LIMIT = 200;

const inFlight = new Map<string, Promise<string>>();
const kept = new Map<string, { text: string; until: number }>();

export function aiRequestKey(...parts: unknown[]) {
  return createHash("sha256").update(JSON.stringify(parts)).digest("base64url");
}

// Counts one request against today's budget, and throws once it is spent. If the count can't be
// kept (the AiUsage table not pushed yet, say), the request goes ahead: the budget is a guard rail,
// not a reason for the AI to stop working.
export async function spendAiRequest(userId: string, now = new Date()) {
  const date = now.toISOString().slice(0, 10);
  let calls: number;
  try {
    const [row] = await db.insert(aiUsage).values({ userId, date, calls: 1 })
      .onConflictDoUpdate({ target: [aiUsage.userId, aiUsage.date], set: { calls: sql`${aiUsage.calls} + 1` } })
      .returning({ calls: aiUsage.calls });
    calls = row.calls;
  } catch (e) {
    console.error("AI budget could not be counted (has `drizzle-kit push` run?):", e);
    return;
  }
  if (calls > AI_DAILY_BUDGET) throw new AiBudgetError();
}

// Runs `work` with a signal that aborts after `ms`, and gives up then even if `work` doesn't listen
export async function withDeadline<T>(ms: number, work: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new AiTimeoutError();
      controller.abort(error);
      reject(error);
    }, ms);
  });
  try {
    return await Promise.race([work(controller.signal), expired]);
  } finally {
    clearTimeout(timer);
  }
}

type GuardOptions = {
  userId: string;
  // Identifies the request: the same key means the same question to the same model
  key: string;
  deadlineMs?: number;
  // Keep the answer this long and hand it to the same request again. Leave out for anything that
  // must be fresh each time (the daily generators' regenerate buttons ask the same thing twice).
  cacheMs?: number;
};

export async function guardAiRequest({ userId, key, deadlineMs = AI_DEFAULT_DEADLINE_MS, cacheMs }: GuardOptions, request: (signal: AbortSignal) => Promise<string>) {
  const hit = kept.get(key);
  if (hit && hit.until > Date.now()) return hit.text;
  if (hit) kept.delete(key);

  const pending = inFlight.get(key);
  if (pending) return pending;

  const run = (async () => {
    await spendAiRequest(userId);
    const text = await withDeadline(deadlineMs, request);
    if (cacheMs) {
      kept.set(key, { text, until: Date.now() + cacheMs });
      // Oldest first: Maps iterate in insertion order
      if (kept.size > CACHE_LIMIT) kept.delete(kept.keys().next().value!);
    }
    return text;
  })();
  inFlight.set(key, run);
  try {
    return await run;
  } finally {
    inFlight.delete(key);
  }
}

// For tests
export function forgetAiRequests() {
  inFlight.clear();
  kept.clear();
}
