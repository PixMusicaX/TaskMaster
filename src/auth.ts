// Google sign-in (Auth.js). Sessions live in the database, one row per device, so the account
// page can list them and sign a device out.
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { account, session, user } from "@/db/schema";

const adapter = DrizzleAdapter(db, {
  usersTable: user,
  accountsTable: account,
  sessionsTable: session,
} as never);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: {
    ...adapter,
    // Remember which browser the session belongs to, for the account page
    async createSession(data) {
      const userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
      const [created] = await db.insert(session).values({ ...data, userAgent }).returning();
      return created;
    },
  },
  session: { strategy: "database" },
  providers: [
    // Planners that existed before sign-in are matched to their owner by email on first login;
    // Google only hands over addresses it has verified (checked again below)
    Google({ allowDangerousEmailAccountLinking: true }),
  ],
  pages: { signIn: "/login", error: "/login" },
  events: {
    // Keep the name and picture in step with Google on every sign-in. An account made ahead of
    // its first login (the pre-accounts owner) starts with neither.
    async signIn({ user: signedIn, profile }) {
      if (!signedIn.id || !profile) return;
      const name = typeof profile.name === "string" ? profile.name : undefined;
      const image = typeof profile.picture === "string" ? profile.picture : undefined;
      if (!name && !image) return;
      try {
        await db.update(user).set({ name, image }).where(eq(user.id, signedIn.id));
      } catch (e) {
        console.error("Could not refresh the Google profile:", e);
      }
    },
  },
  callbacks: {
    signIn({ account, profile }) {
      return account?.provider === "google" && profile?.email_verified === true;
    },
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
