"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/current-user";
import { createDemoSession, deleteDemoUser, isDemoUser, seedDemoPlanner } from "@/lib/data/demo";

// Auth.js looks for its session under one of these names, depending on whether the site is on HTTPS
const SECURE_COOKIE = "__Secure-authjs.session-token";
const PLAIN_COOKIE = "authjs.session-token";

// The landing page's Demo button: a temporary account with a made-up planner, signed in on the
// spot. `today` and `tzOffsetMinutes` are the visitor's date and clock offset, so the planner is
// laid out around their day. Nothing made here is kept: see endDemo and purgeExpiredDemos.
export async function startDemo(today: string, tzOffsetMinutes: number = 0) {
  // Someone already signed in (for real or in a demo) just goes to their planner
  if (await getUserId()) redirect("/home");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) return { success: false as const, message: "Could not start the demo." };
  const offset = Number.isFinite(tzOffsetMinutes) ? Math.max(-840, Math.min(840, Math.round(tzOffsetMinutes))) : 0;

  let demo: Awaited<ReturnType<typeof createDemoSession>> = null;
  try {
    const requestHeaders = await headers();
    demo = await createDemoSession(requestHeaders.get("user-agent"));
    if (!demo) return { success: false as const, message: "The demo is busy right now. Please try again in a little while." };
    await seedDemoPlanner(demo.userId, today, offset);

    const secure = requestHeaders.get("x-forwarded-proto") === "https";
    (await cookies()).set(secure ? SECURE_COOKIE : PLAIN_COOKIE, demo.sessionToken, {
      httpOnly: true, sameSite: "lax", path: "/", secure, expires: demo.expires,
    });
  } catch (e) {
    console.error("Could not start a demo:", e);
    // Don't leave a half-made account behind
    if (demo) await deleteDemoUser(demo.userId).catch(() => {});
    return { success: false as const, message: "Could not start the demo." };
  }
  redirect("/home");
}

// Leaving the demo deletes its account and everything made in it. `toLogin` sends the visitor
// on to sign in for real instead of back to the landing page.
export async function endDemo(toLogin: boolean = false) {
  const userId = await getUserId();
  if (userId && await isDemoUser(userId)) {
    await deleteDemoUser(userId);
    const jar = await cookies();
    jar.delete(SECURE_COOKIE);
    jar.delete(PLAIN_COOKIE);
  }
  redirect(toLogin ? "/login" : "/");
}
