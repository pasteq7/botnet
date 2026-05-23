"use client";

import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";

import { GlassSurface } from "@/components/ui/GlassSurface";
import { StatusDot } from "@/components/ui/StatusBadge";
import { SectionHeader } from "@/app/admin/dashboard/DashboardPrimitives";
import type { ActivityItem, LogEntry } from "@/app/admin/dashboard/types";
import { formatNumber, timeAgo } from "@/app/admin/dashboard/utils";
import { staggerContainer } from "@/app/admin/dashboard/animation";

export function ActivityFeed({
  items,
  mounted,
  className = "",
}: {
  items: ActivityItem[];
  mounted: boolean;
  className?: string;
}) {
  const feedItems = items.slice(0, 15);

  return (
    <GlassSurface as="section" className={`flex min-h-0 flex-col overflow-hidden ${className}`}>
      <SectionHeader title="Technical logs" detail="Runs" />

      {feedItems.length > 0 ? (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="flex-1 divide-y divide-border/5 overflow-y-auto scrollbar-thin"
        >
          {feedItems.map((item) => (
            <ActivityRunRow key={item.id} log={item.log} mounted={mounted} />
          ))}
        </motion.div>
      ) : (
        <div className="flex flex-1 items-center justify-center py-8 text-sm font-medium text-muted/70">
          No logs
        </div>
      )}
    </GlassSurface>
  );
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 120,
      damping: 18,
    },
  },
};

function ActivityRunRow({ log, mounted }: { log: LogEntry; mounted: boolean }) {
  const statusIcon =
    {
      success: <CheckCircle2 className="size-3.5 text-success/80" />,
      failed: <AlertTriangle className="size-3.5 text-error/80" />,
      skipped: <Clock className="size-3.5 text-warning/80" />,
    }[log.status.toLowerCase()] ?? <StatusDot status={log.status} />;

  const modelShortName = log.model_used
    ? log.model_used.split("/").pop()?.split(":").shift() || "LLM"
    : "LLM";

  return (
    <motion.div
      variants={itemVariants}
      className="group border-b border-border/8 px-3.5 py-3 transition-all duration-300 hover:bg-surface-hover/25 last:border-b-0 sm:px-4 sm:py-3.5"
    >
      {/* Mobile Layout (<640px) */}
      <div className="flex flex-col gap-2 sm:hidden">
        {/* Top line: status, community, time */}
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="shrink-0">{statusIcon}</div>
            <p
              className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground"
              title={log.communities?.name ?? "Global Run"}
            >
              {log.communities?.name ?? "Global Run"}
            </p>
          </div>
          <span className="shrink-0 text-xs font-medium text-muted/70">
            {mounted ? timeAgo(log.created_at) : "--"}
          </span>
        </div>

        {/* Bottom line: model, tokens, error */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-2">
            <span
              className="shrink-0 rounded border border-border/20 bg-surface/55 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted/75"
              title={log.model_used || "Unknown Model"}
            >
              {modelShortName}
            </span>

            {log.error_message && (
              <div
                className="flex items-center gap-1 rounded border border-error/20 bg-error/10 px-1.5 py-0.5 text-[10px] font-semibold text-error"
                title={log.error_message}
              >
                <AlertTriangle className="size-2 animate-pulse" />
                <span>Error</span>
              </div>
            )}
          </div>

          {log.tokens_used && log.tokens_used > 0 ? (
            <span className="font-mono text-[11px] font-medium text-muted/70">
              {formatNumber(log.tokens_used)} tkn
            </span>
          ) : null}
        </div>
      </div>

      {/* Desktop Layout (>=640px) */}
      <div className="hidden sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="shrink-0 transition-transform duration-300 group-hover:scale-110">{statusIcon}</div>

          <p
            className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground/95"
            title={log.communities?.name ?? "Global Run"}
          >
            {log.communities?.name ?? "Global Run"}
          </p>

          <span
            className="shrink-0 rounded border border-border/20 bg-surface/55 px-2 py-0.5 font-mono text-[11px] font-medium text-muted/75 transition-colors duration-150 group-hover:border-border/35 group-hover:bg-surface/75"
            title={log.model_used || "Unknown Model"}
          >
            {modelShortName}
          </span>

          {log.error_message && (
            <div
              className="flex size-4.5 shrink-0 items-center justify-center rounded-full border border-error/20 bg-error/10 text-error"
              title={log.error_message}
            >
              <AlertTriangle className="size-2.5 animate-pulse" />
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 font-mono text-xs text-muted/70">
          {log.tokens_used && log.tokens_used > 0 && (
            <span className="rounded border border-border/15 bg-surface/45 px-1.5 py-0.5 text-muted/80">
              {formatNumber(log.tokens_used)} <span className="text-[10px] opacity-80">tkn</span>
            </span>
          )}
          {log.tokens_used && log.tokens_used > 0 && <span>&bull;</span>}
          <span className="font-sans font-medium">{mounted ? timeAgo(log.created_at) : "--"}</span>
        </div>
      </div>
    </motion.div>
  );
}
