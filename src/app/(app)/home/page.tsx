import { addDays, subDays } from "date-fns";
import HomeView, { type HomeInitial } from "@/components/home/home-view";
import { playerToday } from "@/lib/current-day";
import { shiftDay } from "@/lib/time-zone";
import { getHabits } from "@/app/actions/habits";
import { getCalendarEvents, getDashboardTasks, getEventsByDateRange } from "@/app/actions/events";
import { getProfile, getSeasonPace, getSeasonXPBeforeToday } from "@/app/actions/gamification";
import { getOnThisDay } from "@/app/actions/history";
import { getNoteByDate, getRecentNotes } from "@/app/actions/notes";
import { getHomeNudges } from "@/app/actions/account";

// The page is drawn by the browser (components/home/home-view.tsx), but its data starts loading
// here, all at once, while the page is still on its way: the browser would otherwise ask for each
// piece in turn after it starts up. Nothing waits for it; the data streams in behind the page.
export default async function HomePage() {
  const todayStr = await playerToday();
  return <HomeView initial={todayStr ? loadHome(todayStr) : null} />;
}

async function loadHome(todayStr: string): Promise<HomeInitial | null> {
  try {
    // The ranges are instants, as the browser's own calls send them
    const now = new Date();
    const [habits, yesterdayNote, tasks, profile, moodData, calendar, seasonPace, xpBeforeToday, onThisDay, nudges, recentEvents] = await Promise.all([
      // The dashboard only looks at the last 7 days of habit logs
      getHabits(shiftDay(todayStr, -6)),
      getNoteByDate(shiftDay(todayStr, -1)),
      getDashboardTasks(todayStr),
      getProfile(todayStr),
      getRecentNotes(30),
      getCalendarEvents(addDays(now, 1), addDays(now, 14)),
      getSeasonPace(todayStr),
      getSeasonXPBeforeToday(todayStr),
      getOnThisDay(todayStr),
      getHomeNudges(),
      getEventsByDateRange(subDays(now, 6), now),
    ]);
    return { todayStr, habits, yesterdayNote, tasks, profile, moodData, calendar, seasonPace, xpBeforeToday, onThisDay, nudges, recentEvents };
  } catch (e) {
    // The browser loads it itself instead
    console.error("Home prefetch failed:", e);
    return null;
  }
}
