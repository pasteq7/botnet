// lib\inngest\functions.ts
import { revalidatePath } from "next/cache";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { inngest } from "./client";
import { generateThread } from "@/lib/ai/thread-generator";
import { generateCommentChain } from "@/lib/ai/comment-generator";
import { routeContentGeneration, pickContentMode } from "@/lib/ai/content-router";
import { getActiveAiConfig } from "@/lib/ai/client";

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

interface TraceEntry {
  step: string;
  status: "success" | "failed" | "skipped";
  message: string;
  details?: Record<string, unknown>;
  duration_ms?: number;
  model?: string;
  timestamp?: string;
}

function traceStep(
  trace: TraceEntry[],
  step: string,
  status: TraceEntry["status"],
  message: string,
  details?: Record<string, unknown>,
  startedAt?: number,
  model?: string
) {
  trace.push({
    step,
    status,
    message,
    details,
    model,
    timestamp: new Date().toISOString(),
    duration_ms: startedAt ? Date.now() - startedAt : undefined,
  });
}

async function logGeneration(
  supabase: SupabaseClient,
  params: {
    community_id: string;
    status: "success" | "failed" | "skipped";
    model_used?: string | null;
    model_search?: string | null;
    model_gen?: string | null;
    error_message?: string | null;
    thread_id?: string | null;
    trace?: TraceEntry[];
  }
) {
  const { error } = await supabase.from("generation_logs").insert({
    community_id: params.community_id,
    status: params.status,
    model_used: params.model_used ?? null,
    model_search: params.model_search ?? null,
    model_gen: params.model_gen ?? null,
    error_message: params.error_message ?? null,
    thread_id: params.thread_id ?? null,
    trace: params.trace ?? [],
  });
  if (error) console.error("Failed to log generation:", error.message);
}

export const cronCommunityTrigger = inngest.createFunction(
  {
    id: "cron-community-trigger",
    name: "Cron: Community Trigger",
  },
  { cron: "0 */1 * * *" },
  async ({ step }) => {
    const { communities, globalThreadsPerHour, maxPerRun } = await step.run("fetch-data", async () => {
      const supabase = getSupabase();

      const { data: sConfig } = await supabase
        .from("scheduler_config")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      const { data: comms } = await supabase
        .from("communities")
        .select("id, slug, threads_per_hour")
        .eq("is_active", true);

      return {
        communities: comms ?? [],
        schedulerConfig: sConfig ?? null,
        globalThreadsPerHour: sConfig?.threads_per_hour ?? 4,
        maxPerRun: sConfig?.max_per_run ?? 4,
      };
    });

    if (communities.length === 0) return { triggered: 0 };

    const batchSize = Math.min(maxPerRun, communities.length);

    const weighted = communities.map(c => ({
      ...c,
      weight: c.threads_per_hour ?? globalThreadsPerHour,
    }));

    const selected: typeof communities = [];
    const pool = [...weighted];

    for (let i = 0; i < batchSize && pool.length > 0; i++) {
      const subTotal = pool.reduce((sum, c) => sum + c.weight, 0);
      let rand = Math.random() * subTotal;
      let picked = 0;
      for (let j = 0; j < pool.length; j++) {
        rand -= pool[j].weight;
        if (rand <= 0) {
          picked = j;
          break;
        }
      }
      selected.push(pool[picked]);
      pool.splice(picked, 1);
    }

    await step.sendEvent("fan-out-communities", selected.map(c => ({
      name: "botnet/community.generate" as const,
      data: { communityId: c.id, communitySlug: c.slug },
    })));

    return { triggered: selected.length, maxPerRun };
  }
);

