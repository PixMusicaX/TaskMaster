import { Eye } from "lucide-react";
import { addDays, format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import InsightCard, { Pill } from "./insight-card";

export default function FutureSightCard({ events }: { events: any[] }) {
  return (
    <InsightCard
      icon={Eye}
      iconClassName="text-tm-yellow"
      title="Future Sight"
      subtitle="Upcoming Quests"
      aside={<Pill className="hidden sm:block">Prophecy</Pill>}
      delay={0.5}
      className="border-tm-yellow/20"
    >
      <div className="flex-1 space-y-4 relative z-10">
        {events.length > 0 ? (
          <div className="space-y-3">
            {events.slice(0, 5).map((e, idx) => {
              const eventDate = new Date(e.date);
              return (
                <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group/event gap-3">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className={cn(
                      "w-10 h-10 shrink-0 rounded-xl flex flex-col items-center justify-center border transition-all",
                      e.type === "special_day" ? "bg-tm-orange-dark/10 border-tm-orange-dark/20 text-tm-orange-dark" : "bg-tm-yellow/10 border-tm-yellow/20 text-tm-yellow"
                    )}>
                      <span className="text-micro font-black uppercase leading-none">{format(eventDate, "MMM")}</span>
                      <span className="text-lg font-black leading-none mt-0.5">{format(eventDate, "dd")}</span>
                    </div>
                    <div className="min-w-0 flex-1 py-1">
                      <h4 className="font-bold text-sm text-foreground/90 break-words leading-snug">{e.title}</h4>
                      <p className="text-caption font-black uppercase text-tm-blue-gray/60 tracking-widest mt-1">
                        {e.type === "special_day" ? "Special Day" : `${e.tier} Quest`}
                      </p>
                    </div>
                  </div>
                  <div className="text-caption font-black uppercase text-tm-blue-gray/40 tracking-widest shrink-0 text-right">
                    {isSameDay(eventDate, addDays(new Date(), 1)) ? "Tomorrow" : format(eventDate, "EEEE")}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center text-center opacity-30 gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-tm-blue-gray animate-spin-slow" />
            <p className="text-xs font-bold italic">The future is yet unwritten...</p>
          </div>
        )}
      </div>
    </InsightCard>
  );
}
