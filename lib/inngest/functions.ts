// lib\inngest\functions.ts
import { revalidatePath } from "next/cache";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { cron } from "inngest";
import { inngest } from "./client";
import { generateThread } from "@/lib/ai/thread-generator";
import { generateCommentChain } from "@/lib/ai/comment-generator";
import { routeContentGeneration, pickContentMode } from "@/lib/ai/content-router";
import { getActiveAiConfig } from "@/lib/ai/client";
import type { ContentPayload } from "@/types";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        persistSession: false,
      },
      global: {
        fetch: (url, options) => {
          return fetch(url, { ...options, cache: "no-store" });
        },
      },
    }
  );
}

async function logGeneration(
  supabase: SupabaseClient,
  params: {
    community_id: string;
    status: "success" | "failed" | "skipped";
    model_used?: string;
    error_message?: string;
    thread_id?: string;
  }
) {
  const { error } = await supabase.from("generation_logs").insert({
    community_id: params.community_id,
    status: params.status,
    model_used: params.model_used ?? null,
    error_message: params.error_message ?? null,
    thread_id: params.thread_id ?? null,
  });
  if (error) console.error("Failed to log generation:", error.message);
}

export const cronCommunityTrigger = inngest.createFunction(
  {
    id: "cron-community-trigger",
    name: "Cron: Community Trigger",
    triggers: [cron("0 */1 * * *")],
  },
  async ({ step }) => {
    const communities = await step.run("fetch-communities", async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("communities")
        .select("id, slug")
        .eq("is_active", true);
      return data ?? [];
    });

    if (communities.length === 0) {
      return { triggered: 0 };
    }

    const selected = [...communities]
      .sort(() => Math.random() - 0.5)
      .slice(0, 4);

    await step.sendEvent("fan-out-communities", selected.map(c => ({
      name: "botnet/community.generate" as const,
      data: { communityId: c.id, communitySlug: c.slug },
    })));

    return { triggered: selected.length };
  }
);

