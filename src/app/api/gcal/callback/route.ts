import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { gcalConnection } from "@/db/schema";
import { encryptSecret } from "@/lib/ai-config";
import { getUserId } from "@/lib/current-user";
import { exchangeCode } from "@/lib/gcal/api";

// Google sends the player back here from the consent screen. The first sync runs from the
// signed-in layout as soon as they land on the account page.
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const finish = (result: string) => {
    const response = NextResponse.redirect(new URL(`/account?gcal=${result}#google-calendar`, origin));
    response.cookies.set("gcal_state", "", { path: "/api/gcal", maxAge: 0 });
    return response;
  };

  const userId = await getUserId();
  if (!userId) return NextResponse.redirect(new URL("/login", origin));

  const state = searchParams.get("state");
  const code = searchParams.get("code");
  if (!state || state !== request.cookies.get("gcal_state")?.value) return finish("failed");
  if (!code) return finish("declined");

  try {
    const refreshToken = await exchangeCode(code, `${origin}/api/gcal/callback`);
    if (!refreshToken) return finish("failed");
    const stored = encryptSecret(refreshToken);
    // Connecting again keeps syncFrom but starts a new full sync, as this may be another account
    await db.insert(gcalConnection).values({ userId, refreshToken: stored })
      .onConflictDoUpdate({
        target: [gcalConnection.userId],
        set: { refreshToken: stored, syncToken: null, syncStartedAt: null, fullSyncedAt: null, lastError: null },
      });
    return finish("connected");
  } catch (e) {
    console.error("Could not connect Google Calendar:", e);
    return finish("failed");
  }
}
