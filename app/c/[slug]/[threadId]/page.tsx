import { getCommunities, getThreadWithComments } from "@/lib/supabase/queries";
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
  const [communities, { thread, comments }] = await Promise.all([
    getCommunities(),
    getThreadWithComments(threadId),
  ]);

  const community = communities.find((s) => s.slug === slug);
  if (!community || !thread) notFound();

  return (
    <div className="mx-auto flex max-w-5xl gap-8 px-6 py-10">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <div className="surface-card">
          <ThreadDetail thread={thread} />
          <div className="border-t border-border px-6 py-3">
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
