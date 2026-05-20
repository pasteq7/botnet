"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { ArrowUpRight, X } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { normalizeGenerationStatus, useOverlay } from "@/lib/overlay-store";
import { Loading } from "@/components/ui/Loading";

type StepKey = "setup" | "searching" | "routing" | "generating" | "saving" | "done";

const STEP_ORDER: StepKey[] = ["setup", "searching", "routing", "generating", "saving", "done"];

const STEP_LABELS: Record<StepKey, string> = {
  setup: "Initializing",
  searching: "Searching the web",
  routing: "Choosing a topic",
  generating: "Generating content",
  saving: "Saving to database",
  done: "Done",
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function ActiveStepIndicator() {
  return (
    <div className="flex size-7 shrink-0 items-center justify-center" aria-hidden="true">
      <Loading size={14} />
    </div>
  );
}

function SuccessIndicator() {
  return (
    <motion.div
      className="flex size-7 shrink-0 items-center justify-center rounded-full border border-success/35 bg-success/10 text-success"
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      aria-hidden="true"
    >
      <svg className="size-4" viewBox="0 0 16 16" fill="none">
        <motion.path
          d="M3.5 8.2 6.6 11.1 12.7 4.9"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.34, ease: "easeOut", delay: 0.06 }}
        />
      </svg>
    </motion.div>
  );
}

function FailedIndicator() {
  return (
    <motion.div
      className="flex size-7 shrink-0 items-center justify-center rounded-full border border-error/35 bg-error/10 text-error"
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      aria-hidden="true"
    >
      <svg className="size-3.5" viewBox="0 0 16 16" fill="none">
        <path d="M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </motion.div>
  );
}

function SkippedIndicator() {
  return (
    <motion.div
      className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface-hover text-muted"
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      aria-hidden="true"
    >
      <span className="h-px w-2.5 rounded-full bg-current" />
    </motion.div>
  );
}

function StepPipeline({ currentStep }: { currentStep: string | null }) {
  const currentIdx = currentStep ? STEP_ORDER.indexOf(currentStep as StepKey) : -1;
  const pipelineSteps = STEP_ORDER.slice(0, -1);

  return (
    <div className="mt-2.5 grid grid-cols-5 gap-1.5" aria-hidden="true">
      {pipelineSteps.map((step, idx) => {
        const isPast = idx < currentIdx;
        const isActive = idx === currentIdx;

        return (
          <motion.span
            key={step}
            className={`h-1 rounded-full ${isPast || isActive ? "bg-accent" : "bg-border/50"}`}
            initial={false}
            animate={{
              opacity: isActive ? [0.55, 1, 0.55] : isPast ? 0.9 : 0.55,
            }}
            transition={isActive ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.18 }}
          />
        );
      })}
    </div>
  );
}

export function GenerationStatusOverlay() {
  const { entries, updateEntry, dismissEntry } = useOverlay();
  const trackedIds = useRef(new Set<string>());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("generation-logs-overlay")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "generation_logs" },
        (payload) => {
          const row = payload.new as {
            id: string;
            status: string;
            current_step: string | null;
            error_message: string | null;
            thread_id: string | null;
          };
          if (trackedIds.current.has(row.id)) {
            const status = normalizeGenerationStatus(row.status);
            updateEntry(row.id, {
              status,
              current_step: row.current_step,
              error_message: row.error_message,
              thread_id: row.thread_id,
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [updateEntry]);

  useEffect(() => {
    trackedIds.current = new Set(entries.map((e) => e.logId));
  }, [entries]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const timers = entries
      .filter((e) => e.status === "success" || e.status === "skipped" || e.status === "failed")
      .map((e) => setTimeout(() => dismissEntry(e.logId), 10000));
    return () => timers.forEach(clearTimeout);
  }, [entries, dismissEntry]);

  if (entries.length === 0) return null;

  const visible = entries.slice(0, 4);
  const stacked = entries.length - 4;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex w-[min(22rem,calc(100vw-3rem))] flex-col gap-2.5 pointer-events-none">
      <LayoutGroup>
        <AnimatePresence mode="popLayout">
          {visible.map((entry) => {
            const elapsed = Math.floor((now - entry.triggeredAt) / 1000);
            const stepKey = entry.current_step as StepKey | null;
            const isActive = entry.status === "queued" || entry.status === "running";
            const label =
              entry.status === "failed"
                ? (entry.error_message ?? "Generation failed")
                : entry.status === "skipped"
                  ? (entry.error_message ?? "Generation skipped")
                  : entry.status === "success"
                    ? "Post is live"
                    : isActive && !stepKey
                      ? "Queued"
                      : stepKey
                        ? STEP_LABELS[stepKey]
                        : "Initializing";

            return (
              <motion.div
                key={entry.logId}
                layout
                initial={{ opacity: 0, y: 10, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.985, transition: { duration: 0.16 } }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className={`pointer-events-auto relative overflow-hidden rounded-lg border bg-surface/95 p-3.5 shadow-lg backdrop-blur flex flex-col gap-1 ${
                  entry.status === "failed"
                    ? "border-error/30"
                    : entry.status === "success"
                      ? "border-success/20"
                      : "border-border/60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {isActive ? (
                      <ActiveStepIndicator />
                    ) : entry.status === "success" ? (
                      <SuccessIndicator />
                    ) : entry.status === "skipped" ? (
                      <SkippedIndicator />
                    ) : (
                      <FailedIndicator />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                        {entry.communitySlug}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-muted/70">
                        {formatDuration(elapsed)}
                      </span>
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.p
                        key={entry.current_step ?? entry.status}
                        initial={{ opacity: 0, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -3 }}
                        transition={{ duration: 0.14 }}
                        className={`mt-0.5 truncate text-sm font-medium ${
                          entry.status === "failed"
                            ? "text-error"
                            : entry.status === "success"
                              ? "text-success"
                              : "text-foreground"
                        }`}
                      >
                        {label}
                      </motion.p>
                    </AnimatePresence>

                    {isActive ? (
                      <StepPipeline currentStep={entry.current_step} />
                    ) : (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.08 }}
                        className="mt-1.5 text-xs leading-relaxed text-muted/75"
                      >
                        {entry.status === "success"
                          ? "Published successfully"
                          : entry.status === "skipped"
                            ? "Nothing new to post"
                            : "Check logs for details"}
                      </motion.p>
                    )}
                  </div>

                  <div className="ml-1 mt-0.5 flex shrink-0 items-center gap-1">
                    {entry.status === "success" && entry.thread_id && (
                      <Link
                        href={`/c/${entry.communitySlug}/${entry.thread_id}`}
                        className="rounded-md p-1 text-muted hover:bg-surface-hover hover:text-accent"
                        title="View post"
                      >
                        <ArrowUpRight className="size-4" />
                      </Link>
                    )}
                    <button
                      onClick={() => dismissEntry(entry.logId)}
                      className="rounded-md p-1 text-muted hover:bg-surface-hover hover:text-foreground"
                      aria-label="Dismiss generation status"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                {entry.status === "failed" && entry.error_message && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-1 border-t border-error/10 pt-2 font-mono text-[10px] leading-tight text-error/70"
                  >
                    {entry.error_message}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </LayoutGroup>

      {stacked > 0 && (
        <motion.div
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-1 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-muted/60"
        >
          +{stacked} more in queue
        </motion.div>
      )}
    </div>
  );
}
