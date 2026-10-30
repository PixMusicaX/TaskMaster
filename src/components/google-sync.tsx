"use client";

import { useEffect } from "react";
import { getGoogleCalendarStatus, syncGoogleCalendar } from "@/app/actions/google-calendar";
import { GCAL_SYNCED_EVENT } from "@/lib/gcal/events";

const POLL_MS = 60_000;
// Coming back to the tab just before a poll shouldn't cost a second request
const MIN_GAP_MS = 55_000;

// Keeps a connected calendar up to date: syncs when the app opens, every minute while it's on
// screen, and when the player comes back to it. Pages that show events listen for
// GCAL_SYNCED_EVENT. Connecting reloads the page, so a player with no connection never polls.
export default function GoogleSync() {
  useEffect(() => {
    let last = 0;
    let stopped = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function sync() {
      if (document.visibilityState !== "visible" || Date.now() - last < MIN_GAP_MS) return;
      last = Date.now();
      try {
        const { ran, changed } = await syncGoogleCalendar();
        if (ran) window.dispatchEvent(new CustomEvent(GCAL_SYNCED_EVENT));
        if (changed > 0) window.dispatchEvent(new CustomEvent("profile-updated"));
      } catch (e) {
        console.error("Google Calendar sync failed:", e);
      }
    }

    getGoogleCalendarStatus().then(status => {
      if (stopped || !status.connected || status.error === "reconnect") return;
      sync();
      timer = setInterval(sync, POLL_MS);
      document.addEventListener("visibilitychange", sync);
    }).catch(e => console.error("Google Calendar status failed to load:", e));

    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return null;
}
