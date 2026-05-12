"use client";

import { motion } from "framer-motion";
import { Activity, Users, UserCircle, MessageSquare } from "lucide-react";
import { StatusDot } from "@/components/ui/StatusBadge";
import { SuccessRateCircle } from "@/components/admin/SuccessRateCircle";

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
  stats,
}: DashboardContentProps) {
  return (
    <motion.div
      className="space-y-4 max-w-5xl"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.header variants={itemVariants} className="flex flex-col gap-1">
        <h1 className="text-2xl font-light tracking-tight text-foreground">Dashboard</h1>
      </motion.header>

      {healthChecks.length > 0 && (
        <motion.section variants={itemVariants}>
          <div className="rounded-2xl border border-border/40 bg-surface shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="px-6 py-4 border-b border-border/20 bg-background/30">
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">System Health</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/20">
              {healthChecks.map((check) => (
                <div
                  key={check.name}
                  className="px-6 py-5 flex items-center gap-4 hover:bg-surface-hover/30 transition-colors"
                >
                  <div className="relative">
                    {check.status === "connected" ? (
                      <div className="size-2.5 rounded-full bg-success shadow-[0_0_8px_rgba(var(--success-rgb),0.4)]" />
                    ) : (
                      <div className="size-2.5 rounded-full bg-error" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground/90 truncate">{check.name}</p>
                    <p className="text-xs text-muted mt-0.5 truncate">
                      {check.status === "connected" ? "Operational" : "Offline"}
                      {check.detail && <span className="text-muted/40"> &middot; {check.detail}</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        variants={containerVariants}
      >
        <StatCard variants={itemVariants} icon={Users} label="Communities" value={subCount} />
        <StatCard variants={itemVariants} icon={UserCircle} label="AI Personas" value={personaCount} />
        <StatCard variants={itemVariants} icon={MessageSquare} label="Threads" value={threadCount} />
      </motion.div>

      <motion.section variants={itemVariants}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Recent Activity List */}
          <div className="lg:col-span-3 rounded-2xl border border-border/40 bg-surface shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border/20 flex items-center justify-between bg-background/30">
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Recent Activity</h2>
              <span className="text-[10px] text-muted/60 font-medium bg-border/20 px-2 py-0.5 rounded-full">LIVE</span>
            </div>
            <div className="divide-y divide-border/10 flex-1">
              {recentLogs.length ? (
                recentLogs.map((log) => (
                  <div key={log.id} className="px-6 py-4 flex items-center justify-between gap-4 group hover:bg-surface-hover/20 transition-all">
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
                        <p className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                          {log.status === "success"
                            ? "New content generated"
                            : log.status === "skipped"
                              ? "Schedule skipped"
                              : "Pipeline error"}
                        </p>
                        <p className="text-xs text-muted mt-1 truncate">
                          <span className="text-accent/80 font-medium">{log.communities?.name ?? "System"}</span>
                          <span className="mx-2 text-muted/30">|</span>
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {log.status === "success" && (
                        <span className="text-[10px] font-mono text-muted/50 bg-border/10 px-1.5 py-0.5 rounded">
                          {log.model_used?.split('/').pop()}
                        </span>
                      )}
                      {log.error_message && (
                        <span className="text-[10px] text-red-400/70 bg-red-400/5 px-2 py-0.5 rounded border border-red-400/10 max-w-[120px] truncate" title={log.error_message}>
                          {log.error_message}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-12 text-center">
                  <Activity className="size-8 mx-auto mb-3 text-muted/20" />
                  <p className="text-sm text-muted">No recent activity detected.</p>
                </div>
              )}
            </div>
            <div className="px-6 py-3 border-t border-border/10 bg-background/10 text-center">
              <button className="text-[10px] font-semibold text-muted uppercase tracking-widest hover:text-foreground transition-colors">
                View Full Logs
              </button>
            </div>
          </div>

          {/* Success Rate Visual */}
          <div className="lg:col-span-2 rounded-2xl border border-border/40 bg-surface shadow-sm p-8 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-4 left-6">
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Success Rate</h2>
            </div>
            <SuccessRateCircle
              success={stats.success}
              failed={stats.failed}
              skipped={stats.skipped}
              size={180}
            />
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
      className="rounded-2xl border border-border/40 bg-surface  p-6 cursor-default"
      whileHover={{ y: -4, transition: { duration: 0.3, ease: "easeOut" } }}
    >
      <div className="flex items-center gap-5">
        <motion.div
          className="size-12 rounded-xl bg-background flex items-center justify-center text-accent/60"
          whileHover={{ scale: 1.1, color: "var(--accent)" }}
          transition={{ duration: 0.2 }}
        >
          <Icon className="size-5" />
        </motion.div>
        <div>
          <p className="text-[10px] font-bold text-muted/60 tracking-[0.2em] uppercase">{label}</p>
          <p className="text-3xl font-light text-foreground mt-0.5">{value.toLocaleString()}</p>
        </div>
      </div>
    </motion.div>
  );
}
