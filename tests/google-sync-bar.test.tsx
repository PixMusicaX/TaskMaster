// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import GoogleSyncBar from "@/components/google-sync-bar";

afterEach(cleanup);

describe("GoogleSyncBar", () => {
  it("shows just the Sync button when all is well", () => {
    const onSync = vi.fn();
    render(<GoogleSyncBar error={null} syncing={false} onSync={onSync} />);
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByText("Sync"));
    expect(onSync).toHaveBeenCalled();
  });

  it("swaps Sync for Reconnect when Google ended the connection", () => {
    render(<GoogleSyncBar error="reconnect" syncing={false} onSync={vi.fn()} />);
    expect(screen.getByRole("alert").textContent).toContain("stopped syncing");
    expect(screen.getByText("Reconnect").getAttribute("href")).toBe("/api/gcal/connect");
    expect(screen.queryByText("Sync")).toBeNull();
  });

  it("warns about a failed sync and leaves Sync there to try again", () => {
    render(<GoogleSyncBar error="failed" syncing={false} onSync={vi.fn()} />);
    expect(screen.getByRole("alert").textContent).toContain("didn't finish");
    expect(screen.getByText("Sync")).toBeTruthy();
  });
});
