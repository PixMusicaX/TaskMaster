import NotesView, { type NotesInitial } from "@/components/notes/notes-view";
import { playerToday } from "@/lib/current-day";
import { getNoteByDate, getRecentNotes } from "@/app/actions/notes";
import { getProfile } from "@/app/actions/gamification";

// Drawn by the browser (components/notes/notes-view.tsx); today's note starts loading here, while
// the page is on its way, and streams in behind it
export default async function NotesPage() {
  const todayStr = await playerToday();
  return <NotesView initial={todayStr ? loadNotes(todayStr) : null} />;
}

async function loadNotes(todayStr: string): Promise<NotesInitial | null> {
  try {
    const [note, profile, recent] = await Promise.all([getNoteByDate(todayStr), getProfile(todayStr), getRecentNotes(10)]);
    return { todayStr, note, profile, recent };
  } catch (e) {
    console.error("Notes prefetch failed:", e);
    return null;
  }
}
