"use client";

import { useState, useCallback } from "react";
import type { Thread } from "@/types";
import { PostFeed } from "./PostFeed";
import { ThreadModal } from "@/components/thread/ThreadModal";

interface Props {
  threads: Thread[];
}

export function FeedWithModal({ threads }: Props) {
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);

  const handleSelect = useCallback((thread: Thread) => {
    setSelectedThread(thread);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedThread(null);
  }, []);

  return (
    <>
      <PostFeed threads={threads} onSelectThread={handleSelect} />
      {selectedThread && (
        <ThreadModal thread={selectedThread} onClose={handleClose} />
      )}
    </>
  );
}
