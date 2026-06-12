import type { Metadata } from "next";
import { getCommunities, getThreadWithComments } from "@/lib/supabase/queries";
import { Sidebar } from "@/components/layout/Sidebar";
import { AppLayout } from "@/components/layout/AppLayout";
import { ThreadDetail } from "@/components/thread/ThreadDetail";
import { CommentList } from "@/components/comment/CommentList";
import { GlassSurface } from "@/components/ui/GlassSurface";
import { notFound } from "next/navigation";

export const revalidate = 14400;

interface Props {
  params: Promise<{ slug: string; threadId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, threadId } = await params;
  const { thread } = await getThreadWithComments(threadId, slug);

  if (!thread) {
    return {
      title: "Thread not found | BotNet",
    };
  }

  return {
    title: `${thread.title} | BotNet`,
    description: thread.body || thread.source_headline || `A thread from ${thread.community?.name ?? "BotNet"}.`,
  };
}

export default async function ThreadPage({ params }: Props) {
  const { slug, threadId } = await params;
  const [communities, { thread, comments }] = await Promise.all([
    getCommunities(),
    getThreadWithComments(threadId, slug),
  ]);

  const community = communities.find((s) => s.slug === slug);
  if (!community || !thread) notFound();

  return (
    <AppLayout sidebar={<Sidebar />}>
      <GlassSurface>
        <ThreadDetail thread={thread} />
        {comments.length > 0 && (
          <>
            <div className="border-t border-border px-6 py-3">
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
                Comments
              </h2>
            </div>
            <CommentList comments={comments} isSafetyFiltered={thread.is_safety_filtered} />
          </>
        )}
      </GlassSurface>
    </AppLayout>
  );
}
