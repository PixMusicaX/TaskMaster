import { describe, it, expect, beforeEach, vi } from "vitest";
import { AI_DAILY_BUDGET, aiRequestKey, forgetAiRequests, guardAiRequest, spendAiRequest, withDeadline } from "@/lib/ai-guard";
import { AiBudgetError, AiNotConfiguredError, AiTimeoutError, AiUnavailableError } from "@/lib/ai-errors";
import { aiUsage } from "@/db/schema";
import { db } from "./helpers/test-db";
import { TEST_USER_ID, OTHER_USER_ID } from "./helpers/user";

beforeEach(() => forgetAiRequests());

const guard = (key: string, request: () => Promise<string>, extra: { cacheMs?: number; deadlineMs?: number } = {}) =>
  guardAiRequest({ userId: TEST_USER_ID, key, ...extra }, request);

describe("AI errors", () => {
  it("are all 'carry on without the AI'", () => {
    for (const error of [new AiNotConfiguredError(), new AiBudgetError(), new AiTimeoutError()]) {
      expect(error).toBeInstanceOf(AiUnavailableError);
    }
  });
});

describe("the daily AI budget", () => {
  it("counts each player's requests per day and stops at the budget", async () => {
    const day = new Date("2026-09-28T10:00:00Z");
    for (let i = 0; i < AI_DAILY_BUDGET; i++) await spendAiRequest(TEST_USER_ID, day);
    await expect(spendAiRequest(TEST_USER_ID, day)).rejects.toBeInstanceOf(AiBudgetError);
    // Another player, and the next day, start afresh
    await expect(spendAiRequest(OTHER_USER_ID, day)).resolves.toBeUndefined();
    await expect(spendAiRequest(TEST_USER_ID, new Date("2026-09-29T10:00:00Z"))).resolves.toBeUndefined();
    const rows = await db.select().from(aiUsage);
    expect(rows.find(r => r.userId === TEST_USER_ID && r.date === "2026-09-28")?.calls).toBe(AI_DAILY_BUDGET + 1);
  });

  it("never reaches the provider once spent", async () => {
    await db.insert(aiUsage).values({ userId: TEST_USER_ID, date: new Date().toISOString().slice(0, 10), calls: AI_DAILY_BUDGET });
    const request = vi.fn(async () => "answer");
    await expect(guard("k", request)).rejects.toBeInstanceOf(AiBudgetError);
    expect(request).not.toHaveBeenCalled();
  });
});

describe("guardAiRequest", () => {
  it("shares one answer between identical requests in flight", async () => {
    let finish!: (text: string) => void;
    const request = vi.fn(() => new Promise<string>(resolve => { finish = resolve; }));
    const both = Promise.all([guard("same", request), guard("same", request)]);
    // Let the first one get past the budget and start
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    finish("one answer");
    expect(await both).toEqual(["one answer", "one answer"]);
    expect(request).toHaveBeenCalledTimes(1);
    // Once settled, the same request asks again
    request.mockResolvedValueOnce("fresh");
    expect(await guard("same", request)).toBe("fresh");
  });

  it("keeps an answer only when asked to", async () => {
    const request = vi.fn(async () => `answer ${request.mock.calls.length}`);
    expect(await guard("kept", request, { cacheMs: 60_000 })).toBe("answer 1");
    expect(await guard("kept", request, { cacheMs: 60_000 })).toBe("answer 1");
    expect(await guard("plain", request)).toBe("answer 2");
    expect(await guard("plain", request)).toBe("answer 3");
  });

  it("gives up at the deadline and aborts the request", async () => {
    let signal: AbortSignal | undefined;
    const request = vi.fn((s: AbortSignal) => { signal = s; return new Promise<string>(() => {}); });
    await expect(guardAiRequest({ userId: TEST_USER_ID, key: "slow", deadlineMs: 30 }, request)).rejects.toBeInstanceOf(AiTimeoutError);
    expect(signal?.aborted).toBe(true);
  });

  it("passes a fast answer through the deadline untouched", async () => {
    await expect(withDeadline(1_000, async () => "quick")).resolves.toBe("quick");
  });

  it("keys requests by everything that shapes the answer", () => {
    expect(aiRequestKey("u", "gemini", null, "prompt", { model: "a" })).toBe(aiRequestKey("u", "gemini", null, "prompt", { model: "a" }));
    expect(aiRequestKey("u", "gemini", null, "prompt", { model: "a" })).not.toBe(aiRequestKey("u", "gemini", null, "prompt", { model: "b" }));
    expect(aiRequestKey("u", "gemini", null, "prompt")).not.toBe(aiRequestKey("v", "gemini", null, "prompt"));
  });
});
