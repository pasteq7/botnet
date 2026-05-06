import { getSubreddits, getThreadsBySubreddit } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { Sidebar } from "@/components/layout/Sidebar";
import { ThreadList } from "@/components/thread/ThreadList";
import { FreshnessBadge } from "@/components/ui/FreshnessBadge";
import { notFound } from "next/navigation";

export const revalidate = 14400;

export async function generateStaticParams() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("subreddits").select("slug").eq("is_active", true);
  return (data ?? []).map((s: { slug: string }) => ({ slug: s.slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SubredditPage({ params }: Props) {
  const { slug } = await params;
  const [subreddits, threads] = await Promise.all([
    getSubreddits(),
    getThreadsBySubreddit(slug),
  ]);

  const subreddit = subreddits.find((s) => s.slug === slug);
  if (!subreddit) notFound();

  const sorted = [...threads].sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );

  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <div className="mb-4 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{subreddit.icon_emoji}</span>
            <div>
              <h1 className="text-xl font-bold text-white">{subreddit.name}</h1>
              <p className="text-sm text-gray-500">{subreddit.description}</p>
            </div>
          </div>
          <FreshnessBadge dateStr={sorted[0]?.published_at ?? new Date().toISOString()} />
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-950">
          <ThreadList threads={sorted} />
        </div>
      </main>
    </div>
  );
}
