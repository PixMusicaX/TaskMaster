import HistoryList from "@/components/HistoryList";

export const metadata = {
  title: "History - TaskMaster",
  description: "View your collective history of events, tasks, and notes.",
};

export default function HistoryPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto p-4 pt-12 md:p-12 md:pt-16 custom-scrollbar">
        <HistoryList />
      </div>
    </div>
  );
}
