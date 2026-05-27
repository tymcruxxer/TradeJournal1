import { useEffect, useRef, useState } from "react";
import { api, getApiErrorMessage } from "./api";
import { useWorkspace } from "./context/WorkspaceContext";
import type { PaginatedTradesResponse, Trade } from "./types";
import {
  Button,
  EmptyState,
  LoadingState,
  MetricCard,
  PageHeader,
  Panel,
  StatusBadge,
  TextArea,
  TextInput,
  Toolbar,
} from "./components/ui";

const PAGE_SIZE = 50;

type EditForm = {
  strategy: string;
  emotion: string;
  notes: string;
};

type Props = {
  selectedAccount: string;
  hasAccounts: boolean;
  hasTrades: boolean;
  isShellLoading: boolean;
  onRefreshWorkspace: () => Promise<void>;
};

export default function TradesPage({
  selectedAccount,
  hasAccounts,
  hasTrades,
  isShellLoading,
  onRefreshWorkspace,
}: Props) {
  const { selectedPeriod } = useWorkspace();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const hasSynced = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncWarning, setSyncWarning] = useState("");
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    strategy: "",
    emotion: "",
    notes: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const periodDays = {
    "7D": 7,
    "30D": 30,
    "90D": 90,
    "1Y": 365,
    ALL: 3650,
  }[selectedPeriod];

  const loadTrades = async (
    pageNum = page,
    account = selectedAccount,
    days = periodDays
  ) => {
    setLoading(true);
    setError("");

    try {
      if (!hasSynced.current) {
        let syncUrl = "/api/trades/sync-mt5";
        if (account) {
          syncUrl += `?account_id=${encodeURIComponent(account)}`;
        }
        try {
          await api.get(syncUrl);
          await onRefreshWorkspace();
          setSyncWarning("");
        } catch (err) {
          console.error("MT5 sync request failed:", err);
          setSyncWarning(
            getApiErrorMessage(
              err,
              "Direct MT5 sync is unavailable in this environment. Use the desktop sync agent, then refresh trades."
            )
          );
        }
        hasSynced.current = true;
      }

      const offset = pageNum * PAGE_SIZE;
      let url = `/api/trades?days=${days}&limit=${PAGE_SIZE}&offset=${offset}`;
      if (account) {
        url += `&account_id=${encodeURIComponent(account)}`;
      }

      const res = await api.get<PaginatedTradesResponse>(url);
      const cleaned = res.data.trades.filter((trade) => trade.symbol);

      setTrades(cleaned);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch (err) {
      console.error("Error loading trades:", err);
      setError(getApiErrorMessage(err, "Unable to load trades. Check your backend connection or sync setup."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(0);
    hasSynced.current = false;
    loadTrades(0, selectedAccount, periodDays);
  }, [selectedPeriod, selectedAccount]);

  const goToPage = (newPage: number) => {
    if (newPage < 0 || newPage >= totalPages) return;
    setPage(newPage);
    loadTrades(newPage, selectedAccount, periodDays);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";

    const fixed = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T");
    const date = new Date(fixed);
    return isNaN(date.getTime()) ? "-" : date.toLocaleString();
  };

  const openEditor = (trade: Trade) => {
    setEditingTrade(trade);
    setEditForm({
      strategy: trade.strategy || "",
      emotion: trade.emotion || "",
      notes: trade.notes || "",
    });
  };

  const closeEditor = () => {
    if (savingEdit) return;
    setEditingTrade(null);
    setEditForm({ strategy: "", emotion: "", notes: "" });
  };

  const saveTradeEdit = async () => {
    if (!editingTrade) return;

    setSavingEdit(true);
    setError("");

    try {
      await api.put(`/api/trades/${editingTrade.id}`, {
        strategy: editForm.strategy || null,
        emotion: editForm.emotion || null,
        notes: editForm.notes || null,
      });

      setTrades((prev) =>
        prev.map((trade) =>
          trade.id === editingTrade.id
            ? {
                ...trade,
                strategy: editForm.strategy,
                emotion: editForm.emotion,
                notes: editForm.notes,
              }
            : trade
        )
      );

      closeEditor();
    } catch (err) {
      console.error("Error updating trade:", err);
      setError(getApiErrorMessage(err, "Unable to update trade tags. Please try again."));
    } finally {
      setSavingEdit(false);
    }
  };

  const totalPnL = trades.reduce((sum, trade) => sum + trade.profit, 0);
  const wins = trades.filter((trade) => trade.profit > 0).length;
  const winRate = trades.length ? (wins / trades.length) * 100 : 0;

  if (isShellLoading) {
    return <LoadingState label="Loading trade workspace..." />;
  }

  if (!hasAccounts && !hasTrades) {
    return (
      <EmptyState
        title="No synced trade accounts yet"
        description="Install the desktop sync agent on the MT5 machine. After the first successful upload, this table will populate automatically."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trades"
        description="Review synced trades, confirm account scope, and add strategy or psychology notes for cleaner analysis."
      />

      <Toolbar>
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
          {loading ? "Refreshing trades..." : `${total} trades in this view`}
        </div>
      </Toolbar>

      {error && (
        <div className="rounded-[22px] border border-rose-400/18 bg-rose-400/12 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}

      {syncWarning && (
        <div className="rounded-[22px] border border-amber-300/18 bg-amber-300/12 px-4 py-3 text-sm text-amber-100">
          {syncWarning}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Page PnL"
          value={`$${totalPnL.toFixed(2)}`}
          helper="Net profit for the currently visible page of trades."
          tone={totalPnL >= 0 ? "success" : "danger"}
        />
        <MetricCard label="Total Trades" value={String(total)} helper="Count returned from the backend for the selected filters." />
        <MetricCard label="Win Rate" value={`${winRate.toFixed(1)}%`} helper="Win percentage across the currently visible trade slice." />
      </div>

      <Panel
        title="Trade History"
        description="Data is paginated from the backend. Analytics calculations remain backend-computed."
        actions={
          totalPages > 1 ? (
            <PaginationControls
              page={page}
              totalPages={totalPages}
              goToPage={goToPage}
              includeEdges
            />
          ) : null
        }
        className="overflow-hidden"
      >
        {loading ? (
          <LoadingState label="Loading trades..." />
        ) : trades.length === 0 ? (
          <EmptyState
            title="No trades found"
            description="No trades match the selected account and period yet. Refresh after the desktop agent uploads or adjust the filters."
            actions={
              <Button
                onClick={() => {
                  hasSynced.current = false;
                  loadTrades(page, selectedAccount, periodDays);
                }}
              >
                Refresh
              </Button>
            }
          />
        ) : (
          <>
            <div className="-mx-5 -my-5 max-h-[68vh] overflow-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-950/96 text-xs font-medium uppercase tracking-[0.18em] text-slate-400 shadow-[0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                  <tr>
                    <th className="px-5 py-3">Symbol</th>
                    <th className="px-5 py-3 text-right">PnL</th>
                    <th className="px-5 py-3 text-right">Entry</th>
                    <th className="px-5 py-3 text-right">Exit</th>
                    <th className="px-5 py-3">Opened</th>
                    <th className="px-5 py-3">Account</th>
                    <th className="px-5 py-3">Strategy</th>
                    <th className="px-5 py-3">Emotion</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/8">
                  {trades.map((trade) => (
                    <tr key={trade.ticket} className="transition duration-200 hover:bg-white/[0.035]">
                      <td className="px-5 py-3">
                        <div className="font-medium text-white">{trade.symbol}</div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          {trade.trade_type || "unknown"} / #{trade.ticket}
                        </div>
                      </td>
                      <td
                        className={[
                          "px-5 py-3 text-right font-semibold tabular-nums",
                          trade.profit >= 0 ? "text-emerald-300" : "text-rose-300",
                        ].join(" ")}
                      >
                        ${trade.profit.toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-300">
                        {trade.entry_price}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-300">
                        {trade.exit_price}
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-slate-300">{formatDate(trade.open_time)}</div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          Duration {trade.duration || 0}s
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-slate-300">
                          {trade.account_name || trade.account_id || "-"}
                        </div>
                        {trade.account_id && (
                          <div className="mt-0.5 text-xs text-slate-500">
                            {trade.account_id}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {trade.strategy ? (
                          <StatusBadge>{trade.strategy}</StatusBadge>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {trade.emotion ? (
                          <StatusBadge tone="info">{trade.emotion}</StatusBadge>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button onClick={() => openEditor(trade)} variant="ghost">
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="-mx-5 -mb-5 mt-5 flex flex-col gap-3 border-t border-white/8 px-5 py-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Showing {trades.length} of {total} trades
                </span>
                <PaginationControls
                  page={page}
                  totalPages={totalPages}
                  goToPage={goToPage}
                />
              </div>
            )}
          </>
        )}
      </Panel>

      {editingTrade && (
        <TradeEditModal
          trade={editingTrade}
          form={editForm}
          saving={savingEdit}
          setForm={setEditForm}
          onClose={closeEditor}
          onSave={saveTradeEdit}
        />
      )}
    </div>
  );
}

function PaginationControls({
  page,
  totalPages,
  goToPage,
  includeEdges = false,
}: {
  page: number;
  totalPages: number;
  goToPage: (page: number) => void;
  includeEdges?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-slate-300">
      {includeEdges && (
        <Button onClick={() => goToPage(0)} disabled={page === 0}>
          First
        </Button>
      )}
      <Button onClick={() => goToPage(page - 1)} disabled={page === 0}>
        Prev
      </Button>
      <span className="text-slate-400">
        Page {totalPages > 0 ? page + 1 : 0} of {totalPages}
      </span>
      <Button onClick={() => goToPage(page + 1)} disabled={page >= totalPages - 1}>
        Next
      </Button>
      {includeEdges && (
        <Button
          onClick={() => goToPage(totalPages - 1)}
          disabled={page >= totalPages - 1}
        >
          Last
        </Button>
      )}
    </div>
  );
}

function TradeEditModal({
  trade,
  form,
  saving,
  setForm,
  onClose,
  onSave,
}: {
  trade: Trade;
  form: EditForm;
  saving: boolean;
  setForm: (form: EditForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/72 px-4 py-6 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.92))] shadow-[0_26px_60px_rgba(2,6,23,0.48)]">
        <div className="border-b border-white/8 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">
                Edit Trade Tags
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                {trade.symbol} / #{trade.ticket} / ${trade.profit.toFixed(2)}
              </p>
            </div>
            <Button onClick={onClose} disabled={saving} variant="ghost">
              Close
            </Button>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5">
          <Field label="Strategy">
            <TextInput
              value={form.strategy}
              onChange={(event) =>
                setForm({ ...form, strategy: event.target.value })
              }
              placeholder="e.g. Breakout, Reversal, London open"
              className="w-full"
            />
          </Field>

          <Field label="Emotion">
            <TextInput
              value={form.emotion}
              onChange={(event) =>
                setForm({ ...form, emotion: event.target.value })
              }
              placeholder="e.g. Calm, FOMO, Impatient"
              className="w-full"
            />
          </Field>

          <Field label="Notes">
            <TextArea
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="Add context, setup quality, mistakes, or follow-up notes."
              rows={4}
              className="w-full resize-none"
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/8 px-5 py-4">
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving} variant="primary">
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}
