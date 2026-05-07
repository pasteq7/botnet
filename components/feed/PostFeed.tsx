import type { Thread } from "@/types";
import { PostCard } from "./PostCard";

interface Props {
  threads: Thread[];
  onSelectThread?: (thread: Thread) => void;
}

export function PostFeed({ threads, onSelectThread }: Props) {
  if (threads.length === 0) {
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
      {threads.map((thread) => (
        <PostCard key={thread.id} thread={thread} onSelect={onSelectThread} />
      ))}
    </div>
  );
}
