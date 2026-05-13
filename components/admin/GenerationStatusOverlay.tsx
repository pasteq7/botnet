"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useOverlay, type GenerationStatus } from "@/lib/overlay-store";
import { Loader, Check, X } from "lucide-react";

const STEP_LABELS: Record<string, string> = {
  setup: "Loading community\u2026",
  routing: "Finding content\u2026",
  generating: "Writing thread\u2026",
  saving: "Saving\u2026",
  done: "Done",
};

function StatusIcon({ status }: { status: GenerationStatus }) {
  switch (status) {
    case "queued":
      return <Loader className="size-3 animate-spin text-accent" />;
    case "success":
      return <Check className="size-3 text-success" />;
    case "skipped":
      return <X className="size-3 text-warning" />;
    case "failed":
      return <X className="size-3 text-error" />;
  }
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
      .filter((e) => e.status === "success" || e.status === "skipped")
      .map((e) => setTimeout(() => dismissEntry(e.logId), 8000));
    return () => timers.forEach(clearTimeout);
  }, [entries, dismissEntry]);

  if (entries.length === 0) return null;

  const visible = entries.slice(0, 4);
  const stacked = entries.length - 4;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 space-y-2">
      <AnimatePresence mode="popLayout">
        {visible.map((entry) => {
          const elapsed = Math.floor((now - entry.triggeredAt) / 1000);
          const label =
            entry.current_step
              ? STEP_LABELS[entry.current_step] ?? entry.current_step
              : "Starting\u2026";
          const isDone = entry.status !== "queued";

          return (
            <motion.div
              key={entry.logId}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-lg border border-border/60 bg-surface shadow-lg p-3 flex items-start gap-3"
            >
              <div className="mt-0.5 shrink-0">
                <StatusIcon status={entry.status} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    r/{entry.communitySlug}
                  </span>
                  <span className="text-xs text-muted/60 shrink-0 whitespace-nowrap">
                    {elapsed}s ago
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  <motion.p
                    key={entry.current_step ?? "starting"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="text-xs text-muted mt-0.5"
                  >
                    {isDone && entry.current_step === "done"
                      ? entry.status === "success"
                        ? "Done"
                        : entry.status === "skipped"
                          ? "Skipped"
                          : "Failed"
                      : label}
                  </motion.p>
                </AnimatePresence>

                {entry.status === "failed" && entry.error_message && (
                  <p className="text-xs text-error mt-1 truncate">
                    {entry.error_message}
                  </p>
                )}
              </div>

              {isDone && (
                <button
                  onClick={() => dismissEntry(entry.logId)}
                  className="shrink-0 text-muted hover:text-foreground transition-colors"
                >
                  <X className="size-3" />
                </button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {stacked > 0 && (
        <div className="text-center text-xs text-muted/60">
          +{stacked} more
        </div>
      )}
    </div>
  );
}
