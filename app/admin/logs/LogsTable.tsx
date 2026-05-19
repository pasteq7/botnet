"use client";

import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { getLogs } from "./actions";
import type { ActivityLog } from "@/types";
import { ActivityLogDetails, clearLogDetailsCache } from "./ActivityLogDetails";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Pagination } from "@/components/ui/Pagination";
import { ACTIVITY_STATUS_FILTERS, getStatusStyle } from "@/lib/constants";
import { relativeTime, formatNumber } from "@/lib/utils";

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
        <div>
          <p className="text-xs text-muted">{relativeTime(log.created_at)}</p>
          <p className="text-xs text-muted/70 mt-0.5">{new Date(log.created_at).toLocaleString("en-US")}</p>
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
        {log.searcher_model || log.generator_model ? (
          log.searcher_model === log.generator_model ? (
            <code className="text-xs text-muted/90 bg-surface-hover px-2 py-0.5 rounded font-mono">{log.searcher_model}</code>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {log.searcher_model && (
                <span className="inline-flex items-center gap-1 text-xs text-muted/90 bg-surface-hover px-2 py-0.5 rounded font-mono">
                  {log.searcher_model}
                  <span className="text-[10px] text-muted/60 font-sans font-medium">SRCH</span>
                </span>
              )}
              {log.generator_model && (
                <span className="inline-flex items-center gap-1 text-xs text-muted/90 bg-surface-hover px-2 py-0.5 rounded font-mono">
                  {log.generator_model}
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
              ? `${formatNumber(log.tokens_used)} tokens`
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
  refreshTrigger?: number;
}

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Statuses" },
  ...ACTIVITY_STATUS_FILTERS.map((status) => ({
    value: status,
    label: getStatusStyle(status).label,
  })),
];

export function LogsTable({ initialLogs, initialTotal, refreshTrigger = 0 }: LogsTableProps) {
  const [logs, setLogs] = useState(initialLogs);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  const limit = 10;
  const totalPages = Math.ceil(total / limit);

  const loadPage = useCallback(async (newPage: number) => {
    setLoading(true);
    clearLogDetailsCache();
    const result = await getLogs({ page: newPage, limit, status: statusFilter || undefined });
    if (result.data) {
      setLogs(result.data);
      setTotal(result.total ?? 0);
      setPage(newPage);
      
      setSelectedLog((prev) => {
        if (!prev) return prev;
        return result.data?.find((log) => log.id === prev.id) ?? prev;
      });
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    if (refreshTrigger === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPage(page);
  }, [refreshTrigger, loadPage, page]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!statusMenuRef.current?.contains(event.target as Node)) {
        setStatusMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const handleStatusFilter = async (status: string) => {
    setStatusFilter(status);
    setLoading(true);
    clearLogDetailsCache();
    const result = await getLogs({ page: 1, limit, status: status || undefined });
    if (result.data) {
      setLogs(result.data);
      setTotal(result.total ?? 0);
      setPage(1);

      setSelectedLog((prev) => {
        if (!prev) return prev;
        return result.data?.find((log) => log.id === prev.id) ?? prev;
      });
    }
    setLoading(false);
  };

  const handleSelectLog = (log: ActivityLog) => {
    setSelectedLog((prev) => (prev?.id === log.id ? null : log));
  };

  const hasResults = logs.length > 0;

  return (
    <section>
      <div className="flex items-center justify-between gap-3 border-b border-border/40 bg-background/20 px-5 py-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-foreground/90 tracking-wide">Entries</h3>
          <p className="text-xs text-muted/70 mt-0.5">
            {total} log{total !== 1 ? "s" : ""}
            {statusFilter ? ` matching ${getStatusStyle(statusFilter).label.toLowerCase()}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div ref={statusMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setStatusMenuOpen((open) => !open)}
              className="inline-flex w-[158px] items-center justify-between gap-3 rounded-md border border-border/60 bg-background/35 px-3 py-2 text-left text-sm text-foreground shadow-sm hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-accent/30"
              aria-haspopup="listbox"
              aria-expanded={statusMenuOpen}
              aria-label="Filter activity logs by status"
            >
              <span className="flex min-w-0 items-center gap-2">
                {statusFilter && (
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: getStatusStyle(statusFilter).color }}
                  />
                )}
                <span className="truncate">
                  {statusFilter ? getStatusStyle(statusFilter).label : "All Statuses"}
                </span>
              </span>
              <ChevronDown className={`size-4 shrink-0 text-muted transition-transform ${statusMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {statusMenuOpen && (
              <div
                className="absolute right-0 top-full z-20 mt-1 w-[190px] overflow-hidden rounded-md border border-border/60 bg-surface shadow-lg"
                role="listbox"
              >
                {STATUS_FILTER_OPTIONS.map((option) => {
                  const active = option.value === statusFilter;
                  const style = option.value ? getStatusStyle(option.value) : null;

                  return (
                    <button
                      key={option.value || "all"}
                      type="button"
                      onClick={() => {
                        setStatusMenuOpen(false);
                        void handleStatusFilter(option.value);
                      }}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                        active
                          ? "bg-accent/10 text-foreground"
                          : "text-muted hover:bg-surface-hover hover:text-foreground"
                      }`}
                      role="option"
                      aria-selected={active}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {style ? (
                          <span
                            className="size-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: style.color }}
                          />
                        ) : (
                          <span className="size-1.5 shrink-0 rounded-full bg-border" />
                        )}
                        <span className="truncate">{option.label}</span>
                      </span>
                      {active && <Check className="size-3.5 shrink-0 text-accent" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left border-collapse">
          <thead>
            <tr className="border-b border-border/40 bg-background/10">
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

      <div className="border-t border-border/40 bg-background/20 px-5 py-3">
        <Pagination page={page} totalPages={totalPages} total={total} loading={loading} onPageChange={loadPage} />
      </div>
    </section>
  );
}
