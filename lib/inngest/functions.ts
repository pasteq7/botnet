// lib\inngest\functions.ts
import { revalidatePath } from "next/cache";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { inngest } from "./client";
import { generateThread } from "@/lib/ai/thread-generator";
import { generateCommentChain } from "@/lib/ai/comment-generator";
import { routeContentGeneration, pickContentMode } from "@/lib/ai/content-router";
import { getActiveAiConfig } from "@/lib/ai/client";
import { uuidv4 } from "@/lib/uuid";

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

async function upsertGenerationLog(
  supabase: SupabaseClient,
  params: {
    id: string;
    community_id: string;
    status: "queued" | "success" | "failed" | "skipped";
    current_step?: string | null;
    model_used?: string | null;
    model_search?: string | null;
    model_gen?: string | null;
    error_message?: string | null;
    thread_id?: string | null;
    tokens_used?: number | null;
    trace?: TraceEntry[];
  }
) {
  const { error } = await supabase.from("generation_logs").upsert(
    {
      id: params.id,
      community_id: params.community_id,
      status: params.status,
      current_step: params.current_step ?? null,
      model_used: params.model_used ?? null,
      model_search: params.model_search ?? null,
      model_gen: params.model_gen ?? null,
      error_message: params.error_message ?? null,
      thread_id: params.thread_id ?? null,
      tokens_used: params.tokens_used ?? null,
      trace: params.trace ?? [],
    },
    { onConflict: "id" }
  );
  if (error) console.error("Failed to upsert generation log:", error.message);
}

