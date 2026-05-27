import { useEffect, useState } from "react";
import { api, getApiErrorMessage } from "./api";
import { useWorkspace } from "./context/WorkspaceContext";
import type { Trade } from "./types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartPanel,
  EmptyState,
  LoadingState,
  MetricCard,
  PageHeader,
  Panel,
  StatusBadge,
  Toolbar,
} from "./components/ui";

type Props = {
  selectedAccount: string;
  hasAccounts: boolean;
  hasTrades: boolean;
  isShellLoading: boolean;
};

export default function AnalyticsPage({
  selectedAccount,
  hasAccounts,
  hasTrades,
  isShellLoading,
}: Props) {
  const { selectedPeriod } = useWorkspace();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [tagData, setTagData] = useState<any>(null);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const loadAnalytics = async (account = selectedAccount, days = periodDays) => {
    setLoading(true);
    setError("");

    const tradesAccountParam = account
      ? `&account_id=${encodeURIComponent(account)}`
      : "";
    const analyticsAccountParam = account
      ? `?account_id=${encodeURIComponent(account)}`
      : "";

    try {
      const [tradesRes, analyticsRes, tagsRes, aiRes, recRes] = await Promise.allSettled([
        api.get(`/api/trades?days=${days}${tradesAccountParam}`),
        api.get(`/api/trades/analytics${analyticsAccountParam}`),
        api.get(`/api/trades/analytics/tags${analyticsAccountParam}`),
        api.get(`/api/trades/analytics/ai${analyticsAccountParam}`),
        api.get(`/api/trades/analytics/recommendations${analyticsAccountParam}`),
      ]);

      if (tradesRes.status === "rejected") {
        throw tradesRes.reason;
      }

      if (analyticsRes.status === "rejected") {
        throw analyticsRes.reason;
      }

      setTrades(
        Array.isArray(tradesRes.value.data) ? tradesRes.value.data : tradesRes.value.data.trades ?? []
      );
      setAnalytics(analyticsRes.value.data);
      setTagData(tagsRes.status === "fulfilled" ? tagsRes.value.data : null);
      setAiInsights(aiRes.status === "fulfilled" ? aiRes.value.data?.insights ?? [] : []);
      setRecommendations(recRes.status === "fulfilled" ? recRes.value.data?.recommendations ?? [] : []);
    } catch (err) {
      console.error("Error loading analytics:", err);
      setError(getApiErrorMessage(err, "Unable to load analytics for the selected account."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics(selectedAccount, periodDays);
  }, [selectedAccount, selectedPeriod]);

  if (isShellLoading || loading) {
    return <LoadingState label="Loading analytics..." />;
  }

  if (!hasAccounts && !hasTrades) {
    return (
      <EmptyState
        title="Analytics will appear after your first sync"
        description="Connect the desktop sync agent first. Once trades arrive, performance, risk, behavior, and insight cards will populate automatically."
      />
    );
  }

  if (error) {
    return <EmptyState title="Analytics unavailable" description={error} />;
  }

  if (!analytics || (!analytics.totalPnL && analytics.totalPnL !== 0)) {
    return <LoadingState label="Loading analytics..." />;
  }

  let equity = 0;
  let peak = 0;

  const equityData = trades
    .slice()
    .reverse()
    .map((trade) => {
      equity += trade.profit || 0;
      if (equity > peak) peak = equity;

      return {
        time: trade.open_time
          ? new Date(trade.open_time.replace(" ", "T")).toLocaleDateString()
          : "-",
        equity,
        drawdown: peak - equity,
      };
    });

  const symbolStats: Record<string, number> = {};
  trades.forEach((trade) => {
    if (trade.symbol) {
      symbolStats[trade.symbol] =
        (symbolStats[trade.symbol] || 0) + (trade.profit || 0);
    }
  });

  const symbolData = Object.entries(symbolStats).map(([symbol, profit]) => ({
    symbol,
    profit,
  }));

  const bins: Record<string, number> = {};
  trades.forEach((trade) => {
    const bucket = Math.floor(trade.profit || 0);
    bins[bucket] = (bins[bucket] || 0) + 1;
  });

  const distributionData = Object.entries(bins).map(([range, count]) => ({
    range,
    count,
  }));

  const strategyData =
    tagData && tagData.strategy
      ? Object.entries(tagData.strategy).map(([key, val]: any) => ({
          strategy: key,
          profit: val.profit,
          trades: val.count,
        }))
      : [];

  const emotionData =
    tagData && tagData.emotion
      ? Object.entries(tagData.emotion).map(([key, val]: any) => ({
          emotion: key,
          profit: val.profit,
          trades: val.count,
        }))
      : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Performance, risk, behavior, and account-level trading intelligence in one review surface."
      />

      <Toolbar>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone="info">{selectedAccount ? "Focused account" : "All accounts"}</StatusBadge>
          <StatusBadge tone={trades.length ? "success" : "warning"}>
            {trades.length ? `${trades.length} trades loaded` : "Awaiting data"}
          </StatusBadge>
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
          Calculated from synced trade history
        </p>
      </Toolbar>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel
          title="AI Insights"
          description="Patterns detected from the selected account scope."
        >
          {!aiInsights.length ? (
            <EmptyState
              title="No insights yet"
              description="Insights will appear once enough synced trade history is available."
            />
          ) : (
            <ul className="space-y-3 text-sm text-slate-300">
              {aiInsights.map((insight, index) => (
                <li key={index} className="flex gap-3 rounded-[20px] border border-white/8 bg-white/[0.03] p-3">
                  <StatusBadge tone="info">Insight</StatusBadge>
                  <span className="leading-6">{insight}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Smart Recommendations"
          description="Practical next steps based on the current analytics."
        >
          {!recommendations.length ? (
            <EmptyState
              title="No recommendations yet"
              description="Recommendations will appear when actionable patterns are detected."
            />
          ) : (
            <ul className="space-y-3 text-sm text-slate-300">
              {recommendations.map((recommendation, index) => (
                <li key={index} className="flex gap-3 rounded-[20px] border border-white/8 bg-white/[0.03] p-3">
                  <StatusBadge tone="warning">Action</StatusBadge>
                  <span className="leading-6">{recommendation}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total PnL"
          value={`$${(analytics.totalPnL ?? 0).toFixed(2)}`}
          helper="Net result across the selected account scope."
          tone={(analytics.totalPnL ?? 0) >= 0 ? "success" : "danger"}
        />
        <MetricCard
          label="Win Rate"
          value={`${(analytics.winRate ?? 0).toFixed(1)}%`}
          helper="Share of closed trades that finished positive."
        />
        <MetricCard
          label="Profit Factor"
          value={(analytics.profitFactor ?? 0).toFixed(2)}
          helper="Gross profit divided by gross loss."
        />
        <MetricCard
          label="Expectancy"
          value={`$${(analytics.expectancy ?? 0).toFixed(2)}`}
          helper="Expected value per trade from historical outcomes."
          tone={(analytics.expectancy ?? 0) >= 0 ? "success" : "danger"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Max Drawdown"
          value={`$${(analytics.maxDrawdown ?? 0).toFixed(2)}`}
          helper="Largest peak-to-trough equity drop."
          tone="danger"
        />
        <MetricCard
          label="Avg Loss"
          value={`$${(analytics.avgLoss ?? 0).toFixed(2)}`}
          helper="Average losing trade size."
          tone="danger"
        />
        <MetricCard
          label="Max Loss Streak"
          value={String(analytics.maxLossStreak ?? 0)}
          helper="Longest consecutive losing run."
        />
        <MetricCard label="Trades" value={String(analytics.totalTrades ?? 0)} helper="Closed trades included in this analysis." />
        <MetricCard
          label="Avg Win"
          value={`$${(analytics.avgWin ?? 0).toFixed(2)}`}
          helper="Average profitable trade size."
          tone="success"
        />
        <MetricCard
          label="Max Win Streak"
          value={String(analytics.maxWinStreak ?? 0)}
          helper="Longest consecutive winning run."
        />
        <MetricCard label="Best Symbol" value={analytics.bestSymbol || "-"} helper="Highest total profit by symbol." />
        <MetricCard label="Worst Symbol" value={analytics.worstSymbol || "-"} helper="Weakest total performance by symbol." />
      </div>

      <ChartPanel title="Equity Curve" description="Cumulative performance progression over time.">
        <LineChart data={equityData}>
          <XAxis dataKey="time" hide />
          <YAxis stroke="#64748b" />
          <Tooltip {...chartTooltip} />
          <Line
            type="monotone"
            dataKey="equity"
            stroke="#22d3ee"
            strokeWidth={2.5}
            dot={false}
          />
        </LineChart>
      </ChartPanel>

      <ChartPanel title="Drawdown" description="Peak-to-trough distance across the same equity path.">
        <LineChart data={equityData}>
          <XAxis dataKey="time" hide />
          <YAxis stroke="#64748b" />
          <Tooltip {...chartTooltip} />
          <Line
            type="monotone"
            dataKey="drawdown"
            stroke="#fb7185"
            strokeWidth={2.5}
            dot={false}
          />
        </LineChart>
      </ChartPanel>

      <ChartPanel title="Profit Distribution" description="Frequency distribution across rounded trade outcomes.">
        <BarChart data={distributionData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
          <XAxis dataKey="range" stroke="#64748b" />
          <YAxis stroke="#64748b" />
          <Tooltip {...chartTooltip} />
          <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ChartPanel>

      <ChartPanel title="Symbol Performance" description="Net profit by traded instrument.">
        <BarChart data={symbolData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
          <XAxis dataKey="symbol" stroke="#64748b" />
          <YAxis stroke="#64748b" />
          <Tooltip {...chartTooltip} />
          <Bar dataKey="profit" fill="#34d399" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ChartPanel>

      {strategyData.length > 0 && (
        <ChartPanel title="Strategy Performance" description="Profitability and trade count grouped by strategy tag.">
          <BarChart data={strategyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
            <XAxis dataKey="strategy" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip {...chartTooltip} />
            <Bar dataKey="profit" fill="#38bdf8" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ChartPanel>
      )}

      {emotionData.length > 0 && (
        <ChartPanel title="Emotion Impact" description="Outcome and trade count grouped by psychology tags.">
          <BarChart data={emotionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
            <XAxis dataKey="emotion" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip {...chartTooltip} />
            <Bar dataKey="profit" fill="#fb923c" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ChartPanel>
      )}
    </div>
  );
}
