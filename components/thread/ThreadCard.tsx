import type { Thread } from "@/types";
import Link from "next/link";
import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import { VoteDisplay } from "@/components/ui/VoteDisplay";
import { timeAgo } from "@/lib/utils";

interface Props {
  thread: Thread;
}

export function ThreadCard({ thread }: Props) {
  return (
    <Link href={`/r/${thread.subreddit?.slug ?? ""}/${thread.id}`}>
      <article className="flex gap-3 px-4 py-3 transition-colors hover:bg-surface-hover">
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
            <span>{thread.subreddit?.name}</span>
            <span>·</span>
            <span>{timeAgo(thread.published_at)}</span>
          </div>
          <h3 className="mt-1 text-base font-medium text-foreground leading-snug">
            {thread.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted">
            {thread.body}
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted">
            {thread.flair && (
              <span className="rounded px-1.5 py-0.5 text-accent">
                {thread.flair}
              </span>
            )}
            <span>{thread.simulated_comments_count} comments</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
