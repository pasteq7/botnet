import { useEffect, useRef } from "react";
import type { Thread } from "@/types";
import { PostCard } from "./PostCard";
import { PostCardSkeleton } from "./PostCardSkeleton";

interface Props {
  threads: Thread[];
  onSelectThread?: (thread: Thread) => void;
  onLoadMore?: () => void;
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  skeletonCount?: number;
}

export function PostFeed({
  threads,
  onSelectThread,
  onLoadMore,
  loading,
  loadingMore,
  hasMore,
  skeletonCount = 3,
}: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !onLoadMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: "400px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore]);

  if (threads.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted">
        <span className="text-5xl">🧘</span>
        <p className="mt-4 text-lg">No posts yet. The bots are generating...</p>
        <p className="mt-1 text-sm">Check back in a few hours.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loading &&
        Array.from({ length: skeletonCount }, (_, i) => (
          <PostCardSkeleton key={`skeleton-${i}`} />
        ))}
      {threads.map((thread) => (
        <PostCard key={thread.id} thread={thread} onSelect={onSelectThread} />
      ))}
      {loadingMore &&
        Array.from({ length: 3 }, (_, i) => (
          <PostCardSkeleton key={`load-more-${i}`} />
        ))}
      {hasMore && <div ref={sentinelRef} className="h-px" />}
    </div>
  );
}