export const generateCommunityContent = inngest.createFunction(
  {
    id: "generate-community-content",
    name: "Generate Community Content",
    throttle: { limit: 3, period: "1m" },
    concurrency: { limit: 1, key: "event.data.communityId" },
    retries: 1,
  },
  { event: "botnet/community.generate" },
  async ({ event, step }) => {
    const { communityId } = event.data as { communityId: string };
    const trace: TraceEntry[] = [];
    const t0 = Date.now();

    try {
      // STEP 1: Setup Data (Combines 4 previous steps into 1)
      const setup = await step.run("setup-data", async () => {
        const searchConfig = await getActiveAiConfig('search');
        const genConfig = await getActiveAiConfig('generation');
        const modelSearch = searchConfig ? `${searchConfig.provider}/${searchConfig.defaultModel}` : null;
        const modelGen = genConfig ? `${genConfig.provider}/${genConfig.defaultModel}` : null;
        const supabase = getSupabase();

        const { data: community, error: commErr } = await supabase
          .from("communities")
          .select("*")
          .eq("id", communityId)
          .single();

        if (commErr || !community) throw new Error(`Community not found: ${communityId}`);

        const { data: recentThreads } = await supabase
          .from("threads")
          .select("source_url, source_headline")
          .eq("community_id", community.id)
          .order("published_at", { ascending: false })
          .limit(10);
        const localHeadlines = (recentThreads ?? []).map(t => t.source_headline).filter(Boolean) as string[];

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: globalThreads } = await supabase
          .from("threads")
          .select("source_url")
          .gte("published_at", twentyFourHoursAgo);
        const globalUrls = (globalThreads ?? []).map(t => t.source_url).filter(Boolean) as string[];

        const { data: globalPersonas } = await supabase
          .from("personas")
          .select("*")
          .eq("scope", "global");

        const { data: scopedPersonas } = await supabase
          .from("personas")
          .select("*, persona_communities!inner(community_id)")
          .eq("persona_communities.community_id", community.id);

        const personas = [...(globalPersonas ?? []), ...(scopedPersonas ?? [])];

        if (personas.length < 4) {
          const { data: extraPersonas } = await supabase
            .from("personas")
            .select("*")
            .limit(10);
          const existingIds = new Set(personas.map(p => p.id));
          for (const p of extraPersonas ?? []) {
            if (!existingIds.has(p.id)) {
              personas.push(p);
              existingIds.add(p.id);
            }
          }
        }

        return { modelSearch, modelGen, community, localHeadlines, globalUrls, personas };
      });

      const t1 = Date.now();
      traceStep(trace, "Setup", "success",
        `Loaded community "${setup.community.slug}" with ${setup.personas.length} personas`,
        {
          personas: setup.personas.length,
          local_headlines_seen: setup.localHeadlines.length,
          global_urls_seen: setup.globalUrls.length,
          model_search: setup.modelSearch,
          model_gen: setup.modelGen,
        },
        t0,
      );

      // STEP 2: Route & Generate Initial Content Payload
      const routeResult = await step.run("route-content", async () => {
        const mode = pickContentMode(setup.community);
        const result = await routeContentGeneration(setup.community, setup.localHeadlines, mode);

        if (result.payload) return { payload: result.payload, error: null };

        if (mode === "news" || mode === "web-search") {
          return { payload: null, error: result.error ?? "No grounding data or API error" };
        }

        const fallback = await routeContentGeneration(setup.community, setup.localHeadlines, "discussion");
        return { payload: fallback.payload ?? null, error: fallback.error ?? "Fallback discussion failed" };
      });

      const t2 = Date.now();
      if (routeResult.error && !routeResult.payload) {
        traceStep(trace, "Routing", "failed",
          routeResult.error,
          { attempted_mode: "unknown" },
          t1,
        );
      } else if (routeResult.payload) {
        traceStep(trace, "Routing", "success",
          `Mode: ${routeResult.payload.mode}`,
          {
            mode: routeResult.payload.mode,
            headline: routeResult.payload.headline?.slice(0, 120),
            url: routeResult.payload.url,
            is_fallback: !!routeResult.error,
          },
          t1,
        );
      }

      // Handle Early Exits (Missing content, duplicates, missing personas)
      const contentPayload = routeResult.payload;
      const isDuplicateUrl = contentPayload?.url && !contentPayload.url.startsWith("https://www.google.com/search") && setup.globalUrls.includes(contentPayload.url);

      if (!contentPayload || isDuplicateUrl || setup.personas.length === 0) {
        const reason = !contentPayload ? (routeResult.error || "No content generated") :
          (isDuplicateUrl ? "Duplicate URL detected" : "No personas available");

        traceStep(trace, "Conversation", "skipped", reason, { model_gen: setup.modelGen }, t2);

        await step.run("log-skipped", async () => {
          await logGeneration(getSupabase(), {
            community_id: setup.community.id,
            status: "skipped",
            model_used: setup.modelSearch || setup.modelGen || "unknown",
            model_search: setup.modelSearch,
            model_gen: setup.modelGen,
            error_message: reason,
            trace,
          });
        });
        return { community: setup.community.slug, status: "skipped", reason };
      }

      // STEP 3: Generate Conversation (Combines Thread + Comments AI logic)
      const opPersona = setup.personas[Math.floor(Math.random() * setup.personas.length)];
      const generatedConversation = await step.run("generate-conversation", async () => {
        const threadContent = await generateThread(setup.community, opPersona, contentPayload);
        if (!threadContent) return null;

        const commentChain = await generateCommentChain(
          setup.community,
          setup.personas,
          { title: threadContent.title, body: threadContent.body },
          opPersona.id
        );
        return { threadContent, commentChain };
      });

      if (!generatedConversation) {
        traceStep(trace, "Conversation", "failed",
          "generateThread returned null — model likely returned malformed JSON or empty response",
          { model_gen: setup.modelGen, content_mode: contentPayload.mode },
          t2,
          setup.modelGen ?? undefined,
        );

        await step.run("log-failed-generation", async () => {
          await logGeneration(getSupabase(), {
            community_id: setup.community.id,
            status: "failed",
            model_used: setup.modelSearch || setup.modelGen || "unknown",
            model_search: setup.modelSearch,
            model_gen: setup.modelGen,
            error_message: "Thread generation returned no content",
            trace,
          });
        });
        return { community: setup.community.slug, status: "failed_thread" };
      }

      const t3 = Date.now();
      traceStep(trace, "Conversation", "success",
        `Thread generated, ${generatedConversation.commentChain.length} comments`,
        {
          comment_count: generatedConversation.commentChain.length,
          title_length: generatedConversation.threadContent.title.length,
          body_length: generatedConversation.threadContent.body.length,
          flair: generatedConversation.threadContent.flair,
        },
        t2,
        setup.modelGen ?? undefined,
      );

      // STEP 4: Save Everything to DB (Combines Thread insert, Comment inserts, Count update, and Success log)
      const threadId = await step.run("save-to-db", async () => {
        const supabase = getSupabase();

        // Insert Thread
        const { data: thread, error: threadErr } = await supabase
          .from("threads")
          .insert({
            community_id: setup.community.id,
            persona_id: opPersona.id,
            title: generatedConversation.threadContent.title,
            body: generatedConversation.threadContent.body,
            flair: generatedConversation.threadContent.flair,
            source_url: contentPayload.url || null,
            source_headline: contentPayload.headline,
            content_mode: contentPayload.mode,
            is_published: true,
            published_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (threadErr || !thread) throw new Error(`Thread insert failed: ${threadErr?.message}`);

        // Insert Comments
        const insertedCommentIds: string[] = [];
        for (const comment of generatedConversation.commentChain) {
          const parentId = comment.parentIndex !== null ? insertedCommentIds[comment.parentIndex] : null;
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

        // Finalize state
        const { count } = await supabase.from("comments").select("*", { count: "exact", head: true }).eq("thread_id", thread.id);
        await supabase.from("threads").update({ comments_count: count ?? 0, is_ready: true }).eq("id", thread.id);

        await logGeneration(supabase, {
          community_id: setup.community.id,
          status: "success",
          model_used: setup.modelSearch || setup.modelGen || "unknown",
          model_search: setup.modelSearch,
          model_gen: setup.modelGen,
          thread_id: thread.id,
          trace,
        });

        return thread.id;
      });

      traceStep(trace, "Database", "success",
        `Thread and ${generatedConversation.commentChain.length} comments persisted`,
        { thread_id: threadId, community_id: setup.community.id },
        t3,
      );

      // STEP 5: Revalidate Paths
      await step.run("revalidate-paths", async () => {
        revalidatePath(`/c/${setup.community.slug}`);
        revalidatePath(`/c/${setup.community.slug}/${threadId}`);
        revalidatePath("/");
      });

      return { community: setup.community.slug, status: "success", threadId };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      const failedStep = errorMessage.includes("not found") ? "Setup" :
        errorMessage.includes("Thread insert") ? "Database" :
          errorMessage.includes("Comment insert") ? "Database" : "Unknown";

      traceStep(trace, failedStep, "failed", errorMessage, { community_id: communityId });

      await step.run("log-fatal-failure", async () => {
        await logGeneration(getSupabase(), {
          community_id: communityId,
          status: errorMessage.includes("not found") ? "skipped" : "failed",
          error_message: errorMessage,
          trace,
        });
      });
      throw err;
    }
  }
);