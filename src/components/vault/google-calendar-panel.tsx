"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarSync } from "lucide-react";
import { cn } from "@/lib/utils";
import GlassCard from "@/components/glass-card";
import SyncLogic from "@/components/sync-logic";
import VaultSection from "./vault-section";
import { BUTTON_PRIMARY, BUTTON_QUIET, LABEL } from "./account-panel";
import { disconnectGoogleCalendar, getGoogleCalendarStatus, syncGoogleCalendar } from "@/app/actions/google-calendar";
import { GCAL_SYNCED_EVENT } from "@/lib/gcal/events";

type Status = Awaited<ReturnType<typeof getGoogleCalendarStatus>>;

// What the Google round trip came back with (the callback's ?gcal= value)
const RESULT_MESSAGES: Record<string, { text: string; ok: boolean }> = {
  connected: { ok: true, text: "Connected. Your Google events are on their way to the calendar." },
  declined: { ok: false, text: "Google Calendar wasn't connected." },
  failed: { ok: false, text: "Could not connect. Try again, and leave the calendar permission ticked." },
  unavailable: { ok: false, text: "Google Calendar isn't available on this account." },
};

export default function GoogleCalendarPanel({ demo }: { demo: boolean }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState<"sync" | "disconnect" | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const reload = useCallback(async () => {
    try {
      setStatus(await getGoogleCalendarStatus());
    } catch (err) {
      console.error("Google Calendar status failed to load:", err);
    }
  }, []);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("gcal");
    getGoogleCalendarStatus().then(next => {
      setStatus(next);
      if (result) setMessage(RESULT_MESSAGES[result] ?? null);
    }).catch(err => console.error("Google Calendar status failed to load:", err));
    window.addEventListener(GCAL_SYNCED_EVENT, reload);
    return () => window.removeEventListener(GCAL_SYNCED_EVENT, reload);
  }, [reload]);

  async function handleSync() {
    setBusy("sync");
    setMessage(null);
    const { changed } = await syncGoogleCalendar(true);
    await reload();
    window.dispatchEvent(new CustomEvent(GCAL_SYNCED_EVENT));
    if (changed > 0) window.dispatchEvent(new CustomEvent("profile-updated"));
    setBusy(null);
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect Google Calendar? Events already imported stay in your planner, but nothing syncs any more.")) return;
    setBusy("disconnect");
    setMessage(null);
    await disconnectGoogleCalendar();
    await reload();
    setBusy(null);
  }

  const lastSynced = status?.lastSyncedAt
    ? `Last synced ${format(new Date(status.lastSyncedAt), "MMM d, HH:mm")}`
    : "Waiting for the first sync";

  return (
    <div id="google-calendar" className="scroll-mt-24">
      <VaultSection icon={CalendarSync} iconClassName="text-tm-orange-light" title="Google Calendar">
        <GlassCard className="p-5 md:p-8 space-y-5">
          {demo ? (
            <p className="text-sm text-tm-blue-gray font-medium">Google Calendar is switched off in the demo.</p>
          ) : status && !status.available ? (
            <p className="text-sm text-tm-blue-gray font-medium">Google Calendar isn&apos;t set up on this server.</p>
          ) : status?.connected ? (
            <>
              <div className="space-y-1">
                <h3 className="font-black text-foreground leading-tight">Connected</h3>
                <p className={cn(LABEL, "text-tm-blue-gray/70")}>
                  {lastSynced}{status.syncFrom ? ` · Importing from ${format(new Date(`${status.syncFrom}T00:00:00`), "MMM d, yyyy")}` : ""}
                </p>
              </div>
              {status.error === "reconnect" && (
                <p role="alert" className="text-sm font-medium text-tm-orange-dark">Google ended this connection, so nothing is syncing. Reconnect to pick up where it left off.</p>
              )}
              {status.error === "failed" && (
                <p role="alert" className="text-sm font-medium text-tm-orange-dark">The last sync didn&apos;t finish. It will try again on its own.</p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                {status.error === "reconnect"
                  ? <a href="/api/gcal/connect" className={BUTTON_PRIMARY}>Reconnect</a>
                  : <button onClick={handleSync} disabled={busy !== null} className={BUTTON_PRIMARY}>{busy === "sync" ? "Syncing…" : "Sync"}</button>}
                <button onClick={handleDisconnect} disabled={busy !== null} className={BUTTON_QUIET}>
                  {busy === "disconnect" ? "Disconnecting…" : "Disconnect"}
                </button>
                <SyncLogic />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-tm-blue-gray font-medium max-w-2xl">
                Bring your Google events into the calendar and send your TaskMaster tasks and events the other way.
                Imported events start from the day you connect, earn no XP and stay hidden from the AI until you add them to TaskMaster.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <a href="/api/gcal/connect" className={BUTTON_PRIMARY}>Connect Google Calendar</a>
                <SyncLogic />
              </div>
            </>
          )}
          {message && (
            <p role="status" className={cn("text-sm font-medium", message.ok ? "text-tm-blue-gray" : "text-tm-orange-dark")}>{message.text}</p>
          )}
        </GlassCard>
      </VaultSection>
    </div>
  );
}
