import { useCallback, useEffect } from "react";
import { api } from "../api";
import { useWorkspace } from "../context/WorkspaceContext";

export function SyncStatusBar() {
  const { syncStatus, setSyncError, setAgentOnline } = useWorkspace();

  // Memoize the health check to prevent effect recreation on every render
  const checkBackend = useCallback(async () => {
    try {
      await api.get("/health");
      setAgentOnline(true);
      setSyncError(null);
    } catch {
      setAgentOnline(false);
    }
  }, [setAgentOnline, setSyncError]);

  useEffect(() => {
    void checkBackend();
    // Increased interval to 30000ms (30 seconds) to ease server load on the free tier
    const interval = window.setInterval(checkBackend, 30000);

    return () => window.clearInterval(interval);
  }, [checkBackend]);

  const formatLastSync = () => {
    if (!syncStatus || !syncStatus.lastSync) return "Not synced yet";

    try {
      // Convert backend raw string timestamp safely into a valid JavaScript Date object
      const lastSyncDate = new Date(syncStatus.lastSync);
      
      // Fallback if the date string is invalid or parsed poorly
      if (isNaN(lastSyncDate.getTime())) return "Not synced yet";

      const now = new Date();
      const diff = now.getTime() - lastSyncDate.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return "Just now";
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      return `${days}d ago`;
    } catch {
      return "Not synced yet";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-white/8 bg-slate-950/70 px-4 py-2 text-xs backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.035] px-3 py-1.5">
        <span
          className={[
            "h-2 w-2 rounded-full",
            syncStatus.agentOnline
              ? "bg-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.55)]"
              : "bg-amber-300",
          ].join(" ")}
        />
        <span className="font-medium text-slate-300">
          Backend {syncStatus.agentOnline ? "connected" : "reconnecting"}
        </span>
      </div>

      {syncStatus.activeSyncAccount && (
        <div className="text-slate-400">
          Account <span className="text-slate-300">{syncStatus.activeSyncAccount}</span>
        </div>
      )}

      {syncStatus.isSyncing ? (
        <div className="flex items-center gap-2 text-cyan-300">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
          <span>Sync in progress</span>
        </div>
      ) : (
        <div className="text-slate-500">
          Last verified sync <span className="text-slate-300">{formatLastSync()}</span>
        </div>
      )}

      {syncStatus.error && (
        <div className="ml-auto flex items-center gap-2 text-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
          {syncStatus.error}
        </div>
      )}
    </div>
  );
}