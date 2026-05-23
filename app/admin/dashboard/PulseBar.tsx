"use client";

import { AlertTriangle, CheckCircle2, RefreshCw, Settings } from "lucide-react";

import { StatusDot } from "@/components/ui/StatusBadge";
import type { HealthCheck } from "@/app/admin/dashboard/types";

export function PulseBar({
  healthChecks,
  onRefresh,
  onOpenSettings,
}: {
  healthChecks: HealthCheck[];
  onRefresh: () => void;
  onOpenSettings: () => void;
}) {
  const healthy = healthChecks.every((check) => check.status === "connected");

  return (
    <section className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-center gap-2">
          {healthy ? (
            <CheckCircle2 className="size-4 shrink-0 text-success" />
          ) : (
            <AlertTriangle className="size-4 shrink-0 text-warning" />
          )}
          <span className="text-sm font-semibold tracking-wide text-foreground/85">
            {healthy ? "Systems nominal" : "Attention required"}
          </span>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
          {healthChecks.map((check) => (
            <div key={check.name} className="flex items-center gap-1.5">
              <StatusDot status={check.status === "connected" ? "success" : "failed"} />
              <span
                className={`truncate text-sm font-medium ${
                  check.status === "connected" ? "text-muted/75" : "text-error"
                }`}
                title={check.detail ?? check.name}
              >
                {check.name}
              </span>
              {check.name === "AI API" && check.status === "disconnected" && (
                <button
                  onClick={onOpenSettings}
                  className="ml-0.5 inline-flex size-5 items-center justify-center rounded text-accent/80 hover:text-accent"
                  title="Configure AI"
                >
                  <Settings className="size-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onRefresh}
        className="inline-flex h-8 w-fit items-center gap-1.5 rounded-md border border-border/25 px-3 text-sm font-medium text-muted/75 transition-all hover:border-border/40 hover:text-foreground"
      >
        <RefreshCw className="size-3.5" />
        Refresh
      </button>
    </section>
  );
}
