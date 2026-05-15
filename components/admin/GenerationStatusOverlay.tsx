"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useOverlay, type GenerationStatus } from "@/lib/overlay-store";
import { Loader, Check, X, ArrowUpRight } from "lucide-react";
import Link from "next/link";

type StepKey = "setup" | "searching" | "routing" | "generating" | "saving" | "done";

const STEP_ORDER: StepKey[] = ["setup", "searching", "routing", "generating", "saving", "done"];

const STEP_LABELS: Record<StepKey, string> = {
  setup: "Initializing...",
  searching: "Searching the web...",
  routing: "Choosing a topic...",
  generating: "Generating content...",
  saving: "Saving to database...",
  done: "Done",
};

function StatusIcon({ status }: { status: GenerationStatus }) {
  switch (status) {
    case "queued":
      return <Loader className="size-3.5 animate-spin text-accent" />;
    case "success":
      return <Check className="size-3.5 text-success" />;
    case "skipped":
      return <X className="size-3.5 text-muted" />;
    case "failed":
      return <X className="size-3.5 text-error" />;
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function ProgressBar({ currentStep, status }: { currentStep: string | null; status: GenerationStatus }) {
  const currentIdx = currentStep ? STEP_ORDER.indexOf(currentStep as StepKey) : -1;
  if (currentIdx < 0) return null;

  const totalSteps = STEP_ORDER.length - 1; // excluding 'done' for progress
  const progress = status !== "queued" ? 100 : (currentIdx / totalSteps) * 100;

  return (
    <div className="h-1 w-full bg-border/30 rounded-full mt-2 overflow-hidden">
      <motion.div
        className="h-full bg-accent"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: "circOut" }}
      />
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
        {
          event: "*",
          schema: "public",
          table: "generation_logs",
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            status: string;
            current_step: string | null;
            error_message: string | null;
            thread_id: string | null;
          };
          if (trackedIds.current.has(row.id)) {
            updateEntry(row.id, {
              status: row.status as GenerationStatus,
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
    <div className="fixed bottom-8 right-8 z-[100] w-80 flex flex-col gap-3 pointer-events-none">
      <LayoutGroup>
        <AnimatePresence mode="popLayout">
          {visible.map((entry) => {
            const elapsed = Math.floor((now - entry.triggeredAt) / 1000);
            const stepKey = entry.current_step as StepKey | null;
            const label = entry.status === "failed"
              ? (entry.error_message ?? "Generation failed")
              : entry.status === "skipped"
                ? (entry.error_message ?? "Generation skipped")
                : entry.status === "success"
                  ? (STEP_LABELS["done"] ?? "Post is live!")
                  : stepKey
                    ? (STEP_LABELS[stepKey] ?? entry.current_step)
                    : "Initializing...";
            const isDone = entry.status !== "queued";

            return (
              <motion.div
                key={entry.logId}
                layout
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 10, scale: 0.95, transition: { duration: 0.2 } }}
                className={`pointer-events-auto relative overflow-hidden rounded-xl border bg-surface p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col gap-2 ${
                  entry.status === "failed" ? "border-error/30" : "border-border/60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    <StatusIcon status={entry.status} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold tracking-widest uppercase text-foreground/60 truncate">
                        {entry.communitySlug}
                      </span>
                      <span className="text-[10px] font-mono text-muted/60 shrink-0">
                        {formatDuration(elapsed)}
                      </span>
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.p
                        key={entry.current_step ?? "starting"}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="text-sm font-medium text-foreground mt-1"
                      >
                        {label}
                      </motion.p>
                    </AnimatePresence>

                    {isDone ? (
                      <p className="text-xs mt-1.5 leading-relaxed">
                        {entry.status === "success" ? (
                          <span className="text-success">Discussion live on platform</span>
                        ) : (
                          <span className={entry.status === "skipped" ? "text-muted" : "text-error/80"}>
                            {entry.status === "skipped" ? "Generation skipped" : "Generation failed"}
                          </span>
                        )}
                      </p>
                    ) : (
                      <ProgressBar currentStep={entry.current_step} status={entry.status} />
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    {entry.status === "success" && entry.thread_id && (
                      <Link
                        href={`/c/${entry.communitySlug}/${entry.thread_id}`}
                        className="p-1 rounded-md hover:bg-surface-hover text-muted hover:text-accent transition-colors"
                        title="View post"
                      >
                        <ArrowUpRight className="size-4" />
                      </Link>
                    )}
                    <button
                      onClick={() => dismissEntry(entry.logId)}
                      className="p-1 rounded-md hover:bg-surface-hover text-muted hover:text-foreground transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                {entry.status === "failed" && entry.error_message && (
                  <div className="mt-1 pt-2 border-t border-error/10 font-mono text-[10px] text-error/70 leading-tight">
                    {entry.error_message}
                  </div>
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
          className="text-center text-[10px] font-bold tracking-[0.2em] uppercase text-muted/60 py-1"
        >
          +{stacked} more in queue
        </motion.div>
      )}
    </div>
  );
}
