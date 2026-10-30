import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { signIn } from "@/auth";
import { getUserId } from "@/lib/current-user";
import BrowserTheme from "@/components/browser-theme";
import GoogleReveal from "@/components/landing/google-reveal";
import { GOOGLE, GoogleMark } from "@/components/google-mark";

async function signInWithGoogle() {
  "use server";
  await signIn("google", { redirectTo: "/home" });
}

// Google's blue, red, yellow and green: sign-in is with Google only, so the page wears them
const { blue: BLUE, red: RED, yellow: YELLOW, green: GREEN } = GOOGLE;

const POINTS = [
  { color: BLUE, title: "No password", text: "Your Google account is the key. Nothing new to remember, nothing stored here." },
  { color: RED, title: "Private to you", text: "Your habits, notes and calendar sit behind your account and nobody else's." },
  { color: YELLOW, title: "A fresh start", text: "New here? Your first sign-in opens an empty planner, ready for its first season." },
  { color: GREEN, title: "Only the basics", text: "Signing in reads your name, email and picture from Google. Calendar sync is optional and separate." },
];

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
            You&apos;ll be taken to Google to choose an account, then straight back here. By continuing you agree to our{" "}
            <Link href="/terms" className="underline underline-offset-2 hover:text-foreground transition-colors">Terms of Service</Link>. See also our{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">Privacy Policy</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
