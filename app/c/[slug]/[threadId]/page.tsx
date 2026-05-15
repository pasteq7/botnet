import { getCommunities, getThreadWithComments } from "@/lib/supabase/queries";
import { Sidebar } from "@/components/layout/Sidebar";
import { AppLayout } from "@/components/layout/AppLayout";
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
    <AppLayout sidebar={<Sidebar />}>
      <div className="surface-card">
        <ThreadDetail thread={thread} />
        <div className="border-t border-border px-6 py-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
            Comments
          </h2>
        </div>
        <CommentList comments={comments} isSafetyFiltered={thread.is_safety_filtered} />
      </div>
    </AppLayout>
  );
}
