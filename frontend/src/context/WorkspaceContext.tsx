import React, { createContext, useContext, useState, useEffect } from "react";

export type PeriodPreset = "7D" | "30D" | "90D" | "1Y" | "ALL";

export interface SyncStatus {
  lastSync: Date | null;
  isSyncing: boolean;
  error: string | null;
  agentOnline: boolean;
  activeSyncAccount: string | null;
}

interface WorkspaceContextType {
  selectedAccount: string;
  setSelectedAccount: (accountId: string) => void;
  selectedPeriod: PeriodPreset;
  setSelectedPeriod: (period: PeriodPreset) => void;
  syncStatus: SyncStatus;
  setSyncStatus: (status: Partial<SyncStatus>) => void;
  updateLastSync: () => void;
  setSyncing: (syncing: boolean) => void;
  setSyncError: (error: string | null) => void;
  setAgentOnline: (online: boolean) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

interface WorkspaceProviderProps {
  children: React.ReactNode;
}

const DEFAULT_PERIOD: PeriodPreset = "30D";
const WORKSPACE_STORAGE_KEY = "tradejournal-workspace";

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({ children }) => {
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedPeriod, setSelectedPeriodState] = useState<PeriodPreset>(DEFAULT_PERIOD);
  const [syncStatus, setSyncStatusState] = useState<SyncStatus>({
    lastSync: null,
    isSyncing: false,
    error: null,
    agentOnline: false,
    activeSyncAccount: null,
  });

  // Load workspace state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (saved) {
        const { account = "", period = DEFAULT_PERIOD } = JSON.parse(saved);
        setSelectedAccount(account);
        setSelectedPeriodState(period);
      }
    } catch (err) {
      console.warn("Failed to load workspace state from localStorage:", err);
    }
  }, []);

  // Persist workspace state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(
        WORKSPACE_STORAGE_KEY,
        JSON.stringify({
          account: selectedAccount,
          period: selectedPeriod,
        })
      );
    } catch (err) {
      console.warn("Failed to save workspace state to localStorage:", err);
    }
  }, [selectedAccount, selectedPeriod]);

  const setSelectedPeriod = (period: PeriodPreset) => {
    setSelectedPeriodState(period);
  };

  const setSyncStatus = (partial: Partial<SyncStatus>) => {
    setSyncStatusState((prev) => ({ ...prev, ...partial }));
  };

  const updateLastSync = () => {
    setSyncStatusState((prev) => ({ ...prev, lastSync: new Date() }));
  };

  const setSyncing = (syncing: boolean) => {
    setSyncStatusState((prev) => ({ ...prev, isSyncing: syncing }));
  };

  const setSyncError = (error: string | null) => {
    setSyncStatusState((prev) => ({ ...prev, error }));
  };

  const setAgentOnline = (online: boolean) => {
    setSyncStatusState((prev) => ({ ...prev, agentOnline: online }));
  };

  const value: WorkspaceContextType = {
    selectedAccount,
    setSelectedAccount,
    selectedPeriod,
    setSelectedPeriod,
    syncStatus,
    setSyncStatus,
    updateLastSync,
    setSyncing,
    setSyncError,
    setAgentOnline,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
};
