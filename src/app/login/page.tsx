import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { signIn } from "@/auth";
import { getUserId } from "@/lib/current-user";

async function signInWithGoogle() {
  "use server";
  await signIn("google", { redirectTo: "/home" });
}

// Google's "G", inline so the page needs no extra asset
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getUserId()) redirect("/home");
  const { error } = await searchParams;

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-3">
          <p className="text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray">Welcome back</p>
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-tm-purple-dark dark:text-tm-yellow uppercase">TaskMaster</h1>
          <p className="text-sm font-medium text-tm-blue-gray">Sign in with your Google account to open your planner. A new account starts with a fresh one.</p>
        </div>

        <form action={signInWithGoogle}>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-white text-neutral-800 border border-tm-blue-gray/20 font-semibold shadow-sm transition-transform hover:scale-[1.02] active:scale-95"
          >
            <GoogleMark />
            Continue with Google
          </button>
        </form>

        {error && (
          <p role="alert" className="text-sm font-medium text-tm-orange-dark">
            Sign-in didn&apos;t go through. Please try again.
          </p>
        )}

        <Link href="/" className="inline-flex items-center gap-2 text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray hover:text-foreground transition-colors">
          <ArrowLeft size={14} />
          Back
        </Link>
      </div>
    </main>
  );
}
