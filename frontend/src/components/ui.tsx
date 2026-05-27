import type { ReactNode } from "react";
import { ResponsiveContainer } from "recharts";

type Tone = "neutral" | "success" | "danger" | "warning" | "info";

const toneClasses: Record<Tone, string> = {
  neutral:
    "border border-white/10 bg-white/[0.06] text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ring-1 ring-white/8",
  success:
    "border border-emerald-400/20 bg-emerald-400/12 text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.14)] ring-1 ring-emerald-300/10",
  danger:
    "border border-rose-400/20 bg-rose-400/12 text-rose-200 shadow-[0_0_18px_rgba(244,63,94,0.12)] ring-1 ring-rose-300/10",
  warning:
    "border border-amber-300/20 bg-amber-300/12 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.12)] ring-1 ring-amber-200/10",
  info:
    "border border-cyan-300/20 bg-cyan-300/12 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.12)] ring-1 ring-cyan-200/10",
};

const fieldClass =
  "h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-100 outline-none transition duration-200 placeholder:text-slate-500 focus:border-cyan-300/35 focus:bg-white/[0.07] focus:ring-4 focus:ring-cyan-300/10";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-cyan-200/70">
          Trading Intelligence
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-[0.95rem]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "group relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.92))] shadow-[0_18px_50px_rgba(2,6,23,0.45)] before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.1),transparent_26%)] before:opacity-80",
        className,
      ].join(" ")}
    >
      {(title || description || actions) && (
        <div className="relative flex flex-col gap-3 border-b border-white/8 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title && (
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200/88">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="relative p-6">
        {children}
      </div>
    </section>
  );
}

export function MetricCard({
  label,
  value,
  helper,
  tone = "neutral",
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: Tone;
}) {
  const valueTone =
    tone === "success"
      ? "text-emerald-300"
      : tone === "danger"
        ? "text-rose-300"
        : tone === "warning"
          ? "text-amber-200"
          : tone === "info"
            ? "text-cyan-200"
            : "text-white";

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.82))] p-5 shadow-[0_16px_40px_rgba(2,6,23,0.34)] transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/18 hover:shadow-[0_18px_46px_rgba(8,145,178,0.16)]">
      <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/45 to-transparent" />
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-400">
        {label}
      </p>
      <p className={`mt-4 text-3xl font-semibold tracking-[-0.04em] tabular-nums ${valueTone}`}>
        {value}
      </p>
      {helper && <p className="mt-2 text-sm leading-6 text-slate-400">{helper}</p>}
    </div>
  );
}

export function ChartPanel({
  title,
  description,
  children,
  height = 280,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  height?: number;
}) {
  return (
    <Panel title={title} description={description} className="min-h-full">
      <div className="w-full rounded-[22px] border border-white/8 bg-slate-950/35 p-3" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_14px_34px_rgba(2,6,23,0.2)] backdrop-blur-xl sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-[28px] border border-dashed border-white/12 bg-white/[0.04] px-6 py-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/16 bg-cyan-300/10 text-cyan-100 shadow-[0_0_26px_rgba(34,211,238,0.14)]">
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M4.75 12h14.5m-7.25-7.25L19.25 12 12 19.25" />
        </svg>
      </div>
      <h3 className="text-base font-semibold tracking-[-0.02em] text-white">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">{description}</p>
      )}
      {actions && <div className="mt-4">{actions}</div>}
    </div>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="space-y-5 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_40px_rgba(2,6,23,0.22)]">
      <div className="h-5 w-40 animate-pulse rounded-full bg-white/10" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-28 animate-pulse rounded-[24px] border border-white/8 bg-white/[0.05]"
          />
        ))}
      </div>
      <div className="h-52 animate-pulse rounded-[24px] border border-white/8 bg-white/[0.04]" />
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
        toneClasses[tone],
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "secondary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  const variants = {
    primary:
      "border-cyan-300/30 bg-[linear-gradient(135deg,rgba(34,211,238,0.22),rgba(59,130,246,0.18))] text-white shadow-[0_10px_30px_rgba(34,211,238,0.18)] hover:border-cyan-200/45 hover:bg-[linear-gradient(135deg,rgba(34,211,238,0.3),rgba(59,130,246,0.24))]",
    secondary:
      "border-white/10 bg-white/[0.04] text-slate-100 hover:border-white/15 hover:bg-white/[0.08] hover:text-white",
    ghost:
      "border-transparent bg-transparent text-slate-300 hover:bg-white/[0.06] hover:text-white",
  };

  return (
    <button
      className={[
        "inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-medium transition duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

export function Select({
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={[fieldClass, "appearance-none pr-10", className].join(" ")}
      {...props}
    />
  );
}

export function TextInput({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={[fieldClass, className].join(" ")} {...props} />;
}

export function TextArea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={[
        "min-h-[120px] rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-100 outline-none transition duration-200 placeholder:text-slate-500 focus:border-cyan-300/35 focus:bg-white/[0.07] focus:ring-4 focus:ring-cyan-300/10",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