export const generateCommunityContent = inngest.createFunction(
  {
    id: "generate-community-content",
    name: "Generate Community Content",
    triggers: [{ event: "botnet/community.generate" }],
    throttle: { limit: 4, period: "1m" },
    concurrency: { limit: 1, key: "event.data.communityId" },
    retries: 1,
  },
  async ({ event, step }) => {
    const { communityId } = event.data as { communityId: string };
    let activeModel: string | undefined;

    try {
      activeModel = await step.run("fetch-active-model", async () => {
        const config = await getActiveAiConfig();
        return config ? `${config.provider}/${config.defaultModel}` : "unknown";
      });

      const community = await step.run("fetch-community", async () => {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from("communities")
          .select("*")
          .eq("id", communityId)
          .single();

        if (error || !data) {
          console.error(`Community fetch error for ID ${communityId}:`, error);
          throw new Error(`Community not found: ${communityId}${error ? ` (${error.message})` : ''}`);
        }
        return data;
      });

      const dedupData = await step.run("fetch-dedup-data", async () => {
        const supabase = getSupabase();

        const { data: recentThreads } = await supabase
          .from("threads")
          .select("source_url, source_headline")
          .eq("community_id", community.id)
          .order("published_at", { ascending: false })
          .limit(10);

        const localHeadlines: string[] = (recentThreads ?? [])
          .map((t: { source_headline: string | null }) => t.source_headline)
          .filter((h: string | null): h is string => !!h);

        const twentyFourHoursAgo = new Date(
          Date.now() - 24 * 60 * 60 * 1000
        ).toISOString();
        const { data: globalThreads } = await supabase
          .from("threads")
          .select("source_url")
          .gte("published_at", twentyFourHoursAgo);

        const globalUrls = (globalThreads ?? [])
          .map((t: { source_url: string | null }) => t.source_url)
          .filter((u: string | null): u is string => !!u);

        return { localHeadlines, globalUrls };
      });

      const routeResult = await step.run("route-content", async () => {
        const mode = pickContentMode(community);

        const result = await routeContentGeneration(community, dedupData.localHeadlines, mode);
        if (result.payload) return { payload: result.payload, error: null as string | null };

        if (mode === "news" || mode === "web-search") {
          console.warn(`[route-content] Search-based mode '${mode}' failed for ${community.slug} (${result.error ?? 'no grounding data or API error'}). Cancelling run.`);
          return { payload: null as ContentPayload | null, error: result.error ?? "No grounding data or API error" };
        }

        console.warn(`[route-content] Primary mode '${mode}' failed for ${community.slug}, falling back to discussion`);
        const fallback = await routeContentGeneration(community, dedupData.localHeadlines, "discussion");
        if (fallback.payload) return { payload: fallback.payload, error: null as string | null };
        return { payload: null as ContentPayload | null, error: fallback.error ?? "Fallback discussion also failed" };
      });

      const contentPayload = routeResult.payload ?? null;
      const routeError = routeResult.error;

      if (!contentPayload) {
        await step.run("log-skipped-no-content", async () => {
          const supabase = getSupabase();
          await logGeneration(supabase, {
            community_id: community.id,
            status: "skipped",
            model_used: activeModel,
            error_message: routeError ?? "No content generated for chosen mode",
          });
        });
        return { community: community.slug, status: "skipped_no_content" };
      }

      if (
        contentPayload.url &&
        !contentPayload.url.startsWith("https://www.google.com/search") &&
        dedupData.globalUrls.includes(contentPayload.url)
      ) {
        await step.run("log-skipped-duplicate", async () => {
          const supabase = getSupabase();
          await logGeneration(supabase, {
            community_id: community.id,
            status: "skipped",
            model_used: activeModel,
            error_message: "Duplicate URL detected",
          });
        });
        return { community: community.slug, status: "skipped_duplicate_url" };
      }

      const personas = await step.run("fetch-personas", async () => {
        const supabase = getSupabase();
        const { data } = await supabase
          .from("personas")
          .select("*");
        return data ?? [];
      });

      if (personas.length === 0) {
        await step.run("log-skipped-no-personas", async () => {
          const supabase = getSupabase();
          await logGeneration(supabase, {
            community_id: community.id,
            status: "skipped",
            model_used: activeModel,
            error_message: "No personas available",
          });
        });
        return { community: community.slug, status: "skipped_no_personas" };
      }

      const opPersona = await step.run("pick-op-persona", async () => {
        return personas[Math.floor(Math.random() * personas.length)];
      });

      const threadContent = await step.run("generate-thread", async () => {
        return generateThread(community, opPersona, contentPayload);
      });

      if (!threadContent) {
        await step.run("log-failed-thread", async () => {
          const supabase = getSupabase();
          await logGeneration(supabase, {
            community_id: community.id,
            status: "failed",
            model_used: activeModel,
            error_message: "Thread generation returned no content",
          });
        });
        return { community: community.slug, status: "failed_thread" };
      }

      const thread = await step.run("insert-thread", async () => {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from("threads")
          .insert({
            community_id: community.id,
            persona_id: opPersona.id,
            title: threadContent.title,
            body: threadContent.body,
            flair: threadContent.flair,
            source_url: contentPayload.url || null,
            source_headline: contentPayload.headline,
            content_mode: contentPayload.mode,
            is_published: true,
            published_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (error) throw new Error(`Thread insert failed: ${error.message}`);
        return data;
      });

      if (!thread) {
        await step.run("log-failed-insert", async () => {
          const supabase = getSupabase();
          await logGeneration(supabase, {
            community_id: community.id,
            status: "failed",
            model_used: activeModel,
            error_message: "Failed to insert thread into database",
          });
        });
        return { community: community.slug, status: "failed_insert_thread" };
      }

      const commentChain = await step.run("generate-comments", async () => {
        try {
          const chain = await generateCommentChain(
            community,
            personas,
            { title: threadContent.title, body: threadContent.body },
            opPersona.id
          );
          if (chain.length === 0) {
            console.warn("[generate-comments] Chain is empty for thread", thread.id);
          }
          return chain;
        } catch (err) {
          console.error("[generate-comments] Failed:", err);
          return [];
        }
      });

      await step.run("insert-comments", async () => {
        const supabase = getSupabase();
        const insertedCommentIds: string[] = [];

        for (const comment of commentChain) {
          const parentId =
            comment.parentIndex !== null
              ? insertedCommentIds[comment.parentIndex]
              : null;

          const { data: inserted, error } = await supabase
            .from("comments")
            .insert({
              thread_id: thread.id,
              parent_comment_id: parentId ?? null,
              persona_id: comment.persona.id,
              body: comment.body,
              depth: parentId ? 1 : 0,
            })
            .select("id")
            .single();

          if (error) throw new Error(`Comment insert failed: ${error.message}`);
          insertedCommentIds.push(inserted.id);
        }

        const { count, error: countError } = await supabase
          .from("comments")
          .select("*", { count: "exact", head: true })
          .eq("thread_id", thread.id);

        if (countError) throw new Error(`Failed to count comments: ${countError.message}`);

        const { error: updateError } = await supabase
          .from("threads")
          .update({ comments_count: count ?? 0 })
          .eq("id", thread.id);

        if (updateError) throw new Error(`Failed to update comment count: ${updateError.message}`);
      });

      await step.run("revalidate-paths", async () => {
        revalidatePath(`/c/${community.slug}`);
        revalidatePath(`/c/${community.slug}/${thread.id}`);
        revalidatePath("/");
      });

      await step.run("set-is-ready", async () => {
        const supabase = getSupabase();
        const { error } = await supabase
          .from("threads")
          .update({ is_ready: true })
          .eq("id", thread.id);
        if (error) throw new Error(`set-is-ready failed: ${error.message}`);
      });

      await step.run("log-success", async () => {
        const supabase = getSupabase();
        await logGeneration(supabase, {
          community_id: community.id,
          status: "success",
          model_used: activeModel,
          thread_id: thread.id,
        });
      });

      return {
        community: community.slug,
        status: "success",
        threadId: thread.id,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      if (errorMessage.startsWith("Community not found:")) {
        await step.run("log-skipped-nonexistent", async () => {
          const supabase = getSupabase();
          await logGeneration(supabase, {
            community_id: communityId,
            status: "skipped",
            model_used: activeModel,
            error_message: errorMessage,
          });
        });
        return { community: communityId, status: "skipped_not_found" };
      }

      await step.run("log-failure", async () => {
        const supabase = getSupabase();
        await logGeneration(supabase, {
          community_id: communityId,
          status: "failed",
          model_used: activeModel,
          error_message: errorMessage,
        });
      });
      throw err;
    }
  }
);