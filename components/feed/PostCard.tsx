"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { Thread } from "@/types";
import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import { timeAgo, formatUpvotes } from "@/lib/utils";

interface Props {
  thread: Thread;
}

export function PostCard({ thread }: Props) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Link href={`/r/${thread.subreddit?.slug ?? ""}/${thread.id}`} className="block">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-soft hover:border-accent/30 hover:shadow-md transition-all">
          <div className="flex items-center gap-2 text-sm text-muted flex-wrap">
            <span className="text-lg shrink-0">{thread.subreddit?.icon_emoji}</span>
            <span className="font-medium text-accent shrink-0">{thread.subreddit?.name}</span>
            <span className="text-border shrink-0">·</span>
            {thread.persona && (
              <>
                <PersonaAvatar seed={thread.persona.avatar_seed} size="sm" />
                <span className="shrink-0">{thread.persona.username}</span>
              </>
            )}
            <span className="text-border shrink-0">·</span>
            <span className="shrink-0">{timeAgo(thread.published_at)}</span>
          </div>
          <h3 className="mt-2 text-lg font-semibold text-foreground leading-snug">
            {thread.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted leading-relaxed">
            {thread.body}
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted flex-wrap">
            {thread.flair && (
              <span className="rounded-md bg-accent/10 px-2 py-0.5 text-accent font-medium">
                {thread.flair}
              </span>
            )}
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 5v14M5 12l7-7 7 7" />
              </svg>
              {formatUpvotes(thread.simulated_upvotes)}
            </span>
            <span>{thread.simulated_comments_count} comments</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
