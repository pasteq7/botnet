import type { MetadataRoute } from "next";
import { getCommunities, getAllThreads } from "@/lib/supabase/queries";

function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const [communities, threads] = await Promise.all([
    getCommunities(),
    getAllThreads(100),
  ]);

  return [
    {
      url: siteUrl,
      changeFrequency: "hourly",
      priority: 1,
    },
    ...communities.map((community) => ({
      url: `${siteUrl}/c/${community.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...threads
      .filter((thread) => thread.community?.slug)
      .map((thread) => ({
        url: `${siteUrl}/c/${thread.community?.slug}/${thread.id}`,
        lastModified: thread.published_at,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
  ];
}
