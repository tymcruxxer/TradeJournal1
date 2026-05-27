import { useEffect, useState } from "react";
import AnalyticsPage from "./AnalyticsPage";
import AuthPage from "./AuthPage";
import DashboardPage from "./DashboardPage";
import SettingsPage from "./SettingsPage";
import TradesPage from "./TradesPage";
import {
  AUTH_SESSION_EXPIRED_EVENT,
  api,
  clearAuthToken,
  getApiErrorMessage,
  getAuthToken,
  getAuthUser,
} from "./api";
import Layout from "./components/Layout";
import { Button, EmptyState, LoadingState } from "./components/ui";
import { WorkspaceProvider, useWorkspace } from "./context/WorkspaceContext";
import type { AccountInfo, ApiKeyResponse, AuthUser, PaginatedTradesResponse } from "./types";

function AppContent() {
  const { selectedAccount, setSelectedAccount } = useWorkspace();
  const [token, setToken] = useState(getAuthToken());
  const [user, setUser] = useState<AuthUser | null>(getAuthUser());
  const [activePage, setActivePage] = useState("dashboard");
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [shellLoading, setShellLoading] = useState(true);
  const [shellError, setShellError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [tradeCount, setTradeCount] = useState(0);

  const logout = () => {
    clearAuthToken();
    setToken(null);
    setUser(null);
    setAccounts([]);
    setSelectedAccount("");
    setApiKey(null);
    setShellError("");
  };

  const loadShellState = async (currentSelectedAccount: string) => {
    setShellLoading(true);
    setShellError("");

    try {
      const [accountsRes, tradesRes, apiKeyRes] = await Promise.all([
        api.get<AccountInfo[]>("/api/trades/accounts"),
        api.get<PaginatedTradesResponse>("/api/trades?limit=1"),
        api.get<ApiKeyResponse>("/api/auth/api-key"),
      ]);

      const nextAccounts = accountsRes.data;
      setAccounts(nextAccounts);
      setTradeCount(tradesRes.data.total);
      setApiKey(apiKeyRes.data.api_key);

      if (nextAccounts.length === 1) {
        setSelectedAccount(nextAccounts[0].account_id);
      } else if (
        currentSelectedAccount &&
        !nextAccounts.some((account) => account.account_id === currentSelectedAccount)
      ) {
        setSelectedAccount("");
      }
    } catch (err) {
      console.error("Error loading workspace state:", err);
      setShellError(getApiErrorMessage(err, "Unable to load your workspace."));
    } finally {
      setShellLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setShellLoading(false);
      return;
    }

    let cancelled = false;

    loadShellState(selectedAccount).catch((err) => {
      if (!cancelled) {
        console.error("Error loading workspace state:", err);
        setShellError(getApiErrorMessage(err, "Unable to load your workspace."));
        setShellLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  // Poll for account discovery when in onboarding state (waiting for first upload)
  useEffect(() => {
    if (!token || accounts.length > 0 || tradeCount > 0) {
      return; // Stop polling once accounts/trades are discovered
    }

    const interval = setInterval(() => {
      loadShellState(selectedAccount).catch((err) => {
        console.debug("Polling for account discovery, check failed:", err);
      });
    }, 3000); // Poll every 3 seconds during onboarding

    return () => clearInterval(interval);
  }, [token, accounts.length, tradeCount, selectedAccount]);

  useEffect(() => {
    const handleExpiredSession = () => {
      setToken(null);
      setUser(null);
      setAccounts([]);
      setSelectedAccount("");
      setApiKey(null);
      setShellError("");
      setAuthNotice("Your session expired. Sign in again to continue.");
    };

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleExpiredSession);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleExpiredSession);
  }, [setSelectedAccount]);

  if (!token) {
    return (
      <AuthPage
        notice={authNotice}
        onAuthenticated={(nextToken) => {
          setAuthNotice("");
          setToken(nextToken);
          setUser(getAuthUser());
        }}
      />
    );
  }

  const hasAccounts = accounts.length > 0;
  const hasTrades = tradeCount > 0;
  const isOnboarding = !shellLoading && !hasAccounts && !hasTrades;

  return (
    <Layout
      activePage={activePage}
      onNavigate={setActivePage}
      onLogout={logout}
      accounts={accounts}
      selectedAccount={selectedAccount}
      onSelectAccount={setSelectedAccount}
      user={user}
      isOnboarding={isOnboarding}
    >
      {(page) => {
        switch (page) {
          case "dashboard":
            if (shellError) {
              return (
                <EmptyState
                  title="Workspace unavailable"
                  description={shellError}
                  actions={
                    <Button variant="primary" onClick={() => void loadShellState(selectedAccount)}>
                      Retry connection
                    </Button>
                  }
                />
              );
            }

            return (
              <DashboardPage
                selectedAccount={selectedAccount}
                hasAccounts={hasAccounts}
                hasTrades={hasTrades}
                isShellLoading={shellLoading}
                apiKey={apiKey}
                onOpenSettings={() => setActivePage("settings")}
                onRefreshWorkspace={() => loadShellState(selectedAccount)}
              />
            );

          case "trades":
            if (shellError) {
              return <LoadingOrShellError error={shellError} onRetry={() => void loadShellState(selectedAccount)} />;
            }

            return (
              <TradesPage
                selectedAccount={selectedAccount}
                hasAccounts={hasAccounts}
                hasTrades={hasTrades}
                isShellLoading={shellLoading}
                onRefreshWorkspace={() => loadShellState(selectedAccount)}
              />
            );

          case "analytics":
            if (shellError) {
              return <LoadingOrShellError error={shellError} onRetry={() => void loadShellState(selectedAccount)} />;
            }

            return (
              <AnalyticsPage
                selectedAccount={selectedAccount}
                hasAccounts={hasAccounts}
                hasTrades={hasTrades}
                isShellLoading={shellLoading}
              />
            );

          case "settings":
            if (shellLoading) {
              return <LoadingState label="Preparing settings..." />;
            }

            return <SettingsPage apiKey={apiKey} onApiKeyChange={setApiKey} />;

          default:
            return null;
        }
      }}
    </Layout>
  );
}

function LoadingOrShellError({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <EmptyState
      title="Connection needs attention"
      description={error}
      actions={
        <Button variant="primary" onClick={onRetry}>
          Retry
        </Button>
      }
    />
  );
}

function App() {
  return (
    <WorkspaceProvider>
      <AppContent />
    </WorkspaceProvider>
  );
}

export default App;
