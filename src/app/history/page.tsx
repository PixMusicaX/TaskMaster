import { getHistory } from "@/app/actions/history";
import HistoryList from "@/components/HistoryList";
import { format, subDays } from "date-fns";

export const metadata = {
  title: "History - TaskMaster",
  description: "View your collective history of events, tasks, and notes.",
};

export default async function HistoryPage() {
  const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");
  
  // Fetch initial 28 days of history
  const initialData = await getHistory(yesterdayStr, 28);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto p-4 pt-12 md:p-12 md:pt-16 custom-scrollbar">
        <HistoryList initialData={initialData} initialEndDateStr={yesterdayStr} />
      </div>
    </div>
  );
}
