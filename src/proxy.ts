import { NextResponse, type NextRequest } from "next/server";

// Open to everyone: the landing page and the login page
const PUBLIC_PATHS = ["/", "/login"];

// A quick first gate: a visitor with no session cookie never reaches a planner page. This only
// looks at whether the cookie is there. The real check (is the session valid, and whose is it)
// happens in the signed-in layout and in every server action and route handler.
export function proxy(request: NextRequest) {
  if (PUBLIC_PATHS.includes(request.nextUrl.pathname)) return NextResponse.next();
  const signedIn = request.cookies.has("authjs.session-token") || request.cookies.has("__Secure-authjs.session-token");
  if (!signedIn) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = {
  // Everything except the API (it answers for itself), Next's own files and static assets
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:ico|png|svg|webp|json|txt|mp3|wav|mp4|webm|ttf|otf)$).*)"],
};
