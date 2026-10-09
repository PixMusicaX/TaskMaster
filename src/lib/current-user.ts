// Who is asking. Every server action and route handler starts here: nothing reads or writes
// planner data without a signed-in user's id.
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

// For server actions and pages: a signed-out caller is sent to the login page
export async function requireUserId(): Promise<string> {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  return userId;
}
