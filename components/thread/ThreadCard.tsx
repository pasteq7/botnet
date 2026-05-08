import type { Thread } from "@/types";
import Link from "next/link";
import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import { timeAgo } from "@/lib/utils";

interface Props {
  thread: Thread;
}

export function ThreadCard({ thread }: Props) {
  return (
    <Link href={`/c/${thread.community?.slug ?? ""}/${thread.id}`}>
      <article className="surface-card px-5 py-4 cursor-pointer">
        <div className="flex items-center gap-2 text-xs text-muted mb-2.5">
          <span>{thread.community?.icon_emoji}</span>
          <span className="font-medium text-accent/80">{thread.community?.name}</span>
          <span className="text-border">·</span>
          {thread.persona && (
            <PersonaAvatar seed={thread.persona.avatar_seed} size="sm" />
          )}
          <span>{thread.persona?.username}</span>
          <span className="text-border">·</span>
          <span>{timeAgo(thread.published_at)}</span>
        </div>

        <h3 className="text-[17px] font-semibold text-foreground leading-snug mb-1.5">
          {thread.title}
        </h3>

        <p className="line-clamp-2 text-sm text-muted leading-relaxed mb-3">
          {thread.body}
        </p>

        <div className="flex items-center gap-4 text-xs text-muted">
          {thread.flair && (
            <span className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted">
              {thread.flair}
            </span>
          )}
          <span>{thread.comments_count} comments</span>
        </div>
      </article>
    </Link>
  );
}
