"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { gcalConnection, gcalOutbox } from "@/db/schema";
import { decryptSecret } from "@/lib/ai-config";
import { requireUserId } from "@/lib/current-user";
import { revokeToken } from "@/lib/gcal/api";
import { connectionFor, syncUser } from "@/lib/gcal/sync";

// What the account card and the calendar show. Tokens stay on the server.
export async function getGoogleCalendarStatus() {
  const connection = await connectionFor(await requireUserId());
  return {
    available: !!process.env.AUTH_GOOGLE_ID,
    connected: !!connection,
    syncFrom: connection?.syncFrom ?? null,
    lastSyncedAt: connection?.lastSyncedAt ?? null,
    error: connection?.lastError ?? null,
  };
}

export async function syncGoogleCalendar(manual = false) {
  const result = await syncUser(await requireUserId(), { manual });
  if (result.changed > 0) {
    revalidatePath("/calendar");
    revalidatePath("/home");
  }
  return result;
}

// Imported events stay in the planner, and still earn nothing, so disconnecting never moves XP.
// Their Google ids stay too, so connecting again matches them up rather than doubling them.
export async function disconnectGoogleCalendar() {
  const userId = await requireUserId();
  const connection = await connectionFor(userId);
  if (!connection) return;
  const token = decryptSecret(connection.refreshToken);
  if (token) await revokeToken(token);
  await db.delete(gcalOutbox).where(eq(gcalOutbox.userId, userId));
  await db.delete(gcalConnection).where(eq(gcalConnection.userId, userId));
}
