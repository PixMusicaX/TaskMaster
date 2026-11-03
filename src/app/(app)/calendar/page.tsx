import { endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import CalendarView, { type CalendarInitial } from "@/components/calendar/calendar-view";
import { playerToday } from "@/lib/current-day";
import { getCalendarEvents } from "@/app/actions/events";
import { getProfile } from "@/app/actions/gamification";
import { getMoodsByDateRange } from "@/app/actions/notes";
import { getReliefHistory } from "@/app/actions/relief";

// Drawn by the browser (components/calendar/calendar-view.tsx); this month starts loading here,
// while the page is on its way, and streams in behind it
export default async function CalendarPage() {
  const todayStr = await playerToday();
  return <CalendarView initial={todayStr ? loadMonth(todayStr) : null} />;
}

async function loadMonth(todayStr: string): Promise<CalendarInitial | null> {
  try {
    // The grid the page opens on: whole weeks round the player's month (as calendar dates, which is
    // how the queries read them)
    const monthStart = startOfMonth(parseISO(todayStr));
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 0 });
    const [events, profile, moods, reliefs] = await Promise.all([
      getCalendarEvents(startDate, endDate),
      getProfile(todayStr),
      getMoodsByDateRange(format(startDate, "yyyy-MM-dd"), format(endDate, "yyyy-MM-dd")),
      getReliefHistory(format(startDate, "yyyy-MM-dd")),
    ]);
    return { todayStr, events, profile, moods, reliefs };
  } catch (e) {
    console.error("Calendar prefetch failed:", e);
    return null;
  }
}
