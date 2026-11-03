import AccountView, { type AccountInitial } from "@/components/vault/account-view";
import { playerToday } from "@/lib/current-day";
import { shiftDay } from "@/lib/time-zone";
import { getSeasonTimeline } from "@/app/actions/gamification";
import { getSmartMissionHistory } from "@/app/actions/smart-missions";
import { getReliefHistory } from "@/app/actions/relief";
import { getPreparationTipHistory } from "@/app/actions/preparation";

// Drawn by the browser (components/vault/account-view.tsx); the seasons and the year of AI picks
// start loading here, while the page is on its way, and stream in behind it
export default async function AccountPage() {
  const todayStr = await playerToday();
  return <AccountView initial={todayStr ? loadAccount(todayStr) : null} />;
}

async function loadAccount(todayStr: string): Promise<AccountInitial | null> {
  try {
    const oneYearAgo = shiftDay(todayStr, -365);
    const [timeline, missions, reliefs, preps] = await Promise.all([
      getSeasonTimeline(todayStr),
      getSmartMissionHistory(oneYearAgo),
      getReliefHistory(oneYearAgo),
      getPreparationTipHistory(oneYearAgo),
    ]);
    return { todayStr, timeline, missions, reliefs, preps };
  } catch (e) {
    console.error("Account prefetch failed:", e);
    return null;
  }
}
