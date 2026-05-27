import type { AccountInfo } from "../types";
import { Button, Select, StatusBadge } from "./ui";
import { PeriodSelector } from "./PeriodSelector";

type Props = {
  title: string;
  onLogout: () => void;
  accounts: AccountInfo[];
  selectedAccount: string;
  onSelectAccount: (accountId: string) => void;
  isOnboarding: boolean;
};

export default function Header({
  title,
  onLogout,
  accounts,
  selectedAccount,
  onSelectAccount,
  isOnboarding,
}: Props) {
  const selected = accounts.find((account) => account.account_id === selectedAccount);

  return (
    <header className="relative z-10 border-b border-white/8 bg-slate-950/45 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-cyan-200/70">
            Workspace
          </p>
          <h1 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">{title}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isOnboarding ? (
            <StatusBadge tone="warning">Setup pending</StatusBadge>
          ) : accounts.length > 0 ? (
            <div className="flex flex-wrap items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.04] px-3 py-2 shadow-[0_12px_24px_rgba(2,6,23,0.16)]">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Account scope
              </span>
              <Select
                value={selectedAccount}
                onChange={(event) => onSelectAccount(event.target.value)}
                className="min-w-[150px] border-none bg-transparent px-0 py-0 text-sm text-slate-100 shadow-none focus:ring-0 sm:min-w-[220px]"
              >
                <option value="">All accounts</option>
                {accounts.map((account) => (
                  <option key={account.account_id} value={account.account_id}>
                    {account.account_name || account.account_id}
                  </option>
                ))}
              </Select>
              {selected && (
                <StatusBadge tone="info">{selected.account_name || selected.account_id}</StatusBadge>
              )}
            </div>
          ) : null}

          <PeriodSelector />

          {!isOnboarding && <StatusBadge tone="success">Workspace ready</StatusBadge>}

          <Button onClick={onLogout} className="text-xs">
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}
