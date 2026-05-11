"use client";

import { useState, useCallback, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Thread } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { PostFeed } from "./PostFeed";
import { ThreadModal } from "@/components/thread/ThreadModal";
import { NewThreadsIndicator } from "./NewThreadsIndicator";

interface Props {
  threads: Thread[];
  communityId?: string;
  communitySlug?: string;
}

export function FeedWithModal({ threads: initialThreads, communityId, communitySlug }: Props) {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>(initialThreads);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [newCount, setNewCount] = useState(0);
  const newCountRef = useRef(0);
  const [isPending, startTransition] = useTransition();
  const [skeletonCount, setSkeletonCount] = useState(0);

  const handleSelect = useCallback((thread: Thread) => {
    setSelectedThread(thread);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedThread(null);
  }, []);

  const handleRefresh = useCallback(() => {
    setSkeletonCount(newCountRef.current || 1);
    setNewCount(0);
    newCountRef.current = 0;
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  const fetchMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    try {
      const lastThread = threads[threads.length - 1];
      if (!lastThread) return;

      const params = new URLSearchParams();
      params.set("cursor", lastThread.published_at);
      if (communitySlug) params.set("slug", communitySlug);

      const res = await fetch(`/api/threads?${params.toString()}`);
      const data = await res.json();

      setThreads((prev) => [...prev, ...data.threads]);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error("Failed to load more threads:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, threads, communitySlug]);

  useEffect(() => {
    const supabase = createClient();
    const channelName = communityId
      ? `threads:community:${communityId}`
      : "threads:all";

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "threads",
          filter: communityId
            ? `community_id=eq.${communityId}`
            : undefined,
        },
        (payload) => {
          const row = payload.new as { is_ready: boolean; is_published: boolean };
          if (row.is_ready && row.is_published) {
            newCountRef.current += 1;
            setNewCount(newCountRef.current);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [communityId]);

  return (
    <>
      <NewThreadsIndicator count={newCount} onClick={handleRefresh} />
      <PostFeed
        threads={threads}
        onSelectThread={handleSelect}
        onLoadMore={fetchMore}
        loading={isPending}
        loadingMore={isLoadingMore}
        hasMore={hasMore}
        skeletonCount={skeletonCount}
      />
      {selectedThread && (
        <ThreadModal thread={selectedThread} onClose={handleClose} />
      )}
    </>
  );
}
