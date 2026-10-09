"use server";

import { cookies } from "next/headers";
import { and, desc, eq, gt, ne } from "drizzle-orm";
import { db } from "@/db";
import { session, user } from "@/db/schema";
import { signOut } from "@/auth";
import { requireUserId } from "@/lib/current-user";
import { getAiSettingsView, hasAiKey, saveAiSettings } from "@/lib/ai-config";
import { isAiProvider, type AiProvider } from "@/lib/ai-providers";

// Auth.js names its cookie differently over HTTPS
async function currentSessionToken() {
  const jar = await cookies();
  return jar.get("__Secure-authjs.session-token")?.value ?? jar.get("authjs.session-token")?.value ?? null;
}

// Everything the account page shows: who is signed in, on which devices, and their AI setup
export async function getAccount() {
  const userId = await requireUserId();
  const [[me], sessions, ai, token] = await Promise.all([
    db.select({ name: user.name, email: user.email, image: user.image, createdAt: user.createdAt })
      .from(user).where(eq(user.id, userId)),
    db.select().from(session)
      .where(and(eq(session.userId, userId), gt(session.expires, new Date())))
      .orderBy(desc(session.createdAt)),
    getAiSettingsView(userId),
    currentSessionToken(),
  ]);

  return {
    user: me,
    // Tokens stay on the server; the page only gets each session's public id
    sessions: sessions.map(s => ({
      id: s.id,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      current: s.sessionToken === token,
    })),
    ai,
  };
}

// Whether this account has a usable key for the AI service it picked
export async function hasAiKeyConfigured() {
  return hasAiKey(await requireUserId());
}

export async function signOutEverywhereElse() {
  const userId = await requireUserId();
  const token = await currentSessionToken();
  if (!token) return;
  await db.delete(session).where(and(eq(session.userId, userId), ne(session.sessionToken, token)));
}

export async function signOutDevice(sessionId: string) {
  const userId = await requireUserId();
  await db.delete(session).where(and(eq(session.userId, userId), eq(session.id, sessionId)));
}

export async function signOutHere() {
  await signOut({ redirectTo: "/" });
}

// `apiKey`: a new key for `provider`, "" to remove the saved one, undefined to keep it
export async function updateAiSettings(input: { provider: AiProvider; model?: string | null; apiKey?: string }) {
  const userId = await requireUserId();
  if (!isAiProvider(input.provider)) return { success: false as const, message: "Unknown AI provider." };
  if (input.apiKey !== undefined && input.apiKey.length > 400) return { success: false as const, message: "That key is too long." };
  try {
    await saveAiSettings(userId, { provider: input.provider, model: input.model, apiKey: input.apiKey });
    return { success: true as const, ai: await getAiSettingsView(userId) };
  } catch (e) {
    console.error("Error saving AI settings:", e);
    return { success: false as const, message: "Could not save your AI settings." };
  }
}
