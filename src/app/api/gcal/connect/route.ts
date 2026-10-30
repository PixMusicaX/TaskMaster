import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { getUserId } from "@/lib/current-user";
import { isDemoEmail } from "@/lib/demo";
import { consentUrl } from "@/lib/gcal/api";

// Starts the Google consent screen. The random state comes back to the callback, which checks it
// against this cookie so nobody else's consent can be attached to this account.
export async function GET(request: NextRequest) {
  const { origin, protocol } = request.nextUrl;
  const userId = await getUserId();
  if (!userId) return NextResponse.redirect(new URL("/login", origin));

  const [me] = await db.select({ email: user.email }).from(user).where(eq(user.id, userId)).limit(1);
  if (!process.env.AUTH_GOOGLE_ID || isDemoEmail(me?.email)) {
    return NextResponse.redirect(new URL("/account?gcal=unavailable", origin));
  }

  const state = randomBytes(24).toString("base64url");
  const response = NextResponse.redirect(consentUrl({
    redirectUri: `${origin}/api/gcal/callback`,
    state,
    loginHint: me?.email,
  }));
  response.cookies.set("gcal_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: protocol === "https:",
    path: "/api/gcal",
    maxAge: 600,
  });
  return response;
}
