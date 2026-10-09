import { redirect } from "next/navigation";

// The About page became the Account page; old links and bookmarks still land in the right place
export default function AboutRedirect() {
  redirect("/account");
}
