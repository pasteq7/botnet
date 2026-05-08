"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Thread } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { PostFeed } from "./PostFeed";
import { ThreadModal } from "@/components/thread/ThreadModal";
import { NewThreadsIndicator } from "./NewThreadsIndicator";

interface Props {
  threads: Thread[];
  communityId?: string;
}

export function FeedWithModal({ threads, communityId }: Props) {
  const router = useRouter();
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [newCount, setNewCount] = useState(0);
  const newCountRef = useRef(0);

  const handleSelect = useCallback((thread: Thread) => {
    setSelectedThread(thread);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedThread(null);
  }, []);

  const handleRefresh = useCallback(() => {
    setNewCount(0);
    newCountRef.current = 0;
    router.refresh();
  }, [router]);

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
      <PostFeed threads={threads} onSelectThread={handleSelect} />
      {selectedThread && (
        <ThreadModal thread={selectedThread} onClose={handleClose} />
      )}
    </>
  );
}
