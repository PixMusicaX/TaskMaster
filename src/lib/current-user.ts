// Who is asking. Every server action and route handler starts here: nothing reads or writes
// planner data without a signed-in user's id.
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Sessions live in the database, so this is a query. A page that loads its data on the server
// calls a dozen actions at once; within one render they share the one lookup (outside a render,
// in a server action, `cache` simply calls through).
export const getUserId = cache(async (): Promise<string | null> => {
  const session = await auth();
  return session?.user?.id ?? null;
});

// For server actions and pages: a signed-out caller is sent to the login page
export async function requireUserId(): Promise<string> {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  return userId;
}
