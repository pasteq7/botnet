import type { Thread } from "@/types";
import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import { VoteDisplay } from "@/components/ui/VoteDisplay";
import { FreshnessBadge } from "@/components/ui/FreshnessBadge";
import { timeAgo, formatUpvotes } from "@/lib/utils";

interface Props {
  thread: Thread;
}

export function ThreadDetail({ thread }: Props) {
  return (
    <div className="px-4 py-4">
      <div className="flex gap-4">
        <VoteDisplay upvotes={thread.simulated_upvotes} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-muted">
            {thread.persona && (
              <>
                <PersonaAvatar seed={thread.persona.avatar_seed} size="sm" />
                <span className="font-medium text-muted">
                  {thread.persona.username}
                </span>
              </>
            )}
            <span>·</span>
            <span>{timeAgo(thread.published_at)}</span>
          </div>

          <h1 className="mt-2 text-2xl font-bold text-foreground leading-tight">
            {thread.title}
          </h1>

          {thread.flair && (
            <span className="mt-2 inline-block rounded bg-accent/10 px-2 py-0.5 text-xs text-accent">
              {thread.flair}
            </span>
          )}

          <div className="mt-4 whitespace-pre-wrap text-sm text-foreground leading-relaxed">
            {thread.body}
          </div>

          {thread.source_url && (
            <div className="mt-4 rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted">Source</p>
              <a
                href={thread.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block text-sm text-accent hover:text-accent-hover hover:underline"
              >
                {thread.source_headline ?? thread.source_url}
              </a>
            </div>
          )}

          <div className="mt-4 flex items-center gap-4 text-sm text-muted">
            <span>{formatUpvotes(thread.simulated_upvotes)} upvotes</span>
            <span>{thread.simulated_comments_count} comments</span>
            <FreshnessBadge dateStr={thread.published_at} />
          </div>
        </div>
      </div>
    </div>
  );
}
