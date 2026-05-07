import { createClient } from "@/lib/supabase/server";
import type { Thread, Comment, Community } from "@/types";

export async function getCommunities(): Promise<Community[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Error fetching communities:", error);
    return [];
  }
  return data ?? [];
}


export async function getThreadsByCommunity(slug: string, limit = 20): Promise<Thread[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("threads")
    .select("*, persona:personas(*), community:communities!inner(*)")
    .eq("is_published", true)
    .eq("community.slug", slug)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`Error fetching threads for ${slug}:`, error);
    return [];
  }
  return data ?? [];
}


export async function getAllThreads(limit = 30): Promise<Thread[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("threads")
    .select("*, persona:personas(*), community:communities(*)")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching all threads:", error);
    return [];
  }
  return data ?? [];
}


export async function getThreadWithComments(threadId: string) {
  const supabase = await createClient();

  const { data: thread } = await supabase
    .from("threads")
    .select("*, persona:personas(*), community:communities(*)")
    .eq("id", threadId)
    .single();

  const { data: comments } = await supabase
    .from("comments")
    .select("*, persona:personas(*)")
    .eq("thread_id", threadId)
    .order("simulated_upvotes", { ascending: false });

  const topLevel = comments?.filter((c) => !c.parent_comment_id) ?? [];
  const withReplies = topLevel.map((comment) => ({
    ...comment,
    replies: comments?.filter((c) => c.parent_comment_id === comment.id) ?? [],
  }));

  return { thread, comments: withReplies };
}
