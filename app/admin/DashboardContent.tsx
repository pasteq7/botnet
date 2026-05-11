"use client";

import { motion } from "framer-motion";
import { Activity, Users, UserCircle, MessageSquare, CheckCircle, XCircle } from "lucide-react";

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

export function DashboardContent({
  healthChecks,
  subCount,
  personaCount,
  threadCount,
  recentLogs,
}: DashboardContentProps) {
  return (
    <motion.div
      className="space-y-8 max-w-4xl"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.header variants={itemVariants}>
        <h1 className="text-xl font-light tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted mt-1">Status of your AI-generated communities</p>
      </motion.header>

      {healthChecks.length > 0 && (
        <motion.section variants={itemVariants}>
          <div className="rounded-xl border border-border/60 bg-surface shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border/40">
              <h2 className="text-sm font-medium text-foreground/80 tracking-tight">System Health</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/40">
              {healthChecks.map((check) => (
                <div
                  key={check.name}
                  className="px-5 py-4 flex items-center gap-3"
                >
                  {check.status === "connected" ? (
                    <CheckCircle className="size-4 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="size-4 text-red-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm text-foreground/80 truncate">{check.name}</p>
                    <p className="text-xs text-muted mt-0.5 truncate">
                      {check.status === "connected" ? "Connected" : "Disconnected"}
                      {check.detail && <span className="text-muted/60"> &middot; {check.detail}</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-5"
        variants={containerVariants}
      >
        <StatCard variants={itemVariants} icon={Users} label="Communities" value={subCount} />
        <StatCard variants={itemVariants} icon={UserCircle} label="AI Personas" value={personaCount} />
        <StatCard variants={itemVariants} icon={MessageSquare} label="Threads Generated" value={threadCount} />
      </motion.div>

      <motion.section variants={itemVariants}>
        <div className="rounded-xl border border-border/60 bg-surface shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border/40 flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground/80 tracking-tight">Recent Activity</h2>
            <span className="text-xs text-muted">Last 5 entries</span>
          </div>
          <div className="divide-y divide-border/40">
            {recentLogs.length ? (
              recentLogs.map((log) => (
                <div key={log.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusDot status={log.status} />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground/80 truncate">
                        {log.status === "success"
                          ? "Thread Generated"
                          : log.status === "skipped"
                            ? "Skipped"
                            : "Generation Failed"}
                      </p>
                      <p className="text-xs text-muted mt-0.5 truncate">
                        {log.communities?.name ?? "Unknown"} &middot; {new Date(log.created_at).toLocaleString("en-US")}
                      </p>
                    </div>
                  </div>
                  {log.error_message && (
                    <span className="shrink-0 text-xs text-red-400/80 bg-red-500/10 px-2 py-1 rounded max-w-[200px] truncate" title={log.error_message}>
                      {log.error_message}
                    </span>
                  )}
                  {log.status === "success" && (
                    <span className="shrink-0 text-xs text-muted">{log.model_used}</span>
                  )}
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-sm text-muted">
                <Activity className="size-5 mx-auto mb-2 text-muted/50" />
                No recent activity logs found.
              </div>
            )}
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    success: "bg-green-500",
    failed: "bg-red-400",
    skipped: "bg-yellow-400",
  };
  return (
    <div className={`size-2 rounded-full shrink-0 ${colors[status] ?? "bg-border"}`} />
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
      className="rounded-xl border border-border/60 bg-surface shadow-sm p-5 cursor-default"
      whileHover={{ y: -2, transition: { duration: 0.2, ease: "easeOut" } }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-4">
        <motion.div
          className="size-10 rounded-lg bg-surface-hover flex items-center justify-center"
          whileHover={{ scale: 1.08 }}
          transition={{ duration: 0.2 }}
        >
          <Icon className="size-4 text-muted" />
        </motion.div>
        <div>
          <p className="text-xs font-medium text-muted tracking-wide uppercase">{label}</p>
          <p className="text-2xl font-light text-foreground mt-0.5">{value}</p>
        </div>
      </div>
    </motion.div>
  );
}
