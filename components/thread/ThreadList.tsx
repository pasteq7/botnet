import type { Thread } from "@/types";
import { ThreadCard } from "./ThreadCard";

interface Props {
  threads: Thread[];
}

export function ThreadList({ threads }: Props) {
  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted">
        <span className="text-4xl">🧘</span>
        <p className="mt-4 text-lg">No threads yet. The bots are generating...</p>
        <p className="mt-1 text-sm">Check back in a few hours.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {threads.map((thread) => (
        <ThreadCard key={thread.id} thread={thread} />
      ))}
    </div>
  );
}
