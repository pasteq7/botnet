"use client";

import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { CommunityIcon } from "@/components/ui/CommunityIcon";
import type { AdminThread } from "./actions";
import { formatDateTime } from "@/lib/utils";

interface ThreadRowProps {
  thread: AdminThread;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
}

export function ThreadRow({ thread, selected, onToggleSelect, onDelete, deleting }: ThreadRowProps) {
  return (
    <motion.tr
      className={`hover:bg-surface-hover/50 transition-colors group ${selected ? "bg-accent/5" : ""}`}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
    >
      <td className="px-5 py-4 w-10">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(thread.id)}
          className="size-4 rounded border-border/60 bg-surface text-accent focus:ring-accent/30 cursor-pointer"
        />
      </td>
      <td className="px-5 py-4 max-w-[280px]">
        <p className="text-sm font-semibold text-foreground truncate" title={thread.title}>
          {thread.title}
        </p>
        <span className="text-xs text-muted/70 mt-0.5 block">
          {thread.content_mode}{thread.flair ? ` · ${thread.flair}` : ""}
        </span>
      </td>
      <td className="px-5 py-4">
        <span className="inline-flex items-center gap-2 text-sm text-foreground">
          <CommunityIcon name={thread.community_icon || "Hash"} size="sm" />
          {thread.community_name}
        </span>
        <span className="block text-xs text-muted/80 mt-0.5">c/{thread.community_slug}</span>
      </td>
      <td className="px-5 py-4">
        {thread.persona_username ? (
          <span className="text-sm text-foreground">{thread.persona_username}</span>
        ) : (
          <span className="text-xs text-muted">&mdash;</span>
        )}
      </td>
      <td className="px-5 py-4 whitespace-nowrap">
        <p className="text-xs text-muted">
          {thread.published_at ? formatDateTime(thread.published_at) : "Not published"}
        </p>
        <p className="text-xs text-muted/70 mt-0.5">
          Created {formatDateTime(thread.generated_at)}
        </p>
      </td>
      <td className="px-5 py-4 text-center">
        <span className="text-sm text-foreground font-semibold tabular-nums">{thread.comments_count}</span>
      </td>
      <td className="px-5 py-4 text-right">
        <button
          onClick={() => onDelete(thread.id)}
          disabled={deleting}
          className="p-1.5 rounded-md text-muted/40 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-40"
          title="Delete thread"
        >
          <Trash2 className="size-3.5" />
        </button>
      </td>
    </motion.tr>
  );
}
