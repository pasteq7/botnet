"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { BotNetIcon } from "@/components/ui/BotNetIcon";

type SetupStatus = {
  hasAdmin: boolean;
  setupConfigured: boolean;
  setupAvailable: boolean;
};

export function SetupForm() {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const tokenId = useId();

  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadStatus() {
      try {
        const token = new URLSearchParams(window.location.search).get("token");
        const res = await fetch("/api/setup/admin", { cache: "no-store" });
        const data = await res.json();

        if (!active) return;
        if (!res.ok) throw new Error(data?.error || "Unable to read setup status");

        if (data.hasAdmin) {
          router.replace("/login");
          router.refresh();
          return;
        }

        if (token) setSetupToken(token);
        setStatus(data);
      } catch (statusError) {
        if (!active) return;
        setError(statusError instanceof Error ? statusError.message : "Unable to read setup status");
      } finally {
        if (active) setChecking(false);
      }
    }

    loadStatus();

    return () => {
      active = false;
    };
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/setup/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, setupToken }),
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setError(data?.error || "Unable to create admin user");
      setLoading(false);
      return;
    }

    setSuccess("Admin user created. Redirecting to login...");
    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 900);
  };

  const disabledReason = status?.hasAdmin
    ? "Admin setup is locked because an admin user already exists."
    : status && !status.setupConfigured
      ? "Admin setup needs SETUP_SECRET in the server environment."
      : null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-accent/10 blur-2xl" />
            <BotNetIcon className="relative z-10 size-14 text-accent" />
          </div>
          <h1 className="mt-5 text-center text-2xl font-semibold tracking-tight text-foreground">
            First admin setup
          </h1>
          <p className="mt-2 text-center text-sm text-muted">
            Create the first protected admin account for this BotNet instance.
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-surface p-6 shadow-sm">
          {checking ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" />
              Checking setup status...
            </div>
          ) : disabledReason ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-warning/20 bg-warning/10 px-3.5 py-3">
              <KeyRound className="mt-0.5 size-4 shrink-0 text-warning" />
              <p className="text-sm text-foreground">{disabledReason}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor={emailId} className="mb-1.5 block text-sm font-medium text-foreground">
                  Email address
                </label>
                <input
                  id={emailId}
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@example.com"
                  className="block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition-all placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>

              <div>
                <label htmlFor={passwordId} className="mb-1.5 block text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <input
                    id={passwordId}
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 8 characters"
                    className="block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 pr-10 text-sm text-foreground transition-all placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted transition-colors hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor={tokenId} className="mb-1.5 block text-sm font-medium text-foreground">
                  Setup key
                </label>
                <input
                  id={tokenId}
                  name="setupToken"
                  type="password"
                  autoComplete="off"
                  required
                  value={setupToken}
                  onChange={(event) => setSetupToken(event.target.value)}
                  placeholder="SETUP_SECRET"
                  className="block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition-all placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex items-start gap-2.5 rounded-lg border border-error/20 bg-error/10 px-3.5 py-2.5"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-error" />
                  <p className="text-sm text-error">{error}</p>
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex items-start gap-2.5 rounded-lg border border-success/20 bg-success/10 px-3.5 py-2.5"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  <p className="text-sm text-success">{success}</p>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="relative flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3.5 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                {loading ? "Creating admin..." : "Create admin"}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
