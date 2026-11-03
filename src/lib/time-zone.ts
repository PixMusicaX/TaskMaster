// The player's own day, for code that runs on the server. Dates in the app are the player's local
// "YYYY-MM-DD"; the browser knows its time zone and the server doesn't, so the head script
// (lib/theme-init.ts) leaves it in a cookie, and pages that load data on the server read it back
// (lib/current-day.ts). Safe to import from the client.

export const TZ_COOKIE = "tm_tz";

// `now` as "YYYY-MM-DD" in `timeZone`, or null for a zone this runtime doesn't know
export function dayIn(timeZone: string, now: Date = new Date()): string | null {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return null;
  }
}

// A "YYYY-MM-DD" date moved by whole days (calendar days: no time zone can shift it)
export function shiftDay(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
