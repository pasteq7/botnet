"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cancelRun, retryRun, getRunDetails, type InngestRun, type InngestRunDetails } from "./actions";

const STATUS_STYLES: Record<string, { bg: string; text: string; ring: string; dot: string; label: string }> = {
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
  if (!ended) return "—";
  const ms = new Date(ended).getTime() - new Date(started).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function CancelButton({ runId: _runId }: { runId: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-3 py-1.5 text-[11px] font-medium rounded-lg border border-border text-muted hover:text-red-500 hover:border-red-500/30 hover:bg-red-50/50 transition-all disabled:opacity-50"
    >
      {pending ? "..." : "Cancel"}
    </button>
  );
}

function RetryButton({ runId: _runId }: { runId: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-3 py-1.5 text-[11px] font-medium rounded-lg border border-border text-muted hover:text-amber-600 hover:border-amber-600/30 hover:bg-amber-50/50 transition-all disabled:opacity-50"
    >
      {pending ? "..." : "Retry"}
    </button>
  );
}

function RunRow({ run, onSelect }: { run: InngestRun; onSelect: (id: string) => void }) {
  const style = getStatusStyle(run.status);

  return (
    <tr
      className="hover:bg-surface-hover transition-colors cursor-pointer"
      onClick={() => onSelect(run.id)}
    >
      <td className="px-6 py-4">
        <code className="text-xs text-foreground font-mono">{run.function_id}</code>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ring-1 ring-inset ${style.bg} ${style.text} ${style.ring}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
          {style.label}
        </span>
      </td>
      <td className="px-6 py-4 text-xs text-muted whitespace-nowrap">
        {run.started_at ? new Date(run.started_at).toLocaleString() : "—"}
      </td>
      <td className="px-6 py-4 text-xs text-muted whitespace-nowrap">
        {formatDuration(run.started_at, run.ended_at)}
      </td>
      <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-2">
          {(run.status === "running" || run.status === "queued") && (
            <form action={cancelRun.bind(null, run.id)}>
              <CancelButton runId={run.id} />
            </form>
          )}
          {run.status === "failed" && (
            <form action={retryRun.bind(null, run.id)}>
              <RetryButton runId={run.id} />
            </form>
          )}
        </div>
      </td>
    </tr>
  );
}

function StepTimeline({ steps }: { steps: InngestRunDetails["steps"] }) {
  if (!steps || steps.length === 0) {
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
                {step.started_at ? new Date(step.started_at).toLocaleString() : "—"}
                {step.ended_at && ` — ${formatDuration(step.started_at, step.ended_at)}`}
              </p>
              {step.error && (
                <p className="text-[11px] text-red-500 mt-2 font-mono bg-red-50/50 rounded p-2 leading-relaxed">{step.error}</p>
              )}
              {step.output && (
                <details className="mt-2">
                  <summary className="text-[10px] text-muted cursor-pointer hover:text-foreground">Output</summary>
                  <pre className="text-[10px] text-muted mt-1 font-mono bg-background rounded p-2 max-h-32 overflow-auto leading-relaxed">{step.output}</pre>
                </details>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RunsTable({ runs }: { runs: InngestRun[] }) {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runDetails, setRunDetails] = useState<InngestRunDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const handleSelectRun = async (runId: string) => {
    setSelectedRunId(runId);
    setRunDetails(null);
    setLoadingDetails(true);
    const { data } = await getRunDetails(runId);
    setRunDetails(data ?? null);
    setLoadingDetails(false);
  };

  return (
    <>
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface border-b border-border">
              <th className="px-6 py-4 text-sm font-medium text-muted">Function</th>
              <th className="px-6 py-4 text-sm font-medium text-muted">Status</th>
              <th className="px-6 py-4 text-sm font-medium text-muted">Started</th>
              <th className="px-6 py-4 text-sm font-medium text-muted">Duration</th>
              <th className="px-6 py-4 text-sm font-medium text-muted text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {runs.map((run) => (
              <RunRow key={run.id} run={run} onSelect={handleSelectRun} />
            ))}
          </tbody>
        </table>

        {runs.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-muted">
            No background jobs found. Runs will appear here once Inngest functions are triggered.
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedRunId && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
              onClick={() => setSelectedRunId(null)}
            />
            <motion.div
              className="relative w-full sm:max-w-2xl bg-surface rounded-2xl shadow-xl border border-border overflow-hidden"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
            >
              <div className="px-8 py-6 border-b border-border bg-surface flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-light text-foreground">Run Details</h2>
                  <code className="text-[11px] text-muted font-mono mt-1 block">{selectedRunId}</code>
                </div>
                <button
                  onClick={() => setSelectedRunId(null)}
                  className="p-2 rounded-lg hover:bg-surface-hover text-muted hover:text-foreground transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-8 py-6 max-h-[70vh] overflow-y-auto">
                {loadingDetails ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
                  </div>
                ) : runDetails ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[11px] font-medium text-muted mb-1">Function</p>
                        <code className="text-sm text-foreground font-mono">{runDetails.function_id}</code>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-muted mb-1">Status</p>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ring-1 ring-inset ${getStatusStyle(runDetails.status).bg} ${getStatusStyle(runDetails.status).text} ${getStatusStyle(runDetails.status).ring}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${getStatusStyle(runDetails.status).dot}`} />
                          {getStatusStyle(runDetails.status).label}
                        </span>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-muted mb-1">Started</p>
                        <p className="text-sm text-foreground">{runDetails.started_at ? new Date(runDetails.started_at).toLocaleString() : "—"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-muted mb-1">Duration</p>
                        <p className="text-sm text-foreground">{formatDuration(runDetails.started_at, runDetails.ended_at)}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-medium text-muted mb-3">Step Traces</p>
                      <StepTimeline steps={runDetails.steps} />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted text-center py-8">Failed to load run details.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
