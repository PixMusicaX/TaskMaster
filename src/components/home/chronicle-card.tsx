import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ChevronRight, ScrollText } from "lucide-react";
import type { HistoryDay } from "@/app/actions/history";
import { moodEmoji } from "@/lib/utils";
import { noteTextLines } from "@/lib/types";
import InsightCard, { Pill } from "./insight-card";

const MAX_YEARS = 4;

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

// Today's date in earlier years; the dashboard only renders this when there is something to show
export default function ChronicleCard({ days, todayStr }: { days: HistoryDay[]; todayStr: string }) {
  const thisYear = Number(todayStr.slice(0, 4));

  return (
    <InsightCard
      icon={ScrollText}
      iconClassName="text-tm-orange-light"
      title="Chronicle"
      subtitle={`On ${format(parseISO(todayStr), "MMMM do")} in years past`}
      aside={<Pill className="hidden sm:block">{plural(days.length, "echo")}</Pill>}
      delay={0.4}
      className="border-tm-orange-light/20"
    >
      <ul className="flex-1 space-y-3 relative z-10">
        {days.slice(0, MAX_YEARS).map((day) => {
          const date = parseISO(day.date);
          const yearsAgo = thisYear - date.getFullYear();
          const note = day.notes[0];
          const lines = note ? noteTextLines(note.content) : [];
          const summary = [
            day.tasks.length > 0 && `${plural(day.tasks.length, "task")} done`,
            day.habits.length > 0 && plural(day.habits.length, "habit"),
            ...day.events.slice(0, 2).map(e => e.title),
          ].filter(Boolean).join(" · ");

          return (
            <li key={day.date}>
              <Link
                href={`/history?q=${encodeURIComponent(format(date, "MMMM d yyyy"))}`}
                className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors group/day"
              >
                <div className="w-12 shrink-0 text-center">
                  <p className="text-lg font-bold leading-none text-tm-orange-light">{date.getFullYear()}</p>
                  <p className="text-micro font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray/70 mt-1">
                    {yearsAgo === 1 ? "1 yr ago" : `${yearsAgo} yrs ago`}
                  </p>
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm text-foreground/90 leading-snug line-clamp-2">
                    {note && <span className="mr-1.5" aria-label={`Mood: ${note.mood}`}>{moodEmoji(note.mood)}</span>}
                    {lines.length > 0 ? lines.join(" · ") : <span className="italic text-tm-blue-gray">No note written</span>}
                  </p>
                  {summary && (
                    <p className="text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray/70 truncate">{summary}</p>
                  )}
                </div>
                <ChevronRight size={16} className="shrink-0 self-center text-tm-blue-gray/50 group-hover/day:translate-x-0.5 transition-transform" />
              </Link>
            </li>
          );
        })}
      </ul>
    </InsightCard>
  );
}
