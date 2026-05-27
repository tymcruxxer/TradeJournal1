import { useState } from "react";

import type { AuthUser } from "../types";

type NavItem = {
  label: string;
  icon: string;
  id: string;
};

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { id: "trades", label: "Trades", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { id: "analytics", label: "Analytics", icon: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { id: "settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

type Props = {
  activeId: string;
  onNavigate: (id: string) => void;
  user: AuthUser | null;
};

export default function Sidebar({ activeId, onNavigate, user }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = user?.email?.charAt(0).toUpperCase() || "T";

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed left-4 top-4 z-50 rounded-2xl border border-white/12 bg-slate-950/85 p-2.5 text-slate-100 shadow-[0_18px_44px_rgba(2,6,23,0.4)] backdrop-blur-xl md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle sidebar"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {mobileOpen
            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          }
        </svg>
      </button>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed top-0 left-0 z-40 flex h-full w-64 flex-col border-r border-white/8 bg-[linear-gradient(180deg,rgba(2,6,23,0.96),rgba(7,15,28,0.98))] shadow-[0_22px_54px_rgba(2,6,23,0.5)] transition-transform duration-200",
          "md:translate-x-0 md:static md:flex",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Logo */}
        <div className="border-b border-white/8 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-[linear-gradient(135deg,rgba(34,211,238,0.22),rgba(59,130,246,0.18))] shadow-[0_12px_28px_rgba(34,211,238,0.18)]">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-cyan-200/70">
                TradeJournal
              </p>
              <span className="mt-1 block text-sm font-semibold tracking-[-0.03em] text-white">
                Analytical Workspace
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-4 py-5">
          {NAV_ITEMS.map((item) => {
            const active = activeId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
                className={[
                  "group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl px-4 py-3 text-sm font-medium transition duration-200",
                  active
                    ? "border border-cyan-300/14 bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(59,130,246,0.12))] text-white shadow-[0_12px_26px_rgba(14,165,233,0.18)]"
                    : "border border-transparent text-slate-400 hover:border-white/8 hover:bg-white/[0.05] hover:text-white",
                ].join(" ")}
              >
                <svg
                  className={[
                    "h-[18px] w-[18px] flex-shrink-0",
                    active ? "text-cyan-200" : "text-slate-500 group-hover:text-slate-300",
                  ].join(" ")}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={item.icon} />
                </svg>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/8 px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-xs font-semibold text-slate-100">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Workspace</p>
              <p className="truncate text-sm text-slate-200">{user?.email || "Signed in trader"}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
