import { describe, it, expect, vi, beforeEach } from "vitest";

// The real helper this time (tests/setup.ts mocks it for everyone else), with Gemini faked
vi.unmock("@/lib/ai-utils");

const tried: string[] = [];
// Models the fake Google says it doesn't have
const gone = new Set<string>();

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel({ model }: { model: string }) {
      return {
        generateContent: async () => {
          tried.push(model);
          if (gone.has(model)) throw Object.assign(new Error(`[404 ] models/${model} is not found`), { status: 404 });
          return { response: { text: () => `answer from ${model}` } };
        },
      };
    }
  },
}));

vi.mock("@/lib/ai-config", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/ai-config")>()),
  getAiConfig: vi.fn(async () => ({ provider: "gemini", model: null, apiKey: "test-key" })),
}));

const { safeGenerateContent } = await import("@/lib/ai-utils");
const { forgetAiRequests } = await import("@/lib/ai-guard");
const { TEST_USER_ID } = await import("./helpers/user");

beforeEach(() => {
  tried.length = 0;
  gone.clear();
  forgetAiRequests();
});

describe("Gemini models", () => {
  it("asks a current model first, not ones Google has retired", async () => {
    expect(await safeGenerateContent("first", { userId: TEST_USER_ID })).toBe("answer from gemini-flash-latest");
    expect(tried).toEqual(["gemini-flash-latest"]);
  });

  it("moves past a model that's gone and doesn't ask it again", async () => {
    gone.add("gemini-retired");
    expect(await safeGenerateContent("second", { userId: TEST_USER_ID, model: "gemini-retired" })).toBe("answer from gemini-flash-latest");
    expect(tried).toEqual(["gemini-retired", "gemini-flash-latest"]);
    tried.length = 0;
    await safeGenerateContent("third", { userId: TEST_USER_ID, model: "gemini-retired" });
    expect(tried).toEqual(["gemini-flash-latest"]);
  });

  it("falls back to the lite model when the main one is missing", async () => {
    gone.add("gemini-flash-latest");
    expect(await safeGenerateContent("fourth", { userId: TEST_USER_ID })).toBe("answer from gemini-flash-lite-latest");
  });
});
