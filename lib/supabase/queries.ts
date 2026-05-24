import { createAdminClient } from "@/lib/supabase/admin";
import type { Thread, Community } from "@/types";

export async function getCommunities(): Promise<Community[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Error fetching communities:", error.message);
    return [];
  }
  return data ?? [];
}


export async function getThreadsByCommunity(slug: string, limit = 20, cursor?: string): Promise<Thread[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("threads")
    .select("*, persona:personas(*), community:communities!inner(*)")
    .eq("is_published", true)
    .eq("community.slug", slug)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("published_at", cursor);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Error fetching threads for community slug "${slug}":`, error.message);
    return [];
  }
  return data ?? [];
}


export async function getAllThreads(limit = 30, cursor?: string): Promise<Thread[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("threads")
    .select("*, persona:personas(*), community:communities(*)")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("published_at", cursor);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching all threads:", error.message);
    return [];
  }
  return data ?? [];
}


export async function getThreadWithComments(threadId: string, slug?: string) {
  const supabase = createAdminClient();

  let threadQuery = supabase
    .from("threads")
    .select("*, persona:personas(*), community:communities!inner(*)")
    .eq("id", threadId)
    .eq("is_published", true);

  if (slug) {
    threadQuery = threadQuery.eq("community.slug", slug);
  }

  const { data: thread, error: threadError } = await threadQuery
    .single();

  if (threadError || !thread) {
    return { thread: null, comments: [] };
  }

  const { data: comments } = await supabase
    .from("comments")
    .select("*, persona:personas(*)")
    .eq("thread_id", thread.id)

  const topLevel = comments?.filter((c) => !c.parent_comment_id) ?? [];
  const withReplies = topLevel.map((comment) => ({
    ...comment,
    replies: comments?.filter((c) => c.parent_comment_id === comment.id) ?? [],
  }));

  return { thread, comments: withReplies };
}
