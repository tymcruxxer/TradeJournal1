import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { api, getApiErrorMessage, setAuthSession } from "./api";
import { Button, Panel, StatusBadge, TextInput } from "./components/ui";
import type { AuthUser } from "./types";

type AuthMode = "login" | "signup";

type AuthResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

type Props = {
  notice?: string;
  onAuthenticated: (token: string) => void;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthPage({ notice, onAuthenticated }: Props) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const isSignup = mode === "signup";
  const normalizedEmail = email.trim().toLowerCase();

  const validation = useMemo(() => {
    const next: Record<string, string> = {};

    if (!normalizedEmail) {
      next.email = "Email is required.";
    } else if (!emailPattern.test(normalizedEmail)) {
      next.email = "Enter a valid business email address.";
    }

    if (!password) {
      next.password = "Password is required.";
    } else if (isSignup && password.length < 8) {
      next.password = "Use at least 8 characters.";
    } else if (isSignup && !/[A-Za-z]/.test(password)) {
      next.password = "Include at least one letter.";
    } else if (isSignup && !/\d/.test(password)) {
      next.password = "Include at least one number.";
    }

    if (isSignup && !confirmPassword) {
      next.confirmPassword = "Confirm your password.";
    } else if (isSignup && confirmPassword !== password) {
      next.confirmPassword = "Passwords do not match.";
    }

    return next;
  }, [confirmPassword, isSignup, normalizedEmail, password]);

  const isValid = Object.keys(validation).length === 0;

  const markTouched = (field: string) => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!isValid) {
      setTouched({ email: true, password: true, confirmPassword: true });
      return;
    }

    setLoading(true);

    try {
      const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/login";
      const res = await api.post<AuthResponse>(endpoint, {
        email: normalizedEmail,
        password,
      });
      setAuthSession(res.data.access_token, res.data.user);
      onAuthenticated(res.data.access_token);
    } catch (err) {
      const message = getApiErrorMessage(err, isSignup ? "Unable to create your account." : "Unable to sign in.");
      setError(
        message.includes("already registered")
          ? "An account already exists for this email. Switch to sign in to continue."
          : message
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError("");
    setTouched({});
    setConfirmPassword("");
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.2),transparent_26%),radial-gradient(circle_at_82%_12%,rgba(59,130,246,0.16),transparent_22%),linear-gradient(180deg,#08101d_0%,#020617_48%,#02030a_100%)]" />
      <div className="relative mx-auto grid min-h-[calc(100svh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-8">
          <div className="inline-flex rounded-full border border-cyan-300/18 bg-cyan-300/10 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-cyan-100">
            Premium Trading Intelligence
          </div>
          <div className="max-w-2xl space-y-5">
            <h1 className="text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl">
              Account-centric analytics for serious MT5 traders.
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              TradeJournal combines secure account onboarding, local sync, and backend-computed analytics into a focused trading workspace.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Secure Sync", "Local desktop agent keeps MT5 access on your machine while the web app stays account-aware."],
              ["AI Signals", "Rule-based insight cards and recommendations surface behavior and risk patterns fast."],
              ["Portfolio Clarity", "Track multiple accounts with clean switching, performance context, and analytical depth."],
            ].map(([title, description]) => (
              <div key={title} className="rounded-[24px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_18px_36px_rgba(2,6,23,0.22)]">
                <p className="text-sm font-semibold tracking-[-0.02em] text-white">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <Panel className="mx-auto w-full max-w-md">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <StatusBadge tone={isSignup ? "success" : "info"}>
                {isSignup ? "New workspace" : "Existing client"}
              </StatusBadge>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">
                {isSignup ? "Set up your workspace" : "Enter your dashboard"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {isSignup ? "Create your TradeJournal account and provision your sync-ready workspace." : "Sign in to resume onboarding, account switching, and analytics review."}
              </p>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2 rounded-[20px] border border-white/10 bg-slate-950/40 p-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={[
                "rounded-2xl px-3 py-2 text-sm font-semibold transition",
                !isSignup
                  ? "bg-cyan-300/16 text-white shadow-[0_0_18px_rgba(34,211,238,0.16)]"
                  : "text-slate-400 hover:text-white",
              ].join(" ")}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={[
                "rounded-2xl px-3 py-2 text-sm font-semibold transition",
                isSignup
                  ? "bg-emerald-300/14 text-white shadow-[0_0_18px_rgba(16,185,129,0.14)]"
                  : "text-slate-400 hover:text-white",
              ].join(" ")}
            >
              Create account
            </button>
          </div>

          {notice && (
            <p className="mb-4 rounded-[20px] border border-amber-300/18 bg-amber-300/12 px-4 py-3 text-sm text-amber-100">
              {notice}
            </p>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Email
              </label>
              <TextInput
                type="email"
                value={email}
                onBlur={() => markTouched("email")}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                autoComplete="email"
                placeholder="client@example.com"
                required
                aria-invalid={Boolean(touched.email && validation.email)}
              />
              {touched.email && validation.email && (
                <p className="mt-2 text-xs text-rose-200">{validation.email}</p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Password
              </label>
              <TextInput
                type="password"
                value={password}
                onBlur={() => markTouched("password")}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                autoComplete={isSignup ? "new-password" : "current-password"}
                placeholder={isSignup ? "8+ chars, letters and numbers" : "Your password"}
                minLength={isSignup ? 8 : undefined}
                required
                aria-invalid={Boolean(touched.password && validation.password)}
              />
              {touched.password && validation.password && (
                <p className="mt-2 text-xs text-rose-200">{validation.password}</p>
              )}
            </div>

            {isSignup && (
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Confirm Password
                </label>
                <TextInput
                  type="password"
                  value={confirmPassword}
                  onBlur={() => markTouched("confirmPassword")}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setError("");
                  }}
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  required
                  aria-invalid={Boolean(touched.confirmPassword && validation.confirmPassword)}
                />
                {touched.confirmPassword && validation.confirmPassword && (
                  <p className="mt-2 text-xs text-rose-200">{validation.confirmPassword}</p>
                )}
              </div>
            )}

            {error && (
              <p className="rounded-[20px] border border-rose-400/18 bg-rose-400/12 px-4 py-3 text-sm text-rose-100">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading || !isValid}
              variant="primary"
              className="w-full py-3"
            >
              {loading ? "Please wait..." : isSignup ? "Create account" : "Sign in"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => {
              switchMode(isSignup ? "login" : "signup");
            }}
            className="mt-5 w-full text-center text-sm font-medium text-cyan-200 transition hover:text-white"
          >
            {isSignup ? "Already have an account? Sign in" : "Need an account? Sign up"}
          </button>
        </Panel>
      </div>
    </div>
  );
}
