"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Settings, Search, MessageSquare, Database } from "lucide-react";
import { getLogDetails } from "./actions";
import type { ActivityLog, ActivityLogDetails, StepTrace, TraceEntry } from "@/types";
import { useState, useEffect } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getStatusStyle } from "@/lib/constants";
import { formatDuration } from "@/lib/utils";

const TRACE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Setup: Settings, Routing: Search, Conversation: MessageSquare, Database,
};

function MetaBar({ details, log }: { details: ActivityLogDetails; log: ActivityLog }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const threadUrl = log.community_slug && log.thread_id
    ? `/c/${log.community_slug}/${log.thread_id}` : null;

  const fields: { label: string; value: React.ReactNode }[] = [
    {
      label: "Status",
      value: <StatusBadge status={log.status} />,
    },
    {
      label: "Community",
      value: (
        <span className="text-xs text-foreground/80">
          {details.community_name ?? details.community_slug ?? "Global"}
          {details.community_slug && (
            <span className="text-muted/40 ml-1">c/{details.community_slug}</span>
          )}
        </span>
      ),
    },
    {
      label: "Tokens",
      value: <span className="text-xs text-foreground/80 font-mono">{details.tokens_used != null ? details.tokens_used.toLocaleString() : "\u2014"}</span>,
    },
    {
      label: "Model",
      value: details.model_search || details.model_gen ? (
        <span className="text-[11px] font-mono text-muted">
          {details.model_search === details.model_gen
            ? details.model_search
            : [details.model_search, details.model_gen].filter(Boolean).join(" · ")}
        </span>
      ) : <span className="text-xs text-muted/40">{'\u2014'}</span>,
    },
    {
      label: "Created",
      value: <span className="text-xs text-foreground/80">{mounted ? new Date(details.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "\u2014"}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      {details.error_message && (
        <div className="rounded-lg border-error/20 bg-error/5 px-4 py-3">
          <p className="text-[10px] font-medium text-error mb-1 uppercase tracking-wider">Error</p>
          <p className="text-[11px] text-error/80 font-mono leading-relaxed whitespace-pre-wrap">{details.error_message}</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <p className="text-[10px] uppercase tracking-wider text-muted/40 mb-1">{label}</p>
            {value}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 pt-1 border-t border-border/20">
        <div>
          <p className="text-[10px] text-muted/30 mb-0.5">Log ID</p>
          <code className="text-[10px] text-muted/40 font-mono">{log.id}</code>
        </div>
        {details.inngest_event_id && (
          <div>
            <p className="text-[10px] text-muted/30 mb-0.5">Inngest Event</p>
            <code className="text-[10px] text-muted/40 font-mono truncate max-w-[200px] block">{details.inngest_event_id}</code>
          </div>
        )}
        {threadUrl && (
          <div className="ml-auto self-end">
            <a
              href={threadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-accent/70 hover:text-accent transition-colors"
            >
              <ExternalLink className="size-3" />
              View thread
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function TraceTimeline({ trace }: { trace: TraceEntry[] }) {
  if (!trace.length) return <EmptyState label="No trace data recorded." />;

  return (
    <div className="space-y-1.5">
      {trace.map((entry, i) => {
        const style = getStatusStyle(entry.status);
        const Icon = TRACE_ICONS[entry.step];
        const isLast = i === trace.length - 1;

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.2 }}
            className="relative pl-6"
          >
            {!isLast && (
              <div className={`absolute left-[7px] top-4 bottom-0 w-px ${entry.status === "skipped" ? "border-l border-dashed border-border/25" : "bg-border/40"
                }`} />
            )}

            <div className={`absolute left-0 top-1.5 size-3.5 rounded-full ring-2 ring-background flex items-center justify-center ${entry.status === "skipped" ? "bg-warning/20" : style.dot
              }`}>
              <div className={`size-1.5 rounded-full ${entry.status === "skipped" ? "bg-warning/50" : "bg-background/70"
                }`} />
            </div>

            <div className={`rounded-lg px-3 py-2.5 border ${entry.status === "failed"
                ? "bg-error/5 border-error/15"
                : entry.status === "skipped"
                  ? "bg-transparent border-border/20"
                  : "bg-surface-hover/60 border-border/40"
              }`}>
              <div className="flex items-center gap-2">
                {Icon && <Icon className={`size-3 flex-shrink-0 ${entry.status === "skipped" ? "text-muted/30" : "text-muted/60"}`} />}
                <code className={`text-[11px] font-mono font-medium ${entry.status === "skipped" ? "text-muted/30" : "text-foreground/70"
                  }`}>
                  {entry.step}
                </code>

                <div className="ml-auto flex items-center gap-2">
                  {entry.duration_ms != null && (
                    <span className="text-[10px] text-muted/30 font-mono">
                      {entry.duration_ms < 1000 ? `${entry.duration_ms}ms` : `${(entry.duration_ms / 1000).toFixed(1)}s`}
                    </span>
                  )}
                  {entry.model && (
                    <span className="text-[10px] text-muted/40 font-mono bg-surface px-1.5 py-px rounded">
                      {entry.model}
                    </span>
                  )}
                  <span className={`text-[10px] font-medium ${entry.status === "skipped" ? "text-muted/30" : style.text}`}>
                    {style.label}
                  </span>
                </div>
              </div>

              {entry.message && (
                <p className={`text-[11px] mt-1 leading-relaxed ${entry.status === "skipped" ? "text-muted/30" : "text-muted/70"
                  }`}>
                  {entry.message}
                </p>
              )}

              {entry.details && Object.keys(entry.details).length > 0 && (
                <CollapsibleJSON data={entry.details} />
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function StepTimeline({ steps }: { steps: StepTrace[] }) {
  if (!steps.length) return <EmptyState label="No step details available." />;

  return (
    <div className="space-y-1.5">
      {steps.map((step, i) => {
        const style = getStatusStyle(step.status);
        const isLast = i === steps.length - 1;

        return (
          <motion.div
            key={step.id || i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.2 }}
            className="relative pl-6"
          >
            {!isLast && <div className="absolute left-[7px] top-4 bottom-0 w-px bg-border/40" />}
            <div className={`absolute left-0 top-1.5 size-3.5 rounded-full ring-2 ring-background flex items-center justify-center ${style.dot}`}>
              <div className="size-1.5 rounded-full bg-background/70" />
            </div>

            <div className="rounded-lg px-3 py-2.5 border bg-surface-hover/60 border-border/40">
              <div className="flex items-center gap-2">
                <code className="text-[11px] font-mono font-medium text-foreground/70">{step.name}</code>
                <div className="ml-auto flex items-center gap-2">
                  {step.started_at && step.ended_at && (
                    <span className="text-[10px] text-muted/30 font-mono">
                      {formatDuration(step.started_at, step.ended_at)}
                    </span>
                  )}
                  <span className={`text-[10px] font-medium ${style.text}`}>{style.label}</span>
                </div>
              </div>

              {step.started_at && (
                <p className="text-[10px] text-muted/30 mt-0.5">
                  {new Date(step.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}

              {step.error && (
                <div className="mt-2 text-[11px] text-error/80 font-mono bg-error/8 border border-error/15 rounded-lg px-2.5 py-2 leading-relaxed whitespace-pre-wrap">
                  {step.error}
                </div>
              )}

              {step.output && <CollapsibleText label="Output" content={step.output} />}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function CollapsibleJSON({ data }: { data: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-[10px] text-muted/40 hover:text-muted/70 transition-colors flex items-center gap-1"
      >
        <span className={`transition-transform duration-150 ${open ? "rotate-90" : ""}`}>{'\u203a'}</span>
        {open ? "Hide" : "Show"} details
        <span className="text-muted/25 ml-1">({Object.keys(data).length} keys)</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.pre
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden text-[10px] text-muted/60 font-mono mt-1.5 bg-background/60 rounded-lg border border-border/30 p-2.5 max-h-40 overflow-y-auto whitespace-pre-wrap scrollbar-thin"
          >
            {JSON.stringify(data, null, 2)}
          </motion.pre>
        )}
      </AnimatePresence>
    </div>
  );
}

function CollapsibleText({ label, content }: { label: string; content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-[10px] text-muted/40 hover:text-muted/70 transition-colors flex items-center gap-1"
      >
        <span className={`transition-transform duration-150 ${open ? "rotate-90" : ""}`}>{'\u203a'}</span>
        {open ? "Hide" : "Show"} {label.toLowerCase()}
      </button>
      <AnimatePresence>
        {open && (
          <motion.pre
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden text-[10px] text-muted/60 font-mono mt-1.5 bg-background/60 rounded-lg border border-border/30 p-2.5 max-h-48 overflow-y-auto whitespace-pre-wrap scrollbar-thin"
          >
            {content}
          </motion.pre>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-[11px] text-muted/30 text-center py-8">{label}</p>;
}

type Tab = "overview" | "trace" | "steps";

function TabBar({ active, onChange, tabs }: {
  active: Tab;
  onChange: (t: Tab) => void;
  tabs: { id: Tab; label: string; count?: number }[];
}) {
  return (
    <div className="flex items-center gap-0.5 border-b border-border/30 mb-5">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative px-3 py-2 text-[11px] font-medium transition-colors ${active === tab.id ? "text-foreground" : "text-muted/50 hover:text-muted"
            }`}
        >
          {tab.label}
          {tab.count != null && tab.count > 0 && (
            <span className={`ml-1.5 text-[9px] px-1.5 py-px rounded-full font-mono ${active === tab.id ? "bg-accent/20 text-accent" : "bg-surface text-muted/40"
              }`}>
              {tab.count}
            </span>
          )}
          {active === tab.id && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-px bg-foreground/60"
              transition={{ duration: 0.15 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}

interface ActivityLogDetailsProps {
  log: ActivityLog;
  isOpen: boolean;
}

const detailsCache = new Map<string, ActivityLogDetails>();

export function ActivityLogDetails({ log, isOpen }: ActivityLogDetailsProps) {
  const [details, setDetails] = useState<ActivityLogDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const cached = isOpen ? detailsCache.get(log.id) ?? null : null;
  const displayDetails = cached ?? details;
  const displayError = cached ? null : error;
  const loading = isOpen && !cached && details === null && error === null;

  useEffect(() => {
    if (!isOpen || cached) return;
    let cancelled = false;

    getLogDetails(log.id).then((result) => {
      if (!cancelled) {
        if (result.data) { detailsCache.set(log.id, result.data); setDetails(result.data); }
        else setError(result.error ?? "Failed to load");
      }
    });

    return () => { cancelled = true; };
  }, [log.id, isOpen, cached]);

  const sessionKey = `${log.id}-${isOpen}`;
  const [prevSessionKey, setPrevSessionKey] = useState(sessionKey);
  if (sessionKey !== prevSessionKey) {
    setPrevSessionKey(sessionKey);
    if (isOpen) setActiveTab("overview");
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "trace", label: "AI Trace", count: displayDetails?.trace?.length ?? 0 },
    { id: "steps", label: "Inngest Steps", count: displayDetails?.steps?.length ?? 0 },
  ];

  return (
    <tr>
      <td colSpan={5} className="p-0">
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
              className="overflow-hidden border-b border-border/30"
            >
              <div className="bg-surface/40 px-6 py-5 max-w-3xl">

                {loading && (
                  <div className="flex items-center justify-center py-14">
                    <div className="size-4 border-2 border-border/40 border-t-accent rounded-full animate-spin" />
                  </div>
                )}

                {!loading && displayError && (
                  <p className="text-[11px] text-muted/40 text-center py-14">{displayError}</p>
                )}

                {!loading && displayDetails && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
                    <TabBar active={activeTab} onChange={setActiveTab} tabs={tabs} />

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                      >
                        {activeTab === "overview" && <MetaBar details={displayDetails} log={log} />}
                        {activeTab === "trace" && <TraceTimeline trace={displayDetails.trace ?? []} />}
                        {activeTab === "steps" && <StepTimeline steps={displayDetails.steps ?? []} />}
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </td>
    </tr>
  );
}
