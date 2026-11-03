// The player's own date on the server, from the time zone their browser left in a cookie (see
// lib/time-zone.ts). Null before the first visit has set it: pages then leave their data to the
// browser, as they always did.
import { cookies } from "next/headers";
import { TZ_COOKIE, dayIn } from "./time-zone";

export async function playerToday(): Promise<string | null> {
  const timeZone = (await cookies()).get(TZ_COOKIE)?.value;
  return timeZone ? dayIn(timeZone) : null;
}
