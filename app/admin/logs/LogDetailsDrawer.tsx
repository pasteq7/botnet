"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Settings, Search, MessageSquare, Database, ChevronRight } from "lucide-react";
import { getLogDetails, type ActivityLog, type ActivityLogDetails, type StepTrace, type TraceEntry } from "./actions";
import { useState, useEffect } from "react";

const STATUS_STYLES: Record<string, { text: string; ring: string; dot: string; label: string }> = {
  success: {
    text: "text-emerald-400",
    ring: "ring-emerald-500/20",
    dot: "bg-emerald-500",
    label: "Success",
  },
  completed: {
    text: "text-emerald-400",
    ring: "ring-emerald-500/20",
    dot: "bg-emerald-500",
    label: "Completed",
  },
  failed: {
    text: "text-rose-400",
    ring: "ring-rose-500/20",
    dot: "bg-rose-400",
    label: "Failed",
  },
  skipped: {
    text: "text-amber-400",
    ring: "ring-amber-500/20",
    dot: "bg-amber-400",
    label: "Skipped",
  },
  running: {
    text: "text-amber-400",
    ring: "ring-amber-500/20",
    dot: "bg-amber-400",
    label: "Running",
  },
  queued: {
    text: "text-sky-400",
    ring: "ring-sky-500/20",
    dot: "bg-sky-400",
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

function formatDuration(started: string, ended: string | null): string {
  if (!ended) return "\u2014";
  const ms = new Date(ended).getTime() - new Date(started).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

const TRACE_STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Setup: Settings,
  Routing: Search,
  Conversation: MessageSquare,
  Database: Database,
};

function formatTraceStatus(status: string) {
  switch (status) {
    case "success": return { dot: "bg-emerald-500", text: "text-emerald-400", label: "Success" };
    case "failed": return { dot: "bg-rose-400", text: "text-rose-400", label: "Failed" };
    case "skipped": return { dot: "bg-amber-400", text: "text-amber-400", label: "Skipped" };
    default: return { dot: "bg-border", text: "text-muted", label: status || "Unknown" };
  }
}

function DetailsBlock({ data }: { data: Record<string, unknown> }) {
  const keyCount = Object.keys(data).length;
  return (
    <details className="group">
      <summary className="flex items-center gap-1 text-[10px] text-muted/60 cursor-pointer hover:text-foreground transition-colors py-1">
        <ChevronRight className="size-3 transition-transform duration-200 group-open:rotate-90" />
        <span>Details</span>
        <span className="text-muted/40 ml-auto">{keyCount} key{keyCount !== 1 ? "s" : ""}</span>
      </summary>
      <div className="mt-1.5 bg-background/80 rounded-lg border border-border/40 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 bg-surface-hover/50 border-b border-border/40">
          <span className="text-[9px] text-muted/50 font-mono tracking-wider uppercase">JSON</span>
        </div>
        <pre className="text-[10px] text-muted font-mono p-3 max-h-32 overflow-auto leading-relaxed whitespace-pre-wrap scrollbar-thin">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </details>
  );
}

function OutputBlock({ output }: { output: string }) {
  return (
    <details className="group">
      <summary className="flex items-center gap-1 text-[10px] text-muted/60 cursor-pointer hover:text-foreground transition-colors py-1">
        <ChevronRight className="size-3 transition-transform duration-200 group-open:rotate-90" />
        <span>Output</span>
      </summary>
      <div className="mt-1.5 bg-background/80 rounded-lg border border-border/40 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 bg-surface-hover/50 border-b border-border/40">
          <span className="text-[9px] text-muted/50 font-mono tracking-wider uppercase">Raw Output</span>
        </div>
        <pre className="text-[10px] text-muted font-mono p-3 max-h-48 overflow-auto leading-relaxed whitespace-pre-wrap scrollbar-thin">
          {output}
        </pre>
      </div>
    </details>
  );
}

function TraceTimeline({ trace }: { trace: TraceEntry[] }) {
  if (trace.length === 0) {
    return <p className="text-xs text-muted/60 py-4 text-center">No trace data available.</p>;
  }

  return (
    <div className="space-y-2">
      {trace.map((entry, i) => {
        const style = formatTraceStatus(entry.status);
        const isSkipped = entry.status === "skipped";
        const StepIcon = TRACE_STEP_ICONS[entry.step];

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.25, ease: "easeOut" }}
            className="relative pl-7"
          >
            {i < trace.length - 1 && (
              <div
                className={`absolute left-[9px] top-3.5 bottom-0 w-px ${
                  isSkipped ? "border-l border-dashed border-border/30" : "bg-border/50"
                }`}
              />
            )}
            <div
              className={`absolute left-0 top-1.5 size-[14px] rounded-full ring-[3px] ring-background flex items-center justify-center ${
                isSkipped ? "bg-amber-400/15" : style.dot
              }`}
            >
              <div className={`size-[6px] rounded-full ${isSkipped ? "bg-amber-400/50" : "bg-background/60"}`} />
            </div>
            <div
              className={`rounded-lg p-3 border ${
                isSkipped
                  ? "bg-surface-hover/50 border-border/30"
                  : entry.status === "failed"
                    ? "bg-rose-500/5 border-rose-500/15"
                    : "bg-surface-hover border-border/60"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {StepIcon ? (
                  <StepIcon className={`size-3.5 ${isSkipped ? "text-muted/40" : "text-muted"}`} />
                ) : (
                  <span className="text-[11px] text-muted">&#9679;</span>
                )}
                <code className={`text-[11px] font-medium font-mono ${
                  isSkipped ? "text-muted/40" : "text-foreground/80"
                }`}>
                  {entry.step}
                </code>
                <span className={`text-[10px] font-medium ml-auto ${isSkipped ? "text-muted/40" : style.text}`}>
                  {style.label}
                </span>
              </div>
              <p className={`text-[11px] leading-relaxed ${
                isSkipped ? "text-muted/40" : "text-muted"
              }`}>
                {entry.message}
              </p>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {entry.duration_ms != null && (
                  <span className="text-[10px] text-muted/40 font-mono">
                    {entry.duration_ms < 1000
                      ? `${entry.duration_ms}ms`
                      : `${(entry.duration_ms / 1000).toFixed(1)}s`}
                  </span>
                )}
                {entry.model && (
                  <span className="text-[10px] text-muted/40 font-mono bg-background/60 px-1.5 py-0.5 rounded">
                    {entry.model}
                  </span>
                )}
                {entry.timestamp && (
                  <span className="text-[10px] text-muted/30 ml-auto">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>
              {entry.details && Object.keys(entry.details).length > 0 && (
                <div className="mt-2">
                  <DetailsBlock data={entry.details} />
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function StepTimeline({ steps }: { steps: StepTrace[] }) {
  if (steps.length === 0) {
    return <p className="text-xs text-muted/60 py-4 text-center">No step details available.</p>;
  }

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const style = getStatusStyle(step.status);

        return (
          <motion.div
            key={step.id || i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.25, ease: "easeOut" }}
            className="relative pl-7"
          >
            {i < steps.length - 1 && (
              <div className="absolute left-[9px] top-3.5 bottom-0 w-px bg-border/50" />
            )}
            <div
              className={`absolute left-0 top-1.5 size-[14px] rounded-full ring-[3px] ring-background flex items-center justify-center ${style.dot}`}
            >
              <div className="size-[6px] rounded-full bg-background/60" />
            </div>
            <div className="bg-surface-hover rounded-lg p-3 border border-border/60">
              <div className="flex items-center justify-between mb-1">
                <code className="text-[11px] font-medium text-foreground/80 font-mono">{step.name}</code>
                <span className={`text-[10px] font-medium ${style.text}`}>{style.label}</span>
              </div>
              <p className="text-[10px] text-muted/60">
                {step.started_at ? new Date(step.started_at).toLocaleString() : "\u2014"}
                {step.ended_at && ` \u2014 ${formatDuration(step.started_at, step.ended_at)}`}
              </p>
              {step.error && (
                <div className="text-[11px] text-rose-400 mt-2 font-mono bg-rose-500/10 border border-rose-500/15 rounded-lg p-2.5 leading-relaxed whitespace-pre-wrap">
                  {step.error}
                </div>
              )}
              {step.output && (
                <div className="mt-2">
                  <OutputBlock output={step.output} />
                </div>
              )}
            </div>
          </motion.div>
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

const detailsCache = new Map<string, ActivityLogDetails>();

export function LogDetailsDrawer({ log, isOpen, onClose }: LogDetailsDrawerProps) {
  const [details, setDetails] = useState<ActivityLogDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loading = isOpen && details === null && error === null;

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const cached = detailsCache.get(log.id);
    if (cached) {
      setDetails(cached);
      return;
    }

    getLogDetails(log.id).then((result) => {
      if (!cancelled) {
        if (result.data) {
          detailsCache.set(log.id, result.data);
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
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-xl bg-surface shadow-2xl border-l border-border/60 flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/40 flex-shrink-0">
              <div className="min-w-0">
                <h2 className="text-base font-medium text-foreground truncate">Activity Details</h2>
                <code className="text-[11px] text-muted/50 font-mono mt-0.5 block truncate">{log.id}</code>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-surface-hover text-muted/50 hover:text-foreground transition-colors flex-shrink-0 ml-4"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="size-5 border-2 border-border/60 border-t-accent rounded-full animate-spin" />
                </div>
              ) : details ? (
                <motion.div
                  className="space-y-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[11px] font-medium text-muted mb-1">Community</p>
                      <p className="text-sm text-foreground">
                        {details.community_name ?? details.community_slug ?? "Global"}
                      </p>
                      {details.community_slug && (
                        <p className="text-[10px] text-muted/50 mt-0.5">c/{details.community_slug}</p>
                      )}
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[11px] font-medium text-muted mb-1">Status</p>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ring-1 ring-inset ${statusStyle.text} ${statusStyle.ring}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                        {statusStyle.label}
                      </span>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[11px] font-medium text-muted mb-1">Search Model</p>
                      <p className="text-sm text-foreground font-mono">{details.model_search ?? "\u2014"}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[11px] font-medium text-muted mb-1">Generation Model</p>
                      <p className="text-sm text-foreground font-mono">{details.model_gen ?? "\u2014"}</p>
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

                  {threadUrl && (
                    <div>
                      <p className="text-[11px] font-medium text-muted mb-1">Generated Content</p>
                      <a
                        href={threadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors"
                      >
                        <ExternalLink className="size-4" />
                        View Thread
                      </a>
                    </div>
                  )}

                  {details.inngest_event_id && (
                    <div>
                      <p className="text-[11px] font-medium text-muted mb-1">Inngest Event ID</p>
                      <code className="text-[11px] text-muted font-mono bg-surface-hover rounded px-2 py-1 block truncate">{details.inngest_event_id}</code>
                    </div>
                  )}

                  {details.error_message && (
                    <div>
                      <p className="text-[11px] font-medium text-muted mb-1">Error</p>
                      <div className="text-[11px] text-rose-400 font-mono rounded-lg p-3 leading-relaxed whitespace-pre-wrap border border-rose-500/20 bg-rose-500/10">
                        {details.error_message}
                      </div>
                    </div>
                  )}

                  {details.trace && details.trace.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-muted mb-3">AI Pipeline Trace</p>
                      <TraceTimeline trace={details.trace} />
                    </div>
                  )}

                  {details.steps && details.steps.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-muted mb-3">Inngest Step Traces</p>
                      <StepTimeline steps={details.steps} />
                    </div>
                  )}

                  {details.steps && details.steps.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-muted mb-1">Raw Output</p>
                      <details className="group">
                        <summary className="flex items-center gap-1 text-[10px] text-muted/60 cursor-pointer hover:text-foreground transition-colors mb-1">
                          <ChevronRight className="size-3 transition-transform duration-200 group-open:rotate-90" />
                          <span>Show raw step outputs</span>
                        </summary>
                        <div className="space-y-2 max-h-64 overflow-y-auto mt-1.5">
                          {details.steps.map((step, i) => (
                            step.output && (
                              <pre key={i} className="text-[10px] text-muted font-mono bg-background/80 rounded-lg p-3 border border-border/40 whitespace-pre-wrap leading-relaxed">
                                {step.output}
                              </pre>
                            )
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </motion.div>
              ) : (
                <p className="text-sm text-muted/60 text-center py-16">{error ?? "Failed to load activity details."}</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
