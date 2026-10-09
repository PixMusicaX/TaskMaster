import Navbar from "@/components/navbar";
import SwipeNav from "@/components/swipe-nav";
import ClassWatermark from "@/components/class-watermark";
import EraAmbient from "@/components/era-ambient";
import AccountScope from "@/components/account-scope";
import { ProgressProvider } from "@/components/progress/progress-provider";
import PersonaChrome, { NormalOnly } from "@/components/persona/persona-chrome";
import SpecialChrome from "@/components/special/special-chrome";
import { requireUserId } from "@/lib/current-user";

// Everything behind the login: checks the session, then wraps the planner pages in their chrome
export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const userId = await requireUserId();

  return (
    <ProgressProvider>
      <AccountScope userId={userId} />
      <div className="overflow-x-clip w-full relative flex flex-col flex-1 min-h-full">
        <NormalOnly>
          <EraAmbient />
          <ClassWatermark />
        </NormalOnly>
        <SwipeNav />
        <NormalOnly>
          <Navbar />
        </NormalOnly>
        <PersonaChrome />
        <SpecialChrome />
        {/* Clip, not auto: a scroll container here would stop position: sticky from pinning to the viewport */}
        <main className="flex-1 overflow-x-clip relative pb-24 lg:pb-0">
          {children}
        </main>
      </div>
    </ProgressProvider>
  );
}
