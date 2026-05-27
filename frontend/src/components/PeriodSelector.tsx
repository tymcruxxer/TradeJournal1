import React from "react";
import { useWorkspace, type PeriodPreset } from "../context/WorkspaceContext";

const PERIOD_PRESETS: { label: string; value: PeriodPreset }[] = [
  { label: "7D", value: "7D" },
  { label: "30D", value: "30D" },
  { label: "90D", value: "90D" },
  { label: "1Y", value: "1Y" },
  { label: "ALL", value: "ALL" },
];

export const PeriodSelector: React.FC = () => {
  const { selectedPeriod, setSelectedPeriod } = useWorkspace();

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-slate-400">Period:</span>
      <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
        {PERIOD_PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => setSelectedPeriod(preset.value)}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              selectedPeriod === preset.value
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
};
