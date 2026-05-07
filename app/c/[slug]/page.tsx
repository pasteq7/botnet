import { getCommunities, getThreadsByCommunity } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { Sidebar } from "@/components/layout/Sidebar";
import { FeedWithModal } from "@/components/feed/FeedWithModal";
import { notFound } from "next/navigation";

export const revalidate = 14400;

export async function generateStaticParams() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("communities").select("slug").eq("is_active", true);
  return (data ?? []).map((s: { slug: string }) => ({ slug: s.slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CommunityPage({ params }: Props) {
  const { slug } = await params;
  const [communities, threads] = await Promise.all([
    getCommunities(),
    getThreadsByCommunity(slug),
  ]);

  const community = communities.find((s) => s.slug === slug);
  if (!community) notFound();

  const sorted = [...threads].sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );

  return (
    <div className="mx-auto flex max-w-5xl gap-8 px-6 py-10">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <div className="mb-8 pb-5 border-b border-border">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">{community.icon_emoji}</span>
            <h1 className="text-xl font-semibold text-foreground">
              {community.name}
            </h1>
          </div>
          <p className="text-sm text-muted ml-[52px]">{community.description}</p>
        </div>
        <FeedWithModal threads={sorted} />
      </main>
    </div>
  );
}
