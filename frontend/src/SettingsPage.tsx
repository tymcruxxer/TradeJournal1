import { useEffect, useState } from "react";
import { api, getApiErrorMessage, getDesktopAgentDownloadUrl } from "./api";
import { getSettings, saveSettings } from "./settings";
import type { ApiKeyResponse } from "./types";
import { Button, PageHeader, Panel, Select, StatusBadge } from "./components/ui";

type Props = {
  apiKey: string | null;
  onApiKeyChange: (apiKey: string | null) => void;
};

export default function SettingsPage({ apiKey, onApiKeyChange }: Props) {
  const [settings, setSettings] = useState(getSettings());
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [apiKeyError, setApiKeyError] = useState("");
  const [apiKeyLoading, setApiKeyLoading] = useState(false);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const loadApiKey = async () => {
    setApiKeyLoading(true);
    setApiKeyError("");

    try {
      const res = await api.get<ApiKeyResponse>("/api/auth/api-key");
      onApiKeyChange(res.data.api_key);
    } catch (err) {
      console.error("Error loading API key:", err);
      setApiKeyError(getApiErrorMessage(err, "Unable to load your desktop sync API key."));
    } finally {
      setApiKeyLoading(false);
    }
  };

  const regenerateApiKey = async () => {
    setApiKeyLoading(true);
    setApiKeyError("");

    try {
      const res = await api.post<ApiKeyResponse>("/api/auth/api-key/regenerate");
      onApiKeyChange(res.data.api_key);
      setRevealed(true);
    } catch (err) {
      console.error("Error regenerating API key:", err);
      setApiKeyError(getApiErrorMessage(err, "Unable to regenerate your API key right now."));
    } finally {
      setApiKeyLoading(false);
    }
  };

  const copyApiKey = async () => {
    if (!apiKey) {
      return;
    }

    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setApiKeyError("Clipboard copy is unavailable in this browser.");
    }
  };

  const maskedApiKey = apiKey ? `${apiKey.slice(0, 8)}........${apiKey.slice(-6)}` : "No API key available";
  const startDesktopAgentDownload = () => {
    window.location.assign(getDesktopAgentDownloadUrl());
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage desktop sync access, API-key controls, and workspace preferences."
      />

      <Panel
        title="Desktop Sync Setup"
        description="Use this API key in the Windows sync agent. MT5 stays local while uploaded trades stay isolated to this workspace."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={startDesktopAgentDownload} variant="primary">
              Download Desktop Sync Agent
            </Button>
            <Button onClick={loadApiKey} disabled={apiKeyLoading}>Refresh key</Button>
            <Button onClick={regenerateApiKey} disabled={apiKeyLoading} variant="secondary">
              Regenerate key
            </Button>
          </div>
        }
      >
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[0.68rem] font-medium uppercase tracking-[0.24em] text-slate-400">Current API key</p>
                <StatusBadge tone={apiKey ? "success" : "warning"}>
                  {apiKey ? "Provisioned" : "Unavailable"}
                </StatusBadge>
              </div>
              <p className="mt-3 break-all font-mono text-sm text-slate-100">
                {revealed ? apiKey || "No API key available" : maskedApiKey}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={() => setRevealed((value) => !value)}>
                  {revealed ? "Hide key" : "Reveal key"}
                </Button>
                <Button onClick={copyApiKey} disabled={!apiKey} variant="primary">
                  {copied ? "Copied" : "Copy API key"}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["1. Download", "Run the Windows sync agent on the same machine as MetaTrader 5."],
                ["2. Authenticate", "Paste this API key into the setup window."],
                ["3. Connect", "Keep MT5 open while the agent reads closed trade history locally."],
                ["4. Review", "Return to the dashboard once accounts and trades appear."],
              ].map(([title, description]) => (
                <div key={title} className="rounded-[22px] border border-white/8 bg-slate-950/30 p-4">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
                </div>
              ))}
            </div>

            {apiKeyError && (
              <div className="rounded-[20px] border border-rose-400/18 bg-rose-400/12 px-4 py-3 text-sm text-rose-100">
                {apiKeyError}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm font-semibold text-white">After setup</p>
              <div className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
                <p>The agent discovers broker accounts locally and uploads closed trades through your API key.</p>
                <p>After the first upload, dashboard, trades, and analytics views become account-aware automatically.</p>
                <StatusBadge tone={apiKey ? "success" : "warning"}>
                  {apiKey ? "API key ready" : "Action required"}
                </StatusBadge>
              </div>
            </div>

            <div className="rounded-[24px] border border-cyan-300/12 bg-cyan-300/8 p-5">
              <p className="text-sm font-semibold text-cyan-50">Client setup note</p>
              <p className="mt-2 text-sm leading-6 text-cyan-50/80">
                The download button is ready for the packaged Windows agent. Use the same backend URL shown in your deployment notes during agent setup.
              </p>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Sync Preferences">
        <div className="divide-y divide-white/8">
          <div className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white">Auto Sync MT5</p>
              <p className="mt-1 text-xs text-slate-400">
                Request sync refreshes while using the dashboard.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={settings.autoSync}
                onChange={() =>
                  setSettings({ ...settings, autoSync: !settings.autoSync })
                }
                className="h-4 w-4 rounded border-white/20 bg-slate-950 text-cyan-300"
              />
              <StatusBadge tone={settings.autoSync ? "success" : "neutral"}>
                {settings.autoSync ? "Enabled" : "Disabled"}
              </StatusBadge>
            </label>
          </div>

          <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white">Sync Interval</p>
              <p className="mt-1 text-xs text-slate-400">
                How often the dashboard checks for fresh local MT5 data.
              </p>
            </div>
            <Select
              value={settings.syncInterval}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  syncInterval: Number(event.target.value),
                })
              }
            >
              <option value={30000}>30 seconds</option>
              <option value={60000}>1 minute</option>
              <option value={120000}>2 minutes</option>
            </Select>
          </div>

          <div className="flex flex-col gap-3 py-4 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white">
                Default Analytics Period
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Initial period used by trade and analytics views.
              </p>
            </div>
            <Select
              value={settings.defaultPeriod}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  defaultPeriod: Number(event.target.value),
                })
              }
            >
              <option value={7}>7 Days</option>
              <option value={30}>30 Days</option>
              <option value={90}>90 Days</option>
            </Select>
          </div>
        </div>
      </Panel>
    </div>
  );
}
