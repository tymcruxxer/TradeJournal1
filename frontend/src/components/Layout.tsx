import type { ReactNode } from "react";
import type { AccountInfo, AuthUser } from "../types";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { SyncStatusBar } from "./SyncStatusBar";

const PAGE_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  trades: "Trades",
  analytics: "Analytics",
  settings: "Settings",
};

type Props = {
  children: (activePage: string) => ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  accounts: AccountInfo[];
  selectedAccount: string;
  onSelectAccount: (accountId: string) => void;
  user: AuthUser | null;
  isOnboarding: boolean;
};

export default function Layout({
  children,
  activePage,
  onNavigate,
  onLogout,
  accounts,
  selectedAccount,
  onSelectAccount,
  user,
  isOnboarding,
}: Props) {
  return (
    <div className="relative flex h-screen overflow-hidden bg-transparent text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(34,211,238,0.16),transparent_22%),radial-gradient(circle_at_84%_4%,rgba(59,130,246,0.16),transparent_22%),radial-gradient(circle_at_70%_82%,rgba(14,165,233,0.08),transparent_18%)]" />
      <Sidebar activeId={activePage} onNavigate={onNavigate} user={user} />

      <div className="relative flex min-w-0 flex-1 flex-col md:ml-0">
        <SyncStatusBar />
        <Header
          title={PAGE_TITLES[activePage] ?? activePage}
          onLogout={onLogout}
          accounts={accounts}
          selectedAccount={selectedAccount}
          onSelectAccount={onSelectAccount}
          isOnboarding={isOnboarding}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px]">{children(activePage)}</div>
        </main>
      </div>
    </div>
  );
}
