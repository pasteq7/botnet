"use client";

import { motion, AnimatePresence } from "framer-motion";
import { getLogDetails, type ActivityLog, type ActivityLogDetails, type StepTrace } from "./actions";
import { useState, useEffect } from "react";

const STATUS_STYLES: Record<string, { bg: string; text: string; ring: string; dot: string; label: string }> = {
  success: {
    bg: "bg-green-50",
    text: "text-green-700",
    ring: "ring-green-600/20",
    dot: "bg-green-500",
    label: "Success",
  },
  completed: {
    bg: "bg-green-50",
    text: "text-green-700",
    ring: "ring-green-600/20",
    dot: "bg-green-500",
    label: "Completed",
  },
  failed: {
    bg: "bg-red-50",
    text: "text-red-700",
    ring: "ring-red-600/20",
    dot: "bg-red-400",
    label: "Failed",
  },
  skipped: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    ring: "ring-yellow-600/20",
    dot: "bg-yellow-400",
    label: "Skipped",
  },
  running: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-600/20",
    dot: "bg-amber-400",
    label: "Running",
  },
  queued: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    ring: "ring-blue-600/20",
    dot: "bg-blue-400",
    label: "Queued",
  },
  cancelled: {
    bg: "bg-gray-50",
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

function formatDuration(started: string, ended: string | null): string {
  if (!ended) return "\u2014";
  const ms = new Date(ended).getTime() - new Date(started).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function StepTimeline({ steps }: { steps: StepTrace[] }) {
  if (steps.length === 0) {
    return <p className="text-xs text-muted py-4 text-center">No step details available.</p>;
  }

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const style = getStatusStyle(step.status);
        return (
          <div key={step.id || i} className="relative pl-6">
            {i < steps.length - 1 && (
              <div className="absolute left-[7px] top-3 bottom-0 w-px bg-border" />
            )}
            <div className={`absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full ring-2 ring-background ${style.dot}`} />
            <div className="bg-surface-hover rounded-lg p-3 border border-border">
              <div className="flex items-center justify-between mb-1">
                <code className="text-[11px] font-medium text-foreground font-mono">{step.name}</code>
                <span className={`text-[10px] font-medium ${style.text}`}>{style.label}</span>
              </div>
              <p className="text-[10px] text-muted">
                {step.started_at ? new Date(step.started_at).toLocaleString() : "\u2014"}
                {step.ended_at && ` \u2014 ${formatDuration(step.started_at, step.ended_at)}`}
              </p>
              {step.error && (
                <p className="text-[11px] text-red-500 mt-2 font-mono bg-red-50/50 rounded p-2 leading-relaxed whitespace-pre-wrap">{step.error}</p>
              )}
              {step.output && (
                <details className="mt-2">
                  <summary className="text-[10px] text-muted cursor-pointer hover:text-foreground">Output</summary>
                  <pre className="text-[10px] text-muted mt-1 font-mono bg-background rounded p-2 max-h-32 overflow-auto leading-relaxed whitespace-pre-wrap">{step.output}</pre>
                </details>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface LogDetailsDrawerProps {
  log: ActivityLog;
  isOpen: boolean;
  onClose: () => void;
}

export function LogDetailsDrawer({ log, isOpen, onClose }: LogDetailsDrawerProps) {
  const [details, setDetails] = useState<ActivityLogDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loading = isOpen && details === null && error === null;

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    getLogDetails(log.id).then((result) => {
      if (!cancelled) {
        if (result.data) {
          setDetails(result.data);
        } else {
          setError(result.error ?? "Failed to load");
        }
      }
    });

    return () => { cancelled = true; };
  }, [log.id, isOpen]);

  const statusStyle = getStatusStyle(log.status);
  const threadUrl = log.community_slug && log.thread_id
    ? `/c/${log.community_slug}/${log.thread_id}`
    : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-xl bg-surface shadow-xl border-l border-border flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
              <div className="min-w-0">
                <h2 className="text-lg font-medium text-foreground truncate">Activity Details</h2>
                <code className="text-[11px] text-muted font-mono mt-0.5 block truncate">{log.id}</code>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-surface-hover text-muted hover:text-foreground transition-colors flex-shrink-0 ml-4"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
                </div>
              ) : details ? (
                <div className="space-y-6">
                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[11px] font-medium text-muted mb-1">Community</p>
                      <p className="text-sm text-foreground">
                        {details.community_name ?? details.community_slug ?? "Global"}
                      </p>
                      {details.community_slug && (
                        <p className="text-[10px] text-muted mt-0.5">c/{details.community_slug}</p>
                      )}
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[11px] font-medium text-muted mb-1">Status</p>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ring-1 ring-inset ${statusStyle.bg} ${statusStyle.text} ${statusStyle.ring}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                        {statusStyle.label}
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-muted mb-1">Model</p>
                      <p className="text-sm text-foreground font-mono">{details.model_used ?? "\u2014"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-muted mb-1">Tokens</p>
                      <p className="text-sm text-foreground">{details.tokens_used != null ? details.tokens_used.toLocaleString() : "\u2014"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[11px] font-medium text-muted mb-1">Created</p>
                      <p className="text-sm text-foreground">{new Date(details.created_at).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Thread Link */}
                  {threadUrl && (
                    <div>
                      <p className="text-[11px] font-medium text-muted mb-1">Generated Content</p>
                      <a
                        href={threadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View Thread
                      </a>
                    </div>
                  )}

                  {/* Inngest Event ID */}
                  {details.inngest_event_id && (
                    <div>
                      <p className="text-[11px] font-medium text-muted mb-1">Inngest Event ID</p>
                      <code className="text-[11px] text-muted font-mono bg-surface-hover rounded px-2 py-1 block truncate">{details.inngest_event_id}</code>
                    </div>
                  )}

                  {/* Error Message */}
                  {details.error_message && (
                    <div>
                      <p className="text-[11px] font-medium text-muted mb-1">Error</p>
                      <div className="text-[11px] text-red-500 font-mono bg-red-50/50 rounded-lg p-3 leading-relaxed whitespace-pre-wrap border border-red-100">
                        {details.error_message}
                      </div>
                    </div>
                  )}

                  {/* Step Traces */}
                  {details.steps && details.steps.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-muted mb-3">Step Traces</p>
                      <StepTimeline steps={details.steps} />
                    </div>
                  )}

                  {/* Raw Payload Snippet */}
                  {details.steps && details.steps.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-muted mb-1">Raw Output</p>
                      <details>
                        <summary className="text-[10px] text-muted cursor-pointer hover:text-foreground mb-1">Show raw step outputs</summary>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {details.steps.map((step, i) => (
                            step.output && (
                              <pre key={i} className="text-[10px] text-muted font-mono bg-background rounded-lg p-3 border border-border whitespace-pre-wrap leading-relaxed">
                                {step.output}
                              </pre>
                            )
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted text-center py-16">{error ?? "Failed to load activity details."}</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
