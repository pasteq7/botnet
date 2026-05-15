"use client";

import { User } from "lucide-react";
import type { Thread } from "@/types";
import { isSearchFallback } from "@/lib/ai/url-utils";
import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import { FreshnessBadge } from "@/components/ui/FreshnessBadge";
import { CommunityIcon } from "@/components/ui/CommunityIcon";
import { useLayout } from "@/components/layout/LayoutProvider";
import { BodyText } from "@/components/ui/BodyText";


interface Props {
  thread: Thread;
}

function resolveSource(thread: Thread): { url: string; label: string; isSearch: boolean } | null {
  const isSourceMode = thread.content_mode === "news" || thread.content_mode === "web-search";
  if (thread.source_url) {
    const isFallback = isSearchFallback(thread.source_url);
    return {
      url: thread.source_url,
      label: isFallback
        ? `Search: ${thread.title}`
        : (thread.source_headline ?? thread.source_url),
      isSearch: isFallback,
    };
  }
  if (isSourceMode) {
    return {
      url: `https://www.google.com/search?q=${encodeURIComponent(thread.title)}`,
      label: `Search: ${thread.title}`,
      isSearch: true,
    };
  }
  return null;
}

export function ThreadDetail({ thread }: Props) {
  const { threadDisplay } = useLayout();

  return (
    <div className="px-8 pt-6 pb-6">
      <div className="flex items-center gap-2 text-xs text-muted mb-4">
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
          <>
            <span className="text-border">·</span>
            <div className="flex items-center gap-1.5">
              <CommunityIcon name={thread.community?.icon_name ?? "Hash"} size="sm" />
              <span>{thread.community?.name}</span>
            </div>
          </>

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

      <div className={"text-[16px] text-foreground/90 leading-[1.8] mb-8" + (threadDisplay === "compact" ? " max-w-2xl whitespace-pre-wrap" : "")}>
        <BodyText body={thread.body} expanded={threadDisplay === "expanded"} />
      </div>

      {(() => {
        const src = resolveSource(thread);
        if (!src) return null;
        return (
          <div className="border-l-2 border-border pl-4 py-1">
            <p className="text-[11px] text-muted uppercase tracking-wide mb-1">
              {src.isSearch ? "Search" : "Source"}
            </p>
            <a
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent hover:underline break-all"
            >
              {src.label}
            </a>
          </div>
        );
      })()}

      <div className="mt-6 pt-4 border-t border-border flex gap-5 text-sm text-muted">
        <span>{thread.comments_count} comments</span>
      </div>
    </div>
  );
}
