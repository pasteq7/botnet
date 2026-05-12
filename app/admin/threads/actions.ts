"use server"

import { createClient } from "@supabase/supabase-js";

export interface AdminThread {
  id: string;
  community_id: string;
  persona_id: string | null;
  title: string;
  comments_count: number;
  flair: string;
  published_at: string | null;
  content_mode: string;
  is_published: boolean;
  generated_at: string;
  community_name: string;
  community_slug: string;
  community_icon: string;
  persona_username: string | null;
  persona_avatar_seed: string | null;
  persona_archetype: string | null;
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: { persistSession: false },
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
      },
    }
  );
}

export async function getThreads(params?: {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  communityId?: string;
  search?: string;
}) {
  try {
    const supabase = getSupabase();
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 50;
    const offset = (page - 1) * limit;
    const sort = params?.sort ?? "published_at";
    const order = params?.order ?? "desc";

    let query = supabase
      .from("threads")
      .select("*, communities!inner(name, slug, icon_emoji), personas!left(username, avatar_seed, archetype)", { count: "exact" });

    if (params?.communityId) {
      query = query.eq("community_id", params.communityId);
    }

    if (params?.search) {
      query = query.ilike("title", `%${params.search}%`);
    }

    const { data: threads, error: dbError, count } = await query
      .order(sort === "comments_count" ? "comments_count" : "published_at", { ascending: order === "asc" })
      .range(offset, offset + limit - 1);

    if (dbError) throw new Error(`Database query failed: ${dbError.message}`);

    const items: AdminThread[] = (threads ?? []).map((t) => {
      const community = t.communities as Record<string, unknown> | null;
      const persona = t.personas as Record<string, unknown> | null;
      return {
        id: t.id as string,
        community_id: t.community_id as string,
        persona_id: (t.persona_id as string | null) ?? null,
        title: t.title as string,
        comments_count: (t.comments_count as number) ?? 0,
        flair: (t.flair as string) ?? "",
        published_at: (t.published_at as string | null) ?? null,
        content_mode: (t.content_mode as string) ?? "news",
        is_published: (t.is_published as boolean) ?? false,
        generated_at: (t.generated_at as string) ?? t.created_at as string,
        community_name: (community?.name as string) ?? "Unknown",
        community_slug: (community?.slug as string) ?? "",
        community_icon: (community?.icon_emoji as string) ?? "",
        persona_username: (persona?.username as string | null) ?? null,
        persona_avatar_seed: (persona?.avatar_seed as string | null) ?? null,
        persona_archetype: (persona?.archetype as string | null) ?? null,
      };
    });

    return {
      data: items,
      total: count ?? 0,
      page,
      limit,
      hasMore: (count ?? 0) > offset + limit,
    };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export async function deleteThread(threadId: string) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("threads")
      .delete()
      .eq("id", threadId);

    if (error) throw new Error(`Delete failed: ${error.message}`);
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
