// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import GoogleSync from "@/components/google-sync";
import { getGoogleCalendarStatus, syncGoogleCalendar } from "@/app/actions/google-calendar";
import { GCAL_SYNCED_EVENT } from "@/lib/gcal/events";

vi.mock("@/app/actions/google-calendar", () => ({
  getGoogleCalendarStatus: vi.fn(),
  syncGoogleCalendar: vi.fn(),
}));

const MINUTE = 60_000;
let visibility = "visible";

function setStatus(status: { connected: boolean; error?: string | null }) {
  vi.mocked(getGoogleCalendarStatus).mockResolvedValue({ available: true, syncFrom: null, lastSyncedAt: null, error: null, ...status });
}

// Lets the status check and first sync finish under fake timers
async function start() {
  await act(async () => {
    render(<GoogleSync />);
    await vi.advanceTimersByTimeAsync(0);
  });
}

const pass = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

beforeEach(() => {
  vi.useFakeTimers();
  visibility = "visible";
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
  vi.mocked(syncGoogleCalendar).mockResolvedValue({ ran: true, changed: 0 });
  return cleanup;
});

describe("GoogleSync", () => {
  it("syncs on opening and every minute after that", async () => {
    setStatus({ connected: true });
    await start();
    expect(syncGoogleCalendar).toHaveBeenCalledTimes(1);
    await pass(3 * MINUTE);
    expect(syncGoogleCalendar).toHaveBeenCalledTimes(4);
  });

  it("tells the pages each time a sync ran", async () => {
    setStatus({ connected: true });
    const onSynced = vi.fn();
    window.addEventListener(GCAL_SYNCED_EVENT, onSynced);
    await start();
    window.removeEventListener(GCAL_SYNCED_EVENT, onSynced);
    expect(onSynced).toHaveBeenCalledTimes(1);
  });

  it("rests while the tab is hidden and catches up on return", async () => {
    setStatus({ connected: true });
    await start();
    visibility = "hidden";
    await pass(5 * MINUTE);
    expect(syncGoogleCalendar).toHaveBeenCalledTimes(1);

    visibility = "visible";
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(syncGoogleCalendar).toHaveBeenCalledTimes(2);
  });

  it("never polls without a working connection", async () => {
    setStatus({ connected: false });
    await start();
    await pass(5 * MINUTE);
    cleanup();

    setStatus({ connected: true, error: "reconnect" });
    await start();
    await pass(5 * MINUTE);
    expect(syncGoogleCalendar).not.toHaveBeenCalled();
  });

  it("stops when it's taken off the page", async () => {
    setStatus({ connected: true });
    await start();
    cleanup();
    await pass(5 * MINUTE);
    expect(syncGoogleCalendar).toHaveBeenCalledTimes(1);
  });
});
