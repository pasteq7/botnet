import type { Thread } from "@/types";
import { PostCard } from "./PostCard";
import { PostCardSkeleton } from "./PostCardSkeleton";

interface Props {
  threads: Thread[];
  onSelectThread?: (thread: Thread) => void;
  loading?: boolean;
  skeletonCount?: number;
}

export function PostFeed({ threads, onSelectThread, loading, skeletonCount = 3 }: Props) {
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
    </div>
  );
}