export const cronCommunityTrigger = inngest.createFunction(
  {
    id: "cron-community-trigger",
    name: "Cron: Community Trigger",
  },
  { cron: "*/15 * * * *" },
  async ({ step }) => {

    const communities = await step.run("fetch-due-communities", async () => {
      const supabase = getSupabase();

      const { data: sConfig } = await supabase
        .from("scheduler_config")
        .select("max_per_run, default_interval_minutes")
        .eq("is_active", true)
        .maybeSingle();

      const maxPerRun = sConfig?.max_per_run ?? 4;
      const defaultInterval = sConfig?.default_interval_minutes ?? 60;

      const { data: all } = await supabase
        .from("communities")
        .select("id, slug, generation_interval_minutes, last_generated_at")
        .eq("is_active", true);

      if (!all?.length) return [];

      const now = Date.now();

      return all
        .filter((c) => {
          const interval = (c.generation_interval_minutes ?? defaultInterval) * 60_000;
          const lastGen = c.last_generated_at ? new Date(c.last_generated_at).getTime() : 0;
          return now - lastGen >= interval;
        })
        .sort((a, b) => {
          const aLast = a.last_generated_at ? new Date(a.last_generated_at).getTime() : 0;
          const bLast = b.last_generated_at ? new Date(b.last_generated_at).getTime() : 0;
          return aLast - bLast;
        })
        .slice(0, maxPerRun);
    });

    if (!communities.length) return { triggered: 0, reason: "no_communities_due" };

    // Gate on AI config
    const hasAiConfig = await step.run("check-ai-config", async () => {
      const supabase = getSupabase();
      const { count } = await supabase
        .from("ai_configs")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      return (count ?? 0) > 0;
    });

    if (!hasAiConfig) {
      console.warn("[cron] Skipped: no active AI config.");
      return { triggered: 0, reason: "no_ai_config" };
    }

    await step.sendEvent(
      "fan-out-communities",
      communities.map((c) => ({
        name: "botnet/community.generate" as const,
        data: { communityId: c.id, communitySlug: c.slug, logId: uuidv4() },
      }))
    );

    return { triggered: communities.length, communities: communities.map((c) => c.slug) };
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
    const { communityId, logId: eventLogId } = event.data as { communityId: string; logId?: string };
    const logId = eventLogId ?? uuidv4();
    const trace: TraceEntry[] = [];
    const t0 = Date.now();
    let totalTokens = 0;

    try {
      // STEP 1: Setup Data (Combines 4 previous steps into 1)
      const setup = await step.run("setup-data", async () => {
        const supabase = getSupabase();
        await upsertGenerationLog(supabase, {
          id: logId,
          community_id: communityId,
          status: "queued",
          current_step: "setup",
        });

        const genConfig = await getActiveAiConfig('generation');
        const searchConfig = await getActiveAiConfig('search');
        const modelSearch = searchConfig ? `${searchConfig.provider}/${searchConfig.defaultModel}` : null;
        const modelGen = genConfig ? `${genConfig.provider}/${genConfig.defaultModel}` : null;

        if (!genConfig && !searchConfig) {
          throw new Error('No active AI configuration found. Go to Admin > Settings to configure an AI provider (e.g., Gemini, OpenAI) before generating content.');
        }

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
        const supabase = getSupabase();
        await upsertGenerationLog(supabase, {
          id: logId,
          community_id: setup.community.id,
          status: "queued",
          current_step: "routing",
        });

        const mode = pickContentMode(setup.community);
        const result = await routeContentGeneration(setup.community, setup.localHeadlines, mode);

        if (result.payload) return { payload: result.payload, error: null, tokensUsed: result.tokensUsed ?? 0 };

        if (mode === "news" || mode === "web-search") {
          return { payload: null, error: result.error ?? "No grounding data or API error", tokensUsed: result.tokensUsed ?? 0 };
        }

        const fallback = await routeContentGeneration(setup.community, setup.localHeadlines, "discussion");
        return { payload: fallback.payload ?? null, error: fallback.error ?? "Fallback discussion failed", tokensUsed: (result.tokensUsed ?? 0) + (fallback.tokensUsed ?? 0) };
      });

      totalTokens += routeResult.tokensUsed ?? 0;

      const t2 = Date.now();
      if (routeResult.error && !routeResult.payload) {
        traceStep(trace, "Routing", "failed",
          routeResult.error,
          { attempted_mode: "unknown", model_search: setup.modelSearch, model_gen: setup.modelGen },
          t1,
        );
      } else if (routeResult.payload) {
        const routingModel = routeResult.payload.mode === "news" || routeResult.payload.mode === "web-search"
          ? setup.modelSearch
          : setup.modelGen;
        traceStep(trace, "Routing", "success",
          `Mode: ${routeResult.payload.mode}`,
          {
            mode: routeResult.payload.mode,
            headline: routeResult.payload.headline?.slice(0, 120),
            url: routeResult.payload.url,
            is_fallback: !!routeResult.error,
            model_search: setup.modelSearch,
            model_gen: setup.modelGen,
          },
          t1,
          routingModel ?? undefined,
        );
      }

      // Handle Early Exits (Missing content, duplicates, missing personas)
      const contentPayload = routeResult.payload;
      const isDuplicateUrl = contentPayload?.url && !contentPayload.url.startsWith("https://www.google.com/search") && setup.globalUrls.includes(contentPayload.url);

      if (!contentPayload || isDuplicateUrl || setup.personas.length === 0) {
        const reason = !contentPayload ? (routeResult.error || "No content generated") :
          (isDuplicateUrl ? "Duplicate URL detected" : "No personas available");

        traceStep(trace, "Conversation", "skipped", reason, { model_gen: setup.modelGen }, t2, setup.modelGen ?? undefined);

        const tokensUsed = totalTokens;
        await step.run("log-skipped", async () => {
          await upsertGenerationLog(getSupabase(), {
            id: logId,
            community_id: setup.community.id,
            status: "skipped",
            current_step: "done",
            model_used: setup.modelSearch || setup.modelGen || "unknown",
            model_search: setup.modelSearch,
            model_gen: setup.modelGen,
            error_message: reason,
            tokens_used: tokensUsed,
            trace,
          });
        });
        return { community: setup.community.slug, status: "skipped", reason };
      }

      // STEP 3: Generate Conversation (Combines Thread + Comments AI logic)
      const opPersona = setup.personas[Math.floor(Math.random() * setup.personas.length)];
      const generatedConversation = await step.run("generate-conversation", async () => {
        const supabase = getSupabase();
        await upsertGenerationLog(supabase, {
          id: logId,
          community_id: setup.community.id,
          status: "queued",
          current_step: "generating",
        });

        const threadResult = await generateThread(setup.community, opPersona, contentPayload);
        if (!threadResult) return null;

        const commentResult = await generateCommentChain(
          setup.community,
          setup.personas,
          { title: threadResult.title, body: threadResult.body },
          opPersona.id
        );

        return {
          threadContent: threadResult,
          commentChain: commentResult.chain,
          tokensUsed: (threadResult.tokensUsed ?? 0) + (commentResult.tokensUsed ?? 0),
        };
      });

      totalTokens += generatedConversation?.tokensUsed ?? 0;

      if (!generatedConversation) {
        traceStep(trace, "Conversation", "failed",
          "generateThread returned null — model likely returned malformed JSON or empty response",
          { model_gen: setup.modelGen, content_mode: contentPayload.mode },
          t2,
          setup.modelGen ?? undefined,
        );

        const tokensUsed = totalTokens;
        await step.run("log-failed-generation", async () => {
          await upsertGenerationLog(getSupabase(), {
            id: logId,
            community_id: setup.community.id,
            status: "failed",
            current_step: "done",
            model_used: setup.modelSearch || setup.modelGen || "unknown",
            model_search: setup.modelSearch,
            model_gen: setup.modelGen,
            error_message: "Thread generation returned no content",
            tokens_used: tokensUsed,
            trace,
          });
        });
        return { community: setup.community.slug, status: "failed_thread" };
      }

      const t3 = Date.now();
      traceStep(trace, "Conversation", "success",
        `Thread generated, ${generatedConversation.commentChain.length} comments, model: ${setup.modelGen ?? "unknown"}`,
        {
          comment_count: generatedConversation.commentChain.length,
          title_length: generatedConversation.threadContent.title.length,
          body_length: generatedConversation.threadContent.body.length,
          flair: generatedConversation.threadContent.flair,
          model_gen: setup.modelGen,
        },
        t2,
        setup.modelGen ?? undefined,
      );

      // STEP 4: Save Everything to DB (Combines Thread insert, Comment inserts, Count update, and Success log)
      const tokensUsed = totalTokens;
      const threadId = await step.run("save-to-db", async () => {
        const supabase = getSupabase();
        await upsertGenerationLog(supabase, {
          id: logId,
          community_id: setup.community.id,
          status: "queued",
          current_step: "saving",
        });

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

        // Stamp last_generated_at on community
        await supabase
          .from("communities")
          .update({ last_generated_at: new Date().toISOString() })
          .eq("id", setup.community.id);

        await upsertGenerationLog(supabase, {
          id: logId,
          community_id: setup.community.id,
          status: "success",
          current_step: "done",
          model_used: setup.modelSearch || setup.modelGen || "unknown",
          model_search: setup.modelSearch,
          model_gen: setup.modelGen,
          thread_id: thread.id,
          tokens_used: tokensUsed,
          trace,
        });

        return thread.id;
      });

      traceStep(trace, "Database", "success",
        `Thread and ${generatedConversation.commentChain.length} comments persisted`,
        { thread_id: threadId, community_id: setup.community.id, model_search: setup.modelSearch, model_gen: setup.modelGen },
        t3,
        setup.modelGen ?? setup.modelSearch ?? undefined,
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

      const failedStep = errorMessage.includes("AI configuration") ? "Setup" :
        errorMessage.includes("not found") ? "Setup" :
          errorMessage.includes("Thread insert") ? "Database" :
            errorMessage.includes("Comment insert") ? "Database" : "Unknown";

      traceStep(trace, failedStep, "failed", errorMessage, { community_id: communityId }, undefined, undefined);

      const tokensUsed = totalTokens;
      await step.run("log-fatal-failure", async () => {
        await upsertGenerationLog(getSupabase(), {
          id: logId,
          community_id: communityId,
          status: errorMessage.includes("AI configuration") ? "skipped" : errorMessage.includes("not found") ? "skipped" : "failed",
          current_step: "done",
          error_message: errorMessage,
          tokens_used: tokensUsed,
          trace,
        });
      });
      throw err;
    }
  }
);