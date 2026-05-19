"use client";
import { useCallback, useState } from "react";
import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { motion } from "framer-motion";
import { Activity, Users, UserCircle, MessageSquare, Settings, RefreshCw, Coins } from "lucide-react";
import { StatusDot } from "@/components/ui/StatusBadge";
import { SuccessRateCircle } from "@/components/admin/SuccessRateCircle";
import { useSettings } from "@/lib/settings-context";

interface HealthCheck {
  name: string;
  status: "connected" | "disconnected";
  detail?: string;
}

interface LogEntry {
  id: string;
  status: string;
  created_at: string;
  error_message?: string | null;
  model_used?: string | null;
  communities?: { name: string; slug: string } | null;
}

interface DashboardContentProps {
  healthChecks: HealthCheck[];
  subCount: number;
  personaCount: number;
  threadCount: number;
  recentLogs: LogEntry[];
  stats: {
    success: number;
    failed: number;
    skipped: number;
  };
  dayStats: {
    success: number;
    failed: number;
    skipped: number;
  };
  hourStats: {
    success: number;
    failed: number;
    skipped: number;
  };
  medianTokens: number;
}

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const btnCls = "px-3 py-1.5 text-xs rounded-lg border border-border/60 transition-colors";

export function DashboardContent({
  healthChecks,
  subCount,
  personaCount,
  threadCount,
  recentLogs,
  dayStats,
  hourStats,
  medianTokens,
}: DashboardContentProps) {
  const { openSettings } = useSettings();
  const router = useRouter();
  const handleRefresh = useCallback(() => { router.refresh(); }, [router]);
  const [successGranularity, setSuccessGranularity] = useState<"day" | "hour">("day");
  const activeSuccessStats = successGranularity === "day" ? dayStats : hourStats;
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {healthChecks.length > 0 && (
        <motion.section variants={itemVariants}>
          <div className="rounded-2xl border border-border/40 bg-surface shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-border/20 bg-background/30">
              <h2 className="text-sm font-semibold text-foreground/90 uppercase tracking-wider">System Health</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/20">
              {healthChecks.map((check) => (
                <div
                  key={check.name}
                  className="px-4 sm:px-6 py-4 sm:py-5 flex items-center gap-3 sm:gap-4 hover:bg-surface-hover/30 transition-colors"
                >
                  <div className="relative">
                    {check.status === "connected" ? (
                      <div className="size-2.5 rounded-full bg-success shadow-[0_0_8px_rgba(var(--success-rgb),0.4)]" />
                    ) : (
                      <div className="size-2.5 rounded-full bg-error" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{check.name}</p>
                    {check.name === "AI API" && check.status === "disconnected" ? (
                      <button
                        onClick={openSettings}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-accent hover:bg-accent/90 px-3 py-1.5 rounded-lg transition-all shadow-sm"
                      >
                        <Settings className="size-3.5" />
                        Configure
                      </button>
                    ) : (
                      <p className="text-xs text-muted/90 mt-0.5 truncate">
                        {check.status === "connected" ? "Operational" : "Offline"}
                        {check.detail && <span className="text-muted/60"> &middot; {check.detail}</span>}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8"
        variants={containerVariants}
      >
        <StatCard variants={itemVariants} icon={Users} label="Communities" value={subCount} />
        <StatCard variants={itemVariants} icon={UserCircle} label="AI Personas" value={personaCount} />
        <StatCard variants={itemVariants} icon={MessageSquare} label="Threads" value={threadCount} />
        <StatCard variants={itemVariants} icon={Coins} label="Median Tokens" value={medianTokens} />
      </motion.div>

      <motion.section variants={itemVariants}>
        <div className="grid grid-cols-1 items-start lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
          {/* Recent Activity List */}
          <div className="lg:col-span-3 rounded-2xl border border-border/40 bg-surface shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 sm:px-6 py-4 border-b border-border/20 flex items-center justify-between bg-background/30">
              <h2 className="text-sm font-semibold text-foreground/90 uppercase tracking-wider">Recent Activity</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted/80 font-medium bg-border/20 px-2 py-0.5 rounded-full">live</span>
                <button
                  onClick={handleRefresh}
                  className="p-1.5 rounded-lg hover:bg-border/20 text-muted/70 hover:text-foreground transition-all"
                  title="Refresh"
                >
                  <RefreshCw className="size-3.5" />
                </button>
              </div>
            </div>
            <div className="divide-y divide-border/10 flex-1">
              {recentLogs.length ? (
                recentLogs.slice(0, 4).map((log) => (
                  <div key={log.id} className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 sm:gap-4 group hover:bg-surface-hover/20 transition-all">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative">
                        <StatusDot status={log.status} />
                        {log.status === "success" && (
                          <motion.div
                            className="absolute -inset-1 rounded-full bg-success/20 -z-10"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1.2, opacity: 1 }}
                            transition={{ repeat: Infinity, duration: 2, repeatType: "reverse" }}
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-foreground transition-colors">
                          {log.status === "success"
                            ? "New content generated"
                            : log.status === "skipped"
                              ? "Schedule skipped"
                              : "Pipeline error"}
                        </p>
                        <p className="text-xs text-muted/90 mt-1 truncate">
                          <span className="text-accent font-medium">{log.communities?.name ?? "System"}</span>
                          <span className="mx-2 text-muted/50">|</span>
                          {mounted
                            ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '--:--'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {log.status === "success" && (
                        <span className="text-xs font-mono text-muted/70 bg-border/10 px-1.5 py-0.5 rounded">
                          {log.model_used?.split('/').pop()}
                        </span>
                      )}
                      {log.error_message && (
                        <span className="text-xs text-error/90 bg-error/5 px-2 py-0.5 rounded border border-error/10 max-w-[80px] sm:max-w-[120px] truncate" title={log.error_message}>
                          {log.error_message}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 sm:px-6 py-8 sm:py-12 text-center">
                  <Activity className="size-8 mx-auto mb-3 text-muted/30" />
                  <p className="text-sm text-muted/80">No recent activity detected.</p>
                </div>
              )}
            </div>
          </div>

          {/* Success Rate Visual */}
          <div className="lg:col-span-2 rounded-2xl border border-border/40 bg-surface shadow-sm p-5 sm:p-6 flex flex-col gap-6 overflow-hidden">
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground/90 uppercase tracking-wider">Success Rate</h2>
              <div className="flex items-center gap-1 bg-background rounded-lg p-0.5 border border-border/40">
                {(["day", "hour"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setSuccessGranularity(g)}
                    className={`${btnCls} ${successGranularity === g
                        ? "bg-surface-hover border-accent/40 text-foreground"
                        : "bg-transparent border-transparent text-muted hover:text-foreground"
                      }`}
                  >
                    {g === "day" ? "Day" : "Hour"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex min-h-[260px] items-center justify-center">
              <SuccessRateCircle
                success={activeSuccessStats.success}
                failed={activeSuccessStats.failed}
                skipped={activeSuccessStats.skipped}
                size={180}
              />
            </div>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  variants,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  variants?: unknown;
}) {
  return (
    <motion.div
      variants={variants as typeof itemVariants}
      className="rounded-2xl border border-border/40 bg-surface p-5 sm:p-6 cursor-default"
    >
      <div className="flex items-center gap-5">
        <motion.div
          className="size-10 sm:size-12 rounded-xl bg-background flex items-center justify-center text-accent/60"
          whileHover={{ color: "var(--accent)" }}
          transition={{ duration: 0.2 }}
        >
          <Icon className="size-5" />
        </motion.div>
        <div>
          <p className="text-xs font-bold text-muted/80 tracking-[0.15em] uppercase">{label}</p>
          <p className="text-2xl sm:text-3xl font-light text-foreground mt-0.5">{value.toLocaleString("en-US")}</p>
        </div>
      </div>
    </motion.div>
  );
}
