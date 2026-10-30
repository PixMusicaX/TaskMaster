import { AlertTriangle, RefreshCw } from "lucide-react";
import SyncLogic from "@/components/sync-logic";
import { cn } from "@/lib/utils";

const LABEL = "inline-flex items-center gap-1.5 text-caption font-mono font-semibold uppercase tracking-[0.12em]";

interface GoogleSyncBarProps {
  // The connection's lastError: "reconnect" when Google ended it, "failed" when a sync didn't finish
  error: string | null;
  syncing: boolean;
  onSync: () => void;
}

// The calendar's line for a connected Google Calendar. A manual disconnect removes the connection,
// so this isn't shown at all and there's nothing to warn about.
export default function GoogleSyncBar({ error, syncing, onSync }: GoogleSyncBarProps) {
  return (
    <div className="mt-2 space-y-1">
      <div className="flex flex-wrap items-center gap-4">
        {error === "reconnect" ? (
          <a href="/api/gcal/connect" className={cn(LABEL, "text-tm-orange-dark hover:opacity-80 transition-opacity")}>
            <RefreshCw size={12} /> Reconnect
          </a>
        ) : (
          <button
            onClick={onSync}
            disabled={syncing}
            className={cn(LABEL, "text-tm-blue-gray hover:text-foreground transition-colors disabled:opacity-50")}
          >
            <RefreshCw size={12} className={cn(syncing && "animate-spin")} /> {syncing ? "Syncing…" : "Sync"}
          </button>
        )}
        <SyncLogic />
      </div>
      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-sm font-medium text-tm-orange-dark">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          {error === "reconnect"
            ? "Google Calendar stopped syncing. Reconnect to catch up; your changes here are saved."
            : "The last sync didn't finish. It will try again on its own."}
        </p>
      )}
    </div>
  );
}
