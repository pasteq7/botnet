import { createClient } from "@/lib/supabase/server";
import type { Thread, Comment, Subreddit } from "@/types";

export async function getSubreddits(): Promise<Subreddit[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subreddits")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Error fetching subreddits:", error);
    return [];
  }
  return data ?? [];
}


export async function getThreadsBySubreddit(slug: string, limit = 20): Promise<Thread[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("threads")
    .select("*, persona:personas(*), subreddit:subreddits!inner(*)")
    .eq("is_published", true)
    .eq("subreddit.slug", slug)
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
    .select("*, persona:personas(*), subreddit:subreddits(*)")
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
    .select("*, persona:personas(*), subreddit:subreddits(*)")
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
