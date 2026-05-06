import { getSubreddits, getThreadWithComments } from "@/lib/supabase/queries";
import { Sidebar } from "@/components/layout/Sidebar";
import { ThreadDetail } from "@/components/thread/ThreadDetail";
import { CommentList } from "@/components/comment/CommentList";
import { notFound } from "next/navigation";

export const revalidate = 14400;

interface Props {
  params: Promise<{ slug: string; threadId: string }>;
}

export default async function ThreadPage({ params }: Props) {
  const { slug, threadId } = await params;
  const [subreddits, { thread, comments }] = await Promise.all([
    getSubreddits(),
    getThreadWithComments(threadId),
  ]);

  const subreddit = subreddits.find((s) => s.slug === slug);
  if (!subreddit || !thread) notFound();

  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <div className="rounded-lg border border-border bg-surface">
          <ThreadDetail thread={thread} />
          <div className="border-t border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
              Comments
            </h2>
          </div>
          <CommentList comments={comments} />
        </div>
      </main>
    </div>
  );
}
