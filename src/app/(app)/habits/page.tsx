import HabitsView, { type HabitsInitial } from "@/components/habits/habits-view";
import { playerToday } from "@/lib/current-day";
import { getArchivedHabits, getHabitLogs, getHabits } from "@/app/actions/habits";
import { getProfile } from "@/app/actions/gamification";

// Drawn by the browser (components/habits/habits-view.tsx); its data starts loading here, while
// the page is on its way, and streams in behind it
export default async function HabitsPage() {
  const todayStr = await playerToday();
  return <HabitsView initial={todayStr ? loadHabits(todayStr) : null} />;
}

async function loadHabits(todayStr: string): Promise<HabitsInitial | null> {
  try {
    const [habits, archived, profile, logs] = await Promise.all([getHabits(), getArchivedHabits(), getProfile(todayStr), getHabitLogs()]);
    return { todayStr, habits, archived, profile, logs };
  } catch (e) {
    console.error("Habits prefetch failed:", e);
    return null;
  }
}
