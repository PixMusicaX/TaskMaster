import { describe, it, expect } from "vitest";
import { headStart } from "@/lib/head-start";

// Like the thenable React hands a client component for a promise prop: then() returns nothing
const reactThenable = <T,>(outcome: { value?: T; error?: unknown }) => ({
  then(onFulfilled?: (v: T) => void, onRejected?: (e: unknown) => void) {
    if ("error" in outcome) onRejected?.(outcome.error);
    else onFulfilled?.(outcome.value as T);
  },
}) as unknown as PromiseLike<T>;

describe("headStart", () => {
  it("chains on React's thenable, which can't be chained itself", async () => {
    const thenable = reactThenable({ value: { todayStr: "2026-11-04" } });
    expect(Promise.prototype.catch.call(thenable, () => null)).toBeUndefined();
    await expect(headStart(thenable)).resolves.toEqual({ todayStr: "2026-11-04" });
  });

  it("turns a failed or missing head start into null", async () => {
    await expect(headStart(reactThenable({ error: new Error("down") }))).resolves.toBeNull();
    await expect(headStart(null)).resolves.toBeNull();
    await expect(headStart(Promise.resolve(null))).resolves.toBeNull();
  });
});
