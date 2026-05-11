"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getLogs, type ActivityLog } from "./actions";
import { LogDetailsDrawer } from "./LogDetailsDrawer";

const STATUS_STYLES: Record<string, { text: string; ring: string; dot: string; label: string }> = {
  success: {

    text: "text-green-700",
    ring: "ring-green-600/20",
    dot: "bg-green-500",
    label: "Success",
  },
  completed: {

    text: "text-green-700",
    ring: "ring-green-600/20",
    dot: "bg-green-500",
    label: "Completed",
  },
  failed: {

    text: "text-red-700",
    ring: "ring-red-600/20",
    dot: "bg-red-400",
    label: "Failed",
  },
  skipped: {
    text: "text-yellow-700",
    ring: "ring-yellow-600/20",
    dot: "bg-yellow-400",
    label: "Skipped",
  },
  running: {
    text: "text-amber-700",
    ring: "ring-amber-600/20",
    dot: "bg-amber-400",
    label: "Running",
  },
  queued: {
    text: "text-blue-700",
    ring: "ring-blue-600/20",
    dot: "bg-blue-400",
    label: "Queued",
  },
  cancelled: {
    text: "text-gray-700",
    ring: "ring-gray-600/20",
    dot: "bg-gray-400",
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
      className="hover:bg-surface-hover transition-colors cursor-pointer"
      onClick={() => onSelect(log)}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${style.dot} flex-shrink-0`} />
          <div>
            <p className="text-xs text-muted">
              {relativeTime(log.created_at)}
            </p>
            <p className="text-[10px] text-muted/60 mt-0.5">
              {new Date(log.created_at).toLocaleString("en-US")}
            </p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="text-sm text-foreground font-medium">
          {log.community_name || "Global"}
        </span>
        {log.community_slug && (
          <span className="block text-[10px] text-muted">c/{log.community_slug}</span>
        )}
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ring-1 ring-inset  ${style.text} ${style.ring}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
          {style.label}
        </span>
      </td>
      <td className="px-6 py-4">
        {log.model_used ? (
          <code className="text-[11px] text-muted bg-surface px-2 py-0.5 rounded font-mono">{log.model_used}</code>
        ) : (
          <span className="text-xs text-muted">\u2014</span>
        )}
      </td>
      <td className="px-6 py-4 max-w-[200px]">
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
          <span className="text-xs text-muted">\u2014</span>
        )}
      </td>
    </motion.tr>
  );
}

interface LogsTableProps {
  initialLogs: ActivityLog[];
  initialTotal: number;
}

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
    // Keep selectedLog briefly for the exit animation
    setTimeout(() => setSelectedLog(null), 200);
  };

  const hasResults = logs.length > 0;

  return (
    <>
      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="text-xs bg-surface border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-accent/30"
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
            className="p-2 rounded-lg border border-border bg-surface hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Refresh logs"
          >
            <svg className={`w-3.5 h-3.5 text-muted ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <span className="text-xs text-muted">
            {total} log{total !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex gap-3 text-xs text-muted">
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

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface border-b border-border">
              <th className="px-6 py-4 text-sm font-medium text-muted">Time</th>
              <th className="px-6 py-4 text-sm font-medium text-muted">Community</th>
              <th className="px-6 py-4 text-sm font-medium text-muted">Status</th>
              <th className="px-6 py-4 text-sm font-medium text-muted">Model</th>
              <th className="px-6 py-4 text-sm font-medium text-muted">Info</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <AnimatePresence mode="popLayout">
              {hasResults ? (
                logs.map((log) => (
                  <LogRow key={log.id} log={log} onSelect={handleSelectLog} />
                ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    <motion.div
                      className="px-6 py-12 text-center text-sm text-muted"
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

        {/* Loading Overlay */}
        {loading && (
          <div className="px-6 py-3 flex items-center justify-center border-t border-border">
            <div className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => loadPage(page - 1)}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => loadPage(page + 1)}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Details Drawer */}
      {selectedLog && (
        <LogDetailsDrawer
          key={selectedLog.id}
          log={selectedLog}
          isOpen={drawerOpen}
          onClose={handleCloseDrawer}
        />
      )}
    </>
  );
}
