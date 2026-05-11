"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { getLogs, type ActivityLog } from "./actions";
import { LogDetailsDrawer } from "./LogDetailsDrawer";

const STATUS_STYLES: Record<string, { text: string; ring: string; dot: string; label: string }> = {
  success: {
    text: "text-green-400",
    ring: "ring-green-500/20",
    dot: "bg-green-500",
    label: "Success",
  },
  completed: {
    text: "text-green-400",
    ring: "ring-green-500/20",
    dot: "bg-green-500",
    label: "Completed",
  },
  failed: {
    text: "text-red-400",
    ring: "ring-red-500/20",
    dot: "bg-red-400",
    label: "Failed",
  },
  skipped: {
    text: "text-yellow-400",
    ring: "ring-yellow-500/20",
    dot: "bg-yellow-400",
    label: "Skipped",
  },
  running: {
    text: "text-amber-400",
    ring: "ring-amber-500/20",
    dot: "bg-amber-400",
    label: "Running",
  },
  queued: {
    text: "text-blue-400",
    ring: "ring-blue-500/20",
    dot: "bg-blue-400",
    label: "Queued",
  },
  cancelled: {
    text: "text-muted",
    ring: "ring-border/60",
    dot: "bg-muted",
    label: "Cancelled",
  },
};

function getStatusStyle(status: string) {
  const key = status?.toLowerCase();
  return STATUS_STYLES[key] ?? {
    bg: "bg-surface",
    text: "text-muted",
    ring: "ring-border",
    dot: "bg-border",
    label: status || "Unknown",
  };
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function LogRow({ log, onSelect }: { log: ActivityLog; onSelect: (log: ActivityLog) => void }) {
  const style = getStatusStyle(log.status);

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
          <span className={`w-2 h-2 rounded-full ${style.dot} flex-shrink-0`} />
          <div>
            <p className="text-xs text-muted">{relativeTime(log.created_at)}</p>
            <p className="text-[10px] text-muted/50 mt-0.5">{new Date(log.created_at).toLocaleString("en-US")}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <span className="text-sm text-foreground/80 font-medium">{log.community_name || "Global"}</span>
        {log.community_slug && (
          <span className="block text-[10px] text-muted mt-0.5">c/{log.community_slug}</span>
        )}
      </td>
      <td className="px-5 py-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ring-1 ring-inset ${style.text} ${style.ring}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
          {style.label}
        </span>
      </td>
      <td className="px-5 py-4">
        {log.model_search || log.model_gen ? (
          log.model_search === log.model_gen ? (
            <code className="text-[11px] text-muted bg-surface-hover px-2 py-0.5 rounded font-mono">{log.model_search}</code>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {log.model_search && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted bg-surface-hover px-2 py-0.5 rounded font-mono">
                  {log.model_search}
                  <span className="text-[9px] text-muted/40 font-sans font-medium">SRCH</span>
                </span>
              )}
              {log.model_gen && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted bg-surface-hover px-2 py-0.5 rounded font-mono">
                  {log.model_gen}
                  <span className="text-[9px] text-muted/40 font-sans font-medium">GEN</span>
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
          <span className="text-[11px] text-red-400 truncate block" title={log.error_message}>
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
  const [drawerOpen, setDrawerOpen] = useState(false);

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
    setSelectedLog(log);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelectedLog(null), 200);
  };

  const hasResults = logs.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className={inputCls + " w-auto text-xs"}
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

        <div className="flex gap-3 text-[11px] text-muted">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Success
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-400" /> Skipped
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400" /> Failed
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-surface shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/40">
              <th className="px-5 py-3.5 text-xs font-medium text-muted tracking-wide">Time</th>
              <th className="px-5 py-3.5 text-xs font-medium text-muted tracking-wide">Community</th>
              <th className="px-5 py-3.5 text-xs font-medium text-muted tracking-wide">Status</th>
              <th className="px-5 py-3.5 text-xs font-medium text-muted tracking-wide">Model</th>
              <th className="px-5 py-3.5 text-xs font-medium text-muted tracking-wide">Info</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            <AnimatePresence mode="popLayout">
              {hasResults ? (
                logs.map((log) => (
                  <LogRow key={log.id} log={log} onSelect={handleSelectLog} />
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
            </AnimatePresence>
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

      {selectedLog && (
        <LogDetailsDrawer
          key={selectedLog.id}
          log={selectedLog}
          isOpen={drawerOpen}
          onClose={handleCloseDrawer}
        />
      )}
    </div>
  );
}
