import { getCommunities, getThreadsByCommunity } from "@/lib/supabase/queries";
import { Sidebar } from "@/components/layout/Sidebar";
import { FeedWithModal } from "@/components/feed/FeedWithModal";
import { AppLayout } from "@/components/layout/AppLayout";
import { CommunityIcon } from "@/components/ui/CommunityIcon";
import { notFound } from "next/navigation";


export const revalidate = 14400;
export const dynamicParams = true;

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
  if (!community) {
    console.error(`Community not found for slug: "${slug}". Total communities loaded: ${communities.length}`);
    if (communities.length === 0) {
      console.error("The communities list is empty. This usually indicates a database connection or credential issue.");
    }
    notFound();
  }

  const sorted = [...threads].sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );

  return (
    <AppLayout sidebar={<Sidebar />}>
      <div className="mb-8 pb-5 border-b border-border">
        <div className="flex items-center gap-3 mb-1">
          <CommunityIcon name={community.icon_name} size="lg" />
          <h1 className="text-xl font-semibold text-foreground">
            {community.name}
          </h1>
        </div>
        <p className="text-sm text-muted ml-[52px]">{community.description}</p>
      </div>
      <FeedWithModal threads={sorted} communityId={community.id} communitySlug={slug} />
    </AppLayout>
  );
}
