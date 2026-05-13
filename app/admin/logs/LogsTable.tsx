"use client";

import { useState, Fragment } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { getLogs } from "./actions";
import type { ActivityLog } from "@/types";
import { ActivityLogDetails } from "./ActivityLogDetails";
import { StatusBadge, StatusDot } from "@/components/ui/StatusBadge";
import { relativeTime } from "@/lib/utils";

function LogRow({ log, onSelect }: { log: ActivityLog; onSelect: (log: ActivityLog) => void }) {
  return (
    <motion.tr
      className="hover:bg-surface-hover/50 transition-colors cursor-pointer"
      onClick={() => onSelect(log)}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
    >
      <td className="px-5 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <StatusDot status={log.status} />
          <div>
            <p className="text-xs text-muted">{relativeTime(log.created_at)}</p>
            <p className="text-xs text-muted/70 mt-0.5">{new Date(log.created_at).toLocaleString("en-US")}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <span className="text-sm font-semibold text-foreground">{log.community_name || "Global"}</span>
        {log.community_slug && (
          <span className="block text-xs text-muted/80 mt-0.5">c/{log.community_slug}</span>
        )}
      </td>
      <td className="px-5 py-4">
        <StatusBadge status={log.status} />
      </td>
      <td className="px-5 py-4">
        {log.model_search || log.model_gen ? (
          log.model_search === log.model_gen ? (
            <code className="text-xs text-muted/90 bg-surface-hover px-2 py-0.5 rounded font-mono">{log.model_search}</code>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {log.model_search && (
                <span className="inline-flex items-center gap-1 text-xs text-muted/90 bg-surface-hover px-2 py-0.5 rounded font-mono">
                  {log.model_search}
                  <span className="text-[10px] text-muted/60 font-sans font-medium">SRCH</span>
                </span>
              )}
              {log.model_gen && (
                <span className="inline-flex items-center gap-1 text-xs text-muted/90 bg-surface-hover px-2 py-0.5 rounded font-mono">
                  {log.model_gen}
                  <span className="text-[10px] text-muted/60 font-sans font-medium">GEN</span>
                </span>
              )}
            </div>
          )
        ) : (
          <span className="text-xs text-muted">&mdash;</span>
        )}
      </td>
      <td className="px-5 py-4 max-w-[200px]">
        {log.error_message ? (
          <span className="text-xs text-error truncate block" title={log.error_message}>
            {log.error_message.length > 60 ? `${log.error_message.slice(0, 60)}...` : log.error_message}
          </span>
        ) : log.status === "success" ? (
          <span className="text-xs text-muted">
            {log.tokens_used != null
              ? `${log.tokens_used.toLocaleString()} tokens`
              : "Generated"}
          </span>
        ) : (
          <span className="text-xs text-muted">&mdash;</span>
        )}
      </td>
    </motion.tr>
  );
}

interface LogsTableProps {
  initialLogs: ActivityLog[];
  initialTotal: number;
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-border/60 bg-surface text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30 transition";

export function LogsTable({ initialLogs, initialTotal }: LogsTableProps) {
  const [logs, setLogs] = useState(initialLogs);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  const limit = 50;
  const totalPages = Math.ceil(total / limit);

  const loadPage = async (newPage: number) => {
    setLoading(true);
    const result = await getLogs({ page: newPage, limit, status: statusFilter || undefined });
    if (result.data) {
      setLogs(result.data);
      setTotal(result.total ?? 0);
      setPage(newPage);
    }
    setLoading(false);
  };

  const handleStatusFilter = async (status: string) => {
    setStatusFilter(status);
    setLoading(true);
    const result = await getLogs({ page: 1, limit, status: status || undefined });
    if (result.data) {
      setLogs(result.data);
      setTotal(result.total ?? 0);
      setPage(1);
    }
    setLoading(false);
  };

  const handleSelectLog = (log: ActivityLog) => {
    setSelectedLog((prev) => (prev?.id === log.id ? null : log));
  };

  const hasResults = logs.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className={inputCls + " w-auto"}
          >
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
            <option value="running">Running</option>
            <option value="queued">Queued</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            onClick={() => loadPage(page)}
            disabled={loading}
            className="p-2 rounded-lg border border-border/60 bg-surface hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Refresh logs"
          >
            <RefreshCw className={`size-3.5 text-muted ${loading ? "animate-spin" : ""}`} />
          </button>
          <span className="text-xs text-muted">
            {total} log{total !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex gap-3 text-xs text-muted/90">
          <span className="flex items-center gap-1">
            <StatusDot status="success" /> Success
          </span>
          <span className="flex items-center gap-1">
            <StatusDot status="skipped" /> Skipped
          </span>
          <span className="flex items-center gap-1">
            <StatusDot status="failed" /> Failed
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-surface shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/40">
              <th className="px-5 py-3.5 text-xs font-semibold text-muted/90 tracking-wide">Time</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-muted/90 tracking-wide">Community</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-muted/90 tracking-wide">Status</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-muted/90 tracking-wide">Model</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-muted/90 tracking-wide">Info</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {hasResults ? (
              logs.map((log) => (
                <Fragment key={log.id}>
                  <LogRow log={log} onSelect={handleSelectLog} />
                  <ActivityLogDetails log={log} isOpen={selectedLog?.id === log.id} />
                </Fragment>
              ))
            ) : (
              <tr>
                <td colSpan={5}>
                  <motion.div
                    className="px-5 py-12 text-center text-sm text-muted"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {loading ? "Loading..." : "No activity logs found yet. Trigger a generation to see results here."}
                  </motion.div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {loading && (
          <div className="px-5 py-3 flex items-center justify-center border-t border-border/40">
            <div className="size-4 border-2 border-border/60 border-t-accent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => loadPage(page - 1)}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg border border-border/60 bg-surface hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
            >
              Previous
            </button>
            <button
              onClick={() => loadPage(page + 1)}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 rounded-lg border border-border/60 bg-surface hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}


    </div>
  );
}
