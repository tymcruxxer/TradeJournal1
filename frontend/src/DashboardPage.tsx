import { useEffect, useState } from "react";
import { api, getApiErrorMessage, getDesktopAgentDownloadUrl } from "./api";
import { useWorkspace } from "./context/WorkspaceContext";
import type { Trade } from "./types";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getSettings } from "./settings";
import {
  Button,
  ChartPanel,
  EmptyState,
  LoadingState,
  MetricCard,
  PageHeader,
  Panel,
  StatusBadge,
  TextInput,
  Toolbar,
} from "./components/ui";

type Props = {
  selectedAccount: string;
  hasAccounts: boolean;
  hasTrades: boolean;
  isShellLoading: boolean;
  apiKey: string | null;
  onOpenSettings: () => void;
  onRefreshWorkspace: () => Promise<void>;
};

export default function DashboardPage({
  selectedAccount,
  hasAccounts,
  hasTrades,
  isShellLoading,
  apiKey,
  onOpenSettings,
  onRefreshWorkspace,
}: Props) {
  const {
    selectedPeriod,
    setSyncing: setWorkspaceSyncing,
    setSyncError: setWorkspaceSyncError,
    setSyncStatus,
    updateLastSync,
  } = useWorkspace();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncError, setSyncError] = useState("");
  const [syncing, setSyncing] = useState(false);

  const periodDays = {
    "7D": 7,
    "30D": 30,
    "90D": 90,
    "1Y": 365,
    ALL: 3650,
  }[selectedPeriod];

  const chartTooltip = {
    contentStyle: {
      backgroundColor: "rgba(2, 6, 23, 0.96)",
      borderColor: "rgba(255,255,255,0.08)",
      borderRadius: 18,
      color: "#e2e8f0",
    },
    itemStyle: { color: "#e2e8f0" },
    labelStyle: { color: "#94a3b8" },
  };

  const loadTrades = async () => {
    setLoading(true);
    setError("");

    let url = `/api/trades?days=${periodDays}&limit=1000`;
    if (selectedAccount) {
      url += `&account_id=${encodeURIComponent(selectedAccount)}`;
    }
    try {
      const res = await api.get(url);
      const data = res.data;
      setTrades(Array.isArray(data) ? data : data.trades ?? []);
    } catch (err) {
      console.error("Error loading dashboard trades:", err);
      setError(getApiErrorMessage(err, "Unable to load dashboard activity for the selected account."));
    } finally {
      setLoading(false);
    }
  };

  const syncTrades = async () => {
    setSyncing(true);
    setWorkspaceSyncing(true);
    setWorkspaceSyncError(null);
    setSyncError("");
    let syncUrl = "/api/trades/sync-mt5?days=730";
    if (selectedAccount) {
      syncUrl += `&account_id=${encodeURIComponent(selectedAccount)}`;
    }
    try {
      await api.get(syncUrl);
      setLastSync(new Date().toLocaleTimeString());
      updateLastSync();
      setWorkspaceSyncing(false);
      setWorkspaceSyncError(null);
      await onRefreshWorkspace();
      await loadTrades();
    } catch (err) {
      console.error("Error syncing trades:", err);
      const message = getApiErrorMessage(
        err,
        "Sync could not complete yet. Keep MT5 open on the trader machine or use the desktop sync agent."
      );
      setSyncError(message);
      setWorkspaceSyncError(message);
      setWorkspaceSyncing(false);
    } finally {
      setSyncing(false);
    }
  };

  const startDesktopAgentDownload = () => {
    window.location.assign(getDesktopAgentDownloadUrl());
  };

  useEffect(() => {
    setSyncStatus({
      activeSyncAccount: selectedAccount || null,
    });
  }, [selectedAccount]);

  useEffect(() => {
    loadTrades();
  }, [selectedPeriod, selectedAccount]);

  useEffect(() => {
    const settings = getSettings();
    if (!settings.autoSync) return;

    const interval = setInterval(async () => {
      let syncUrl = "/api/trades/sync-mt5";
      if (selectedAccount) {
        syncUrl += `?account_id=${encodeURIComponent(selectedAccount)}`;
      }
      try {
        await api.get(syncUrl);
        await loadTrades();
      } catch (err) {
        console.error("Auto sync failed:", err);
        setSyncError(
          getApiErrorMessage(
            err,
            "Auto sync failed. Check MT5, backend connectivity, or the desktop sync agent."
          )
        );
      }
    }, settings.syncInterval);

    return () => clearInterval(interval);
  }, [selectedAccount, selectedPeriod]);

  const filteredTrades = trades.filter((trade) => {
    if (!startDate && !endDate) return true;

    const time = new Date(trade.open_time).getTime();

    if (startDate && time < new Date(startDate).getTime()) return false;
    if (endDate && time > new Date(endDate).getTime()) return false;

    return true;
  });

  let equity = 0;
  const equityData = filteredTrades
    .slice()
    .reverse()
    .map((trade) => {
      equity += trade.profit;
      return {
        time: new Date(trade.open_time).toLocaleDateString(),
        equity,
      };
    });

  const dailyMap: Record<string, number> = {};
  filteredTrades.forEach((trade) => {
    const day = new Date(trade.open_time).toLocaleDateString();
    dailyMap[day] = (dailyMap[day] || 0) + trade.profit;
  });

  const dailyData = Object.entries(dailyMap).map(([date, pnl]) => ({
    date,
    pnl,
  }));

  const totalPnL = filteredTrades.reduce((sum, trade) => sum + trade.profit, 0);
  const averageTrade = filteredTrades.length ? totalPnL / filteredTrades.length : 0;
  const selectedLabel = selectedAccount ? "Focused account" : "All connected accounts";
  const invalidDateRange = Boolean(startDate && endDate && new Date(startDate) > new Date(endDate));

  if (isShellLoading) {
    return <LoadingState label="Preparing your workspace..." />;
  }

  if (!hasAccounts && !hasTrades) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Welcome to TradeJournal"
          description="Connect the secure desktop sync agent once, then review account-aware performance from this workspace."
        />

        <Panel
          title="Start here"
          description="Your MT5 terminal stays on the trader machine. The desktop agent reads closed trades locally and sends them to this secure dashboard."
        >
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(15,23,42,0.08),rgba(59,130,246,0.12))] p-6 shadow-[0_22px_46px_rgba(2,6,23,0.24)]">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge tone="info">First setup</StatusBadge>
                  <StatusBadge tone={apiKey ? "success" : "warning"}>
                    {apiKey ? "API key ready" : "API key pending"}
                  </StatusBadge>
                </div>
                <h2 className="mt-5 max-w-xl text-3xl font-semibold tracking-[-0.05em] text-white">
                  Connect your first MT5 account in a few calm steps.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                  Download the Windows sync agent, paste your API key, and keep MT5 open for the first upload. Your dashboard will unlock automatically once trades arrive.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={startDesktopAgentDownload} variant="primary">
                    Download Desktop Sync Agent
                  </Button>
                  <Button onClick={onOpenSettings}>Open setup guide</Button>
                  <Button onClick={onRefreshWorkspace} variant="ghost">Refresh status</Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["1. Copy key", "Open Settings and copy the desktop sync API key for this workspace."],
                  ["2. Run agent", "Install the Windows agent on the same machine where MT5 is open."],
                  ["3. Refresh", "Return here after the first upload. Accounts and analytics appear automatically."],
                ].map(([title, description]) => (
                  <div key={title} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-sm font-semibold tracking-[-0.02em] text-white">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-400">Setup readiness</p>
                <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-white">
                  {apiKey ? "API key ready" : "API key pending"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {apiKey
                    ? "Use Settings to copy it into the desktop agent."
                    : "Refresh the workspace or open Settings to retrieve the key."}
                </p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-400">How it works</p>
                <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                  <li>1. The agent reads MT5 history locally on your Windows machine.</li>
                  <li>2. It authenticates uploads with your API key and keeps accounts isolated to your user.</li>
                  <li>3. Once the first account sync lands, this workspace switches into account-aware mode automatically.</li>
                </ol>
              </div>

              <div className="rounded-[24px] border border-cyan-300/12 bg-cyan-300/8 p-5 text-sm text-cyan-50">
                <p className="font-semibold tracking-[-0.02em]">Secure local sync</p>
                <p className="mt-2 leading-6 text-cyan-50/78">
                  MT5 credentials never leave the trader machine. The agent uploads closed trade history using only the workspace API key.
                </p>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="A clear view of performance, account scope, and sync readiness."
        actions={
          <div className="flex flex-wrap gap-3">
            <Button onClick={syncTrades} variant="primary" disabled={syncing}>
              {syncing ? "Checking sync..." : "Check sync"}
            </Button>
            <Button onClick={onOpenSettings}>Settings</Button>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="info">{selectedLabel}</StatusBadge>
                {lastSync && <StatusBadge tone="success">Synced at {lastSync}</StatusBadge>}
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-white">
                Monitor performance with account context intact.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                The dashboard follows the selected account scope, so equity, daily PnL, and recent trade context stay aligned.
              </p>
            </div>
            <div className="grid min-w-[220px] gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-400">Account scope</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {selectedAccount || "All connected accounts"}
                </p>
              </div>
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-400">Agent readiness</p>
                <p className="mt-2 text-sm text-slate-300">
                  {apiKey ? "Desktop sync configured for secure uploads." : "Open Settings to provision your sync API key."}
                </p>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Workspace status" description="A quick readiness check for demo and daily review.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {[
              ["Account-aware views", hasAccounts ? "Connected" : "Waiting", hasAccounts ? "success" : "warning"],
              ["Trade feed", hasTrades ? "Active" : "No history yet", hasTrades ? "success" : "warning"],
              ["Desktop sync", apiKey ? "Key ready" : "Needs API key", apiKey ? "info" : "warning"],
            ].map(([label, value, tone]) => (
              <div key={label} className="rounded-[22px] border border-white/8 bg-slate-950/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">{label}</p>
                  <StatusBadge tone={tone as "success" | "warning" | "info"}>{value}</StatusBadge>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Toolbar>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <TextInput
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="min-w-[160px]"
          />
          <TextInput
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="min-w-[160px]"
          />
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
          {lastSync ? `Last sync ${lastSync}` : "Waiting for first verified sync"}
        </p>
      </Toolbar>

      {error && (
        <div className="rounded-[22px] border border-rose-400/18 bg-rose-400/12 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}

      {syncError && (
        <div className="rounded-[22px] border border-amber-300/18 bg-amber-300/12 px-4 py-3 text-sm text-amber-100">
          {syncError}
        </div>
      )}

      {invalidDateRange && (
        <div className="rounded-[22px] border border-amber-300/18 bg-amber-300/12 px-4 py-3 text-sm text-amber-100">
          End date must be after the start date.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total PnL"
          value={`$${totalPnL.toFixed(2)}`}
          helper="Filtered by the current account and date selection."
          tone={totalPnL >= 0 ? "success" : "danger"}
        />
        <MetricCard
          label="Trades"
          value={String(filteredTrades.length)}
          helper="Executed trades visible in the current dashboard scope."
        />
        <MetricCard
          label="Average Trade"
          value={`$${averageTrade.toFixed(2)}`}
          helper="A quick read on average outcome per trade."
          tone={averageTrade >= 0 ? "info" : "warning"}
        />
        <MetricCard
          label="Sync State"
          value={syncing ? "Updating" : "Stable"}
          helper="Shows whether a sync request is currently running."
          tone={syncing ? "info" : "neutral"}
        />
      </div>

      {loading ? (
        <LoadingState label="Loading account dashboard..." />
      ) : invalidDateRange ? (
        <EmptyState
          title="Date range needs attention"
          description="Choose an end date after the start date to refresh this dashboard view."
        />
      ) : filteredTrades.length === 0 ? (
        <EmptyState
          title="No trades in this view"
          description="No trades match this account and date view yet. Refresh after the agent syncs or adjust the filters."
          actions={<Button onClick={syncTrades}>Request sync</Button>}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartPanel title="Equity Curve" description="Cumulative performance through the filtered trade timeline.">
            <LineChart data={equityData}>
              <XAxis dataKey="time" hide />
              <YAxis stroke="#64748b" />
              <Tooltip {...chartTooltip} />
              <Line dataKey="equity" stroke="#22d3ee" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ChartPanel>

          <ChartPanel title="Daily PnL" description="Daily profit and loss distribution for the current workspace slice.">
            <BarChart data={dailyData}>
              <XAxis dataKey="date" hide />
              <YAxis stroke="#64748b" />
              <Tooltip {...chartTooltip} />
              <Bar dataKey="pnl" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ChartPanel>
        </div>
      )}
    </div>
  );
}
