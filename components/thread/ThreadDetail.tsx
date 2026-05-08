import type { Thread } from "@/types";
import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import { FreshnessBadge } from "@/components/ui/FreshnessBadge";
import { timeAgo } from "@/lib/utils";

interface Props {
  thread: Thread;
}

export function ThreadDetail({ thread }: Props) {
  return (
    <div className="px-8 pt-6 pb-6">
      <div className="flex items-center gap-2 text-xs text-muted mb-4">
        {thread.persona && (
          <PersonaAvatar seed={thread.persona.avatar_seed} size="sm" />
        )}
        <span>{thread.persona?.username}</span>
        <span className="text-border">·</span>
        <span>{timeAgo(thread.published_at)}</span>
        <span className="text-border">·</span>
        <FreshnessBadge dateStr={thread.published_at} />
      </div>

      <h1 className="text-3xl font-bold text-foreground leading-[1.15] mb-4 tracking-tight">
        {thread.title}
      </h1>

      {thread.flair && (
        <span className="inline-block border border-border rounded px-2 py-0.5 text-[11px] text-muted mb-4">
          {thread.flair}
        </span>
      )}

      <div className="text-[16px] text-foreground/90 leading-[1.8] whitespace-pre-wrap max-w-2xl mb-8">
        {thread.body}
      </div>

      {thread.source_url && (
        <div className="border-l-2 border-border pl-4 py-1">
          <p className="text-[11px] text-muted uppercase tracking-wide mb-1">Source</p>
          <a
            href={thread.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent hover:underline"
          >
            {thread.source_headline ?? thread.source_url}
          </a>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-border flex gap-5 text-sm text-muted">
        <span>{thread.simulated_comments_count} comments</span>
      </div>
    </div>
  );
}
