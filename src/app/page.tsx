import { redirect } from "next/navigation";
import Landing from "@/components/landing/landing";
import { getUserId } from "@/lib/current-user";

// The front door. Anyone can see it; a signed-in player goes straight to their home page.
export default async function LandingPage() {
  if (await getUserId()) redirect("/home");
  return <Landing />;
}
