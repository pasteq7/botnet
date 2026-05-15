"use client";

import { User, Link2 } from "lucide-react";
import type { Thread } from "@/types";
import { isSearchFallback } from "@/lib/ai/url-utils";
import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import { CommunityIcon } from "@/components/ui/CommunityIcon";
import { timeAgo } from "@/lib/utils";
import { useLayout } from "@/components/layout/LayoutProvider";
import { BodyText } from "@/components/ui/BodyText";


interface Props {
  thread: Thread;
  onSelect?: (thread: Thread) => void;
}

export function PostCard({ thread, onSelect }: Props) {
  const { threadDisplay } = useLayout();

  return (
    <article
      className="surface-card px-5 py-4 cursor-pointer"
      onClick={() => onSelect?.(thread)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(thread);
        }
      }}
      tabIndex={0}
      role="button"
    >
      <div className="flex items-center gap-2 text-xs text-muted mb-2.5">
        <CommunityIcon name={thread.community?.icon_name || "Hash"} size="sm" />
        <span className="font-medium text-accent/80">{thread.community?.name}</span>
        <span className="text-border">·</span>
        {!thread.persona ? (
          <div className="size-5 rounded-full bg-muted/20 flex items-center justify-center">
            <User className="size-3 text-muted/40" />
          </div>
        ) : (
          <PersonaAvatar seed={thread.persona.avatar_seed} size="sm" />
        )}
        {!thread.persona ? (
          <>
            <span className="text-muted/40">Anonymous</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold text-muted/50 bg-muted/10 ring-1 ring-inset ring-muted/20 uppercase tracking-wider">Deleted</span>
          </>
        ) : (
          <span>{thread.persona.username}</span>
        )}
        <span className="text-border">·</span>
        <span>{timeAgo(thread.published_at)}</span>
      </div>

      <h3 className="text-[17px] font-semibold text-foreground leading-snug mb-1.5">
        {thread.title}
      </h3>

      <div className={"text-sm text-muted leading-relaxed mb-3" + (threadDisplay === "compact" ? " line-clamp-2" : "")}>
        <BodyText body={thread.body} expanded={threadDisplay === "expanded"} />
      </div>

      <div className="flex items-center gap-4 text-xs text-muted">
        {thread.flair && (
          <span className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted">
            {thread.flair}
          </span>
        )}
        <span>{thread.comments_count} comments</span>
        {(thread.content_mode === "news" || thread.content_mode === "web-search") && (
          <a
            href={
              thread.source_url ??
              `https://www.google.com/search?q=${encodeURIComponent(thread.title)}`
            }
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="ml-auto flex items-center gap-1 text-accent/60 hover:text-accent transition-colors"
          >
            <Link2 className="size-3" />
            <span>{(thread.source_url && !isSearchFallback(thread.source_url)) ? "Source" : "Search"}</span>
          </a>
        )}
      </div>
    </article>
  );
}
