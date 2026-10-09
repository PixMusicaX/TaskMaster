import { vi, beforeAll, beforeEach, afterEach } from "vitest";

// Modules read these at import time, so set them before anything imports the app
process.env.calendarific_key = "test-key";

// No Google sign-in in tests: the actions answer for whichever test user is current
vi.mock("@/lib/current-user", async () => {
  const { currentUserId } = await import("./helpers/user");
  return {
    getUserId: vi.fn(async () => currentUserId()),
    requireUserId: vi.fn(async () => currentUserId()),
  };
});

// Swap the real Neon connection for an in-memory Postgres
vi.mock("@/db", () => import("./helpers/test-db"));

// Next's cache APIs only work inside a request; they're irrelevant to these tests
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Never call an AI provider from tests. By default it fails like the real helper does when every
// model is down (it throws); individual tests program the responses they need.
vi.mock("@/lib/ai-utils", () => ({
  safeGenerateContent: vi.fn(async (): Promise<string> => {
    throw new Error("AI unavailable in tests");
  }),
}));

// jsdom has no IntersectionObserver; framer-motion's whileInView needs one
if (typeof window !== "undefined" && !("IntersectionObserver" in window)) {
  class NoopIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  Object.assign(globalThis, { IntersectionObserver: NoopIntersectionObserver });
}

beforeAll(async () => {
  // Server-action tests need the schema; component tests (jsdom) never touch the DB
  if (typeof window === "undefined") {
    const { createSchema } = await import("./helpers/schema");
    await createSchema();
  }
});

beforeEach(async () => {
  if (typeof window === "undefined") {
    const { resetDatabase } = await import("./helpers/schema");
    await resetDatabase();
  }
  const { actAs, TEST_USER_ID } = await import("./helpers/user");
  actAs(TEST_USER_ID);
  // Any network call a test didn't explicitly mock should fail loudly
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    throw new Error(`Unexpected fetch in test: ${url}`);
  }));
});

afterEach(async () => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  // Also drops unused one-off responses (mockResolvedValueOnce) so they can't leak into the next test
  vi.resetAllMocks();
  // resetAllMocks wipes the signed-in user mock's behaviour too; put it back
  const { getUserId, requireUserId } = await import("@/lib/current-user");
  const { currentUserId } = await import("./helpers/user");
  vi.mocked(getUserId).mockImplementation(async () => currentUserId());
  vi.mocked(requireUserId).mockImplementation(async () => currentUserId());
});
