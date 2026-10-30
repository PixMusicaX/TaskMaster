import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import BrowserTheme from "@/components/browser-theme";

// The shell of the public legal pages. Both are open to everyone, signed in or not: Google's
// reviewers and new visitors need to read them.

export const LEGAL_LINK = "underline underline-offset-2 hover:text-foreground transition-colors";

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-display font-bold tracking-tight text-tm-purple-dark dark:text-tm-yellow">{title}</h2>
      {children}
    </section>
  );
}

export function LegalList({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-5 space-y-2">{children}</ul>;
}

export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-12 md:py-20 space-y-10">
      <BrowserTheme />

      <div className="space-y-4">
        <Link href="/" className="inline-flex items-center gap-2 text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray hover:text-foreground transition-colors">
          <ArrowLeft size={14} />
          TaskMaster
        </Link>
        <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight text-tm-purple-dark dark:text-tm-yellow">{title}</h1>
        <p className="text-sm font-medium text-tm-blue-gray">Last updated {updated}</p>
      </div>

      <div className="space-y-10 text-base font-medium leading-relaxed text-tm-blue-gray">
        {children}
      </div>
    </main>
  );
}
