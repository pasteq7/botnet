"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import type { AdminThread } from "./actions";
import { formatDateTime } from "@/lib/utils";

interface ThreadRowProps {
  thread: AdminThread;
  onDelete: (id: string) => void;
  deleting: boolean;
}

export function ThreadRow({ thread, onDelete, deleting }: ThreadRowProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <motion.tr
      className="hover:bg-surface-hover/50 transition-colors group"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
    >
      <td className="px-5 py-4 max-w-[280px]">
        <p className="text-sm text-foreground/80 font-medium truncate" title={thread.title}>
          {thread.title}
        </p>
        <span className="text-[10px] text-muted/50 mt-0.5 block">
          {thread.content_mode}{thread.flair ? ` · ${thread.flair}` : ""}
        </span>
      </td>
      <td className="px-5 py-4">
        <span className="text-sm text-foreground/80">
          {thread.community_icon} {thread.community_name}
        </span>
        <span className="block text-[10px] text-muted mt-0.5">c/{thread.community_slug}</span>
      </td>
      <td className="px-5 py-4">
        {thread.persona_username ? (
          <>
            <span className="text-sm text-foreground/80">{thread.persona_username}</span>
            {thread.persona_archetype && (
              <span className="block text-[10px] text-muted mt-0.5">{thread.persona_archetype}</span>
            )}
          </>
        ) : (
          <span className="text-xs text-muted">&mdash;</span>
        )}
      </td>
      <td className="px-5 py-4 whitespace-nowrap">
        <p className="text-xs text-muted">
          {thread.published_at ? formatDateTime(thread.published_at) : "Not published"}
        </p>
        <p className="text-[10px] text-muted/50 mt-0.5">
          Created {formatDateTime(thread.generated_at)}
        </p>
      </td>
      <td className="px-5 py-4 text-center">
        <span className="text-sm text-foreground/80 font-medium tabular-nums">{thread.comments_count}</span>
      </td>
      <td className="px-5 py-4 text-right">
        {confirming ? (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setConfirming(false)}
              disabled={deleting}
              className="px-2 py-1 text-[10px] font-medium rounded-md border border-border/60 bg-surface hover:bg-surface-hover transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={() => onDelete(thread.id)}
              disabled={deleting}
              className="px-2 py-1 text-[10px] font-medium rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors disabled:opacity-40"
            >
              {deleting ? "..." : "Confirm"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="p-1.5 rounded-md text-muted/40 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
            title="Delete thread"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </td>
    </motion.tr>
  );
}
