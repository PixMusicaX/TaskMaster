// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";

// Each test imports the module afresh, since it reads NODE_ENV as it loads. The first import is
// the slow one (it has to be transformed), and on a busy full run it outlasted the first test's
// time limit; done here, under the longer hook limit, the tests' own imports are quick.
beforeAll(async () => {
  await import("@/lib/dev-map");
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  localStorage.clear();
});

describe("dev map overrides", () => {
  it("does nothing outside development", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const m = await import("@/lib/dev-map");
    m.setDevMapStatus("peak");
    m.rerollDevMap();
    expect(m.getDevMapStatus()).toBeNull();
    expect(m.getDevMapReroll()).toBe(0);
  });

  it("forces a status, rerolls, and notifies listeners in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const m = await import("@/lib/dev-map");
    const onChange = vi.fn();
    const unsubscribe = m.subscribeDevMap(onChange);

    m.setDevMapStatus("low");
    expect(m.getDevMapStatus()).toBe("low");
    m.rerollDevMap();
    m.rerollDevMap();
    expect(m.getDevMapReroll()).toBe(2);
    m.setDevMapStatus(null);
    expect(m.getDevMapStatus()).toBeNull();

    expect(onChange).toHaveBeenCalledTimes(4);
    unsubscribe();
  });

  it("ignores unknown stored values", async () => {
    vi.stubEnv("NODE_ENV", "development");
    localStorage.setItem("tm_dev_map_status", "bogus");
    const m = await import("@/lib/dev-map");
    expect(m.getDevMapStatus()).toBeNull();
  });
});
