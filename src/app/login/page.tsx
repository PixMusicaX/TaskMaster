import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { signIn } from "@/auth";
import { getUserId } from "@/lib/current-user";
import BrowserTheme from "@/components/browser-theme";
import GoogleReveal from "@/components/landing/google-reveal";

async function signInWithGoogle() {
  "use server";
  await signIn("google", { redirectTo: "/home" });
}

// Google's blue, red, yellow and green: sign-in is with Google only, so the page wears them
const BLUE = "#4285F4";
const RED = "#EA4335";
const YELLOW = "#FBBC05";
const GREEN = "#34A853";

const POINTS = [
  { color: BLUE, title: "No password", text: "Your Google account is the key. Nothing new to remember, nothing stored here." },
  { color: RED, title: "Private to you", text: "Your habits, notes and calendar sit behind your account and nobody else's." },
  { color: YELLOW, title: "A fresh start", text: "New here? Your first sign-in opens an empty planner, ready for its first season." },
  { color: GREEN, title: "Only the basics", text: "We read your name, email and picture from Google. That's all." },
];

// Google's "G", inline so the page needs no extra asset
function GoogleMark({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path fill={BLUE} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill={GREEN} d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill={YELLOW} d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill={RED} d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getUserId()) redirect("/home");
  const { error } = await searchParams;

  return (
    <main className="relative flex-1 min-h-[100svh] overflow-hidden grid lg:grid-cols-2">
      <BrowserTheme />
      <GoogleReveal />

      {/* The four colours along the top edge, and one soft disc of each in the corners */}
      <div aria-hidden className="absolute top-0 inset-x-0 h-1.5 flex">
        {[BLUE, RED, YELLOW, GREEN].map(color => <span key={color} className="flex-1" style={{ background: color }} />)}
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.14] dark:opacity-[0.18]">
        <span className="absolute rounded-full w-[46vmax] h-[46vmax] -left-[20vmax] -top-[22vmax]" style={{ background: BLUE }} />
        <span className="absolute rounded-full w-[30vmax] h-[30vmax] -right-[12vmax] -top-[14vmax]" style={{ background: RED }} />
        <span className="absolute rounded-full w-[34vmax] h-[34vmax] -left-[14vmax] -bottom-[18vmax]" style={{ background: YELLOW }} />
        <span className="absolute rounded-full w-[50vmax] h-[50vmax] -right-[22vmax] -bottom-[26vmax]" style={{ background: GREEN }} />
      </div>

      {/* What signing in gets you */}
      <section className="relative flex flex-col justify-center gap-8 px-7 pt-16 pb-6 md:px-16 lg:px-20 lg:py-16">
        <Link href="/" className="inline-flex items-center gap-2 self-start text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray hover:text-foreground transition-colors">
          <ArrowLeft size={14} />
          TaskMaster
        </Link>

        <div className="space-y-4">
          <div aria-hidden className="flex gap-2">
            {[BLUE, RED, YELLOW, GREEN].map(color => <span key={color} className="w-3 h-3 rounded-full" style={{ background: color }} />)}
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight uppercase leading-[1.02] text-tm-purple-dark dark:text-tm-yellow">
            One sign-in.<br />Your whole season.
          </h1>
          <p className="max-w-md text-base md:text-lg font-medium text-tm-blue-gray">
            TaskMaster uses your Google account and nothing else.
          </p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 max-w-xl">
          {POINTS.map(point => (
            <li key={point.title} className="flex gap-3">
              <span aria-hidden className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0" style={{ background: point.color }} />
              <span>
                <span className="block font-black text-foreground leading-tight">{point.title}</span>
                <span className="block text-sm font-medium text-tm-blue-gray mt-0.5">{point.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* The door itself */}
      <section className="relative flex items-center justify-center px-6 pt-6 pb-16 lg:py-16">
        <div className="w-full max-w-md rounded-3xl bg-background/85 border border-tm-blue-gray/15 shadow-2xl shadow-black/10 dark:shadow-black/40 p-8 md:p-10 space-y-7 text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-white shadow-md flex items-center justify-center">
            <GoogleMark size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight uppercase text-tm-purple-dark dark:text-tm-yellow">Welcome</h2>
            <p className="text-sm font-medium text-tm-blue-gray">Continue with the Google account you want your planner kept under.</p>
          </div>

          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-full bg-white text-[#1f1f1f] border border-[#747775] font-semibold shadow-sm transition-transform hover:scale-[1.02] active:scale-95"
            >
              <GoogleMark />
              Continue with Google
            </button>
          </form>

          {error && (
            <p role="alert" className="text-sm font-medium" style={{ color: RED }}>
              Sign-in didn&apos;t go through. Please try again.
            </p>
          )}

          <p className="text-xs font-medium text-tm-blue-gray/80">
            You&apos;ll be taken to Google to choose an account, then straight back here.
          </p>
        </div>
      </section>
    </main>
  );
}
