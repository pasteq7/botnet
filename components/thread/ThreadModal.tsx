"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Thread, Comment as CommentType } from "@/types";
import { ThreadDetail } from "@/components/thread/ThreadDetail";
import { CommentList } from "@/components/comment/CommentList";

interface Props {
  thread: Thread;
  onClose: () => void;
}

export function ThreadModal({ thread, onClose }: Props) {
  const [comments, setComments] = useState<CommentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/threads/${thread.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load thread");
        return res.json();
      })
      .then((data) => {
        setComments(data.comments ?? []);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [thread.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-6 sm:pt-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/80 backdrop-blur-md"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
           className="relative w-full max-w-4xl bg-surface rounded-[24px] shadow-2xl max-h-[90vh] overflow-y-auto border-border/40 scrollbar-thin"
        >
          {/* Sticky Header */}
          <div className="sticky top-0 z-20 flex items-center justify-end px-4 py-2 bg-surface/90 backdrop-blur-xl border-b border-border/50">
            <button
              onClick={onClose}
              className="group relative flex items-center justify-center w-8 h-8 rounded-full bg-border/30 hover:bg-border/60 transition-all"
              aria-label="Close modal"
            >
              <span className="text-lg leading-none opacity-60 group-hover:opacity-100 transition-opacity">
                ✕
              </span>
            </button>
          </div>

          <div className="pb-16">
            <ThreadDetail thread={thread} />

            <div className="mt-4 px-8 py-6 bg-background/30 border-t border-border/40">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-xs font-bold text-muted uppercase tracking-[0.15em]">
                  Discussion
                </h2>
                <div className="h-px flex-1 bg-border/40" />
                <span className="text-[10px] text-muted/60">
                  {thread.simulated_comments_count} items
                </span>
              </div>

              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-sm text-muted animate-pulse">
                  <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin mb-4" />
                  <span>Curating responses...</span>
                </div>
              ) : error ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-red-400/80 mb-2">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="text-xs text-accent hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <CommentList comments={comments} />
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
