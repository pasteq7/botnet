// lib\inngest\functions.ts
import { inngest } from "@/lib/inngest/client";
import { generateThread } from "@/lib/ai/thread-generator";
import { generateCommentChain } from "@/lib/ai/comment-generator";
import { routeContentGeneration, pickContentMode } from "@/lib/ai/content-router";
import { revalidatePath } from "next/cache";
import { resolvePipelineConfig } from "@/lib/ai/pipeline-config";
import { getSearchProvider, deriveSearchQuery } from "@/lib/ai/search";
import { uuidv4 } from "@/lib/uuid";
import {
  COMMUNITY_CRON_EXPRESSION,
  DEFAULT_MAX_COMMENTS_PER_THREAD,
  DEFAULT_MIN_COMMENTS_PER_THREAD,
  MAX_COMMENTS_PER_THREAD,
} from "@/lib/constants";
import type { PipelineSetup, PipelineSearchResult, PipelineContentResult, PipelineConversation } from "@/lib/inngest/pipeline-types";
import { createCommunityGenerateEvents } from "@/lib/inngest/log-id";
import { getDueCommunitiesAt } from "@/lib/scheduler/due-communities";
import { createNoStoreAdminClient } from "@/lib/supabase/admin";
import { isEvergreenSourceUrl, isRecentlyCoveredUrl } from "@/lib/ai/source-diversity";

function getSupabase() {
  return createNoStoreAdminClient();
}

type ServiceSupabaseClient = ReturnType<typeof getSupabase>;

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

function clampCommentCount(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 0), MAX_COMMENTS_PER_THREAD);
}

function pickCommentCount(range: { min: number; max: number }) {
  const min = Math.min(range.min, range.max);
  const max = Math.max(range.min, range.max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getSentEventIds(result: unknown): string[] {
  const ids = (result as { ids?: unknown })?.ids;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
}

function resolveCommentRange(
  community: { min_comments_per_thread?: unknown; max_comments_per_thread?: unknown },
  defaults: { min: number; max: number }
) {
  const hasMinOverride = community.min_comments_per_thread !== null && community.min_comments_per_thread !== undefined;
  const hasMaxOverride = community.max_comments_per_thread !== null && community.max_comments_per_thread !== undefined;
  let min = hasMinOverride ? clampCommentCount(community.min_comments_per_thread, defaults.min) : defaults.min;
  let max = hasMaxOverride ? clampCommentCount(community.max_comments_per_thread, defaults.max) : defaults.max;

  if (min > max) {
    if (hasMinOverride && !hasMaxOverride) max = min;
    else if (!hasMinOverride && hasMaxOverride) min = max;
    else max = min;
  }

  return { min, max };
}

async function upsertGenerationLog(
  supabase: ServiceSupabaseClient,
  params: {
    id: string;
    community_id: string;
    status: "queued" | "running" | "success" | "failed" | "skipped";
    current_step?: string | null;
    model_used?: string | null;
    searcher_model?: string | null;
    generator_model?: string | null;
    search_strategy?: string | null;
    error_message?: string | null;
    thread_id?: string | null;
    tokens_used?: number | null;
    trace?: TraceEntry[];
    inngest_event_id?: string | null;
    inngest_run_id?: string | null;
  }
) {
  const payload: Record<string, unknown> = {
    id: params.id,
    community_id: params.community_id,
    status: params.status,
  };

  if ("current_step" in params) payload.current_step = params.current_step ?? null;
  if ("model_used" in params) payload.model_used = params.model_used ?? null;
  if ("searcher_model" in params) payload.searcher_model = params.searcher_model ?? null;
  if ("generator_model" in params) payload.generator_model = params.generator_model ?? null;
  if ("search_strategy" in params) payload.search_strategy = params.search_strategy ?? null;
  if ("error_message" in params) payload.error_message = params.error_message ?? null;
  if ("thread_id" in params) payload.thread_id = params.thread_id ?? null;
  if ("tokens_used" in params) payload.tokens_used = params.tokens_used ?? null;
  if ("trace" in params) payload.trace = params.trace ?? [];
  if ("inngest_event_id" in params) payload.inngest_event_id = params.inngest_event_id ?? null;
  if ("inngest_run_id" in params) payload.inngest_run_id = params.inngest_run_id ?? null;

  const { error } = await supabase.from("generation_logs").upsert(
    payload,
    { onConflict: "id" }
  );
  if (error) console.error("Failed to upsert generation log:", error.message);
}

async function recordInngestEventId(
  supabase: ServiceSupabaseClient,
  params: {
    logId: string;
    eventId: string;
  }
) {
  const { error } = await supabase
    .from("generation_logs")
    .update({ inngest_event_id: params.eventId })
    .eq("id", params.logId);

  if (error) console.error("Failed to record Inngest event ID:", error.message);
}

export const cronCommunityTrigger = inngest.createFunction(
  {
    id: "cron-community-trigger",
    name: "Cron: Community Trigger",
  },
  { cron: COMMUNITY_CRON_EXPRESSION },
  async ({ step }) => {

    const communities = await step.run("fetch-due-communities", async () => {
      const supabase = getSupabase();

      const { data: sConfig } = await supabase
        .from("scheduler_config")
        .select("max_per_run, default_interval_minutes, is_active")
        .maybeSingle();

      if (sConfig && !sConfig.is_active) {
        return "PAUSED";
      }

      const { data: all } = await supabase
        .from("communities")
        .select("id, slug, generation_interval_minutes, last_generated_at, last_generation_attempted_at")
        .eq("is_active", true);

      if (!all?.length) return [];

      return getDueCommunitiesAt(all, sConfig, new Date());
    });

    if (communities === "PAUSED") return { triggered: 0, reason: "scheduler_paused" };
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

    const events = await step.run("create-community-generate-events", async () => {
      return createCommunityGenerateEvents(communities, uuidv4);
    });

    await step.run("create-queued-generation-logs", async () => {
      const supabase = getSupabase();
      const attemptedAt = new Date().toISOString();
      console.log("[cron] Creating queued generation logs:", events.map((event) => ({
        communitySlug: event.data.communitySlug,
        communityId: event.data.communityId,
        logId: event.data.logId,
      })));
      await Promise.all(events.map((event) =>
        upsertGenerationLog(supabase, {
          id: event.data.logId,
          community_id: event.data.communityId,
          status: "queued",
          current_step: null,
        })
      ));

      const { error: attemptErr } = await supabase
        .from("communities")
        .update({ last_generation_attempted_at: attemptedAt })
        .in("id", events.map((event) => event.data.communityId));

      if (attemptErr) console.error("[cron] Failed to record scheduler attempt timestamps:", attemptErr.message);
    });

    const sent = await step.sendEvent("fan-out-communities", events);
    const eventIds = getSentEventIds(sent);

    if (eventIds.length) {
      await step.run("record-fan-out-event-ids", async () => {
        const supabase = getSupabase();
        console.log("[cron] Recording fan-out event IDs:", events.map((event, i) => ({
          communitySlug: event.data.communitySlug,
          logId: event.data.logId,
          eventId: eventIds[i] ?? null,
        })));
        await Promise.all(events.map((event, i) => {
          const eventId = eventIds[i];
          if (!eventId) return Promise.resolve();

          return recordInngestEventId(supabase, {
            logId: event.data.logId,
            eventId,
          });
        }));
      });
    }

    // Cleanup stale queued entries that were never picked up by Inngest.
    await step.run("cleanup-stale-queued", async () => {
      const supabase = getSupabase();
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

      const { data: stale, error: staleErr } = await supabase
        .from("generation_logs")
        .select("id")
        .eq("status", "queued")
        .lt("created_at", thirtyMinutesAgo);

      if (staleErr) {
        console.error("[cron] Failed to clean up stale queued entries:", staleErr.message);
        return;
      }

      if (!stale?.length) return;

      const { error } = await supabase
        .from("generation_logs")
        .update({
          status: "failed",
          current_step: "done",
          error_message: "Generation was never picked up by the worker within 30 minutes.",
        })
        .in("id", stale.map((log) => log.id));

      if (error) console.error("[cron] Failed to mark stale queued entries failed:", error.message);
      else console.log(`[cron] Marked ${stale.length} stale queued generation log(s) failed.`);
    });

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
  async ({ event, step, runId }) => {
    const { communityId, logId } = event.data as {
      communityId: string;
      logId?: string;
    };
    const eventId = typeof event.id === "string" ? event.id : null;
    if (!logId) {
      throw new Error("Generation event is missing data.logId; refusing to guess a generation_logs row.");
    }

    console.log("[generate] using event logId:", { communityId, eventId, logId });
    const logCorrelation = { inngest_event_id: eventId, inngest_run_id: runId };
    const trace: TraceEntry[] = [];
    let totalTokens = 0;

    try {
      // STEP 1: Setup
      const setup: PipelineSetup = await step.run("setup", async (): Promise<PipelineSetup> => {
        const supabase = getSupabase();
        await upsertGenerationLog(supabase, {
          id: logId,
          community_id: communityId,
          status: "running",
          current_step: "setup",
          ...logCorrelation,
        });

        const pipelineConfig = await resolvePipelineConfig();
        const generator = pipelineConfig.generator;
        const searcher = pipelineConfig.searcher;

        if (!generator && !searcher) {
          const hasSecretKey = !!process.env.SUPABASE_SECRET_KEY;
          const detail = !hasSecretKey
            ? "SUPABASE_SECRET_KEY is missing from environment. Inngest cannot access database."
            : "Check that at least one AI config is marked as 'active' in Admin > Settings.";

          throw new Error(`AI Pipeline failure: No active Searcher or Generator found. ${detail}`);
        }

        const [
          { data: community, error: commErr },
          { data: recentThreads },
          { data: globalPersonas },
          { data: scopedPersonas },
          { data: excludedRaw },
          { data: schedulerConfig },
        ] = await Promise.all([
          supabase.from("communities").select("*").eq("id", communityId).single(),
          supabase.from("threads")
            .select("source_headline, source_url, body, published_at")
            .eq("community_id", communityId)
            .order("published_at", { ascending: false })
            .limit(30),
          supabase.from("personas").select("*").eq("scope", "global"),
          supabase.from("personas")
            .select("*, persona_communities!inner(community_id)")
            .eq("persona_communities.community_id", communityId),
          supabase.from("personas")
            .select("*, persona_communities!left(community_id)")
            .eq("scope", "excluded")
            .eq("persona_communities.community_id", communityId),
          supabase.from("scheduler_config")
            .select("default_min_comments_per_thread, default_max_comments_per_thread")
            .maybeSingle(),
        ]);

        // Excluded personas = scope=excluded and NO row in persona_communities for this community
        const excludedPersonas = (excludedRaw ?? []).filter((p: Record<string, unknown>) =>
          !(p.persona_communities as Record<string, unknown>[])?.length
        );

        if (commErr || !community) throw new Error(`Community not found: ${communityId}`);

        const localHeadlines = (recentThreads ?? []).map(t => t.source_headline).filter(Boolean) as string[];
        const recentSourceUrls = (recentThreads ?? []).map(t => t.source_url).filter(Boolean) as string[];
        const recentCoverage = (recentThreads ?? [])
          .filter((t): t is { source_headline: string; source_url: string | null; body: string | null; published_at: string | null } => !!t.source_headline)
          .map((t) => ({
            headline: t.source_headline,
            body: t.body,
            published_at: t.published_at,
          }));

        const personas = [...(globalPersonas ?? []), ...(scopedPersonas ?? []), ...excludedPersonas];
        const defaultMin = clampCommentCount(
          schedulerConfig?.default_min_comments_per_thread,
          DEFAULT_MIN_COMMENTS_PER_THREAD
        );
        const defaultMax = clampCommentCount(
          schedulerConfig?.default_max_comments_per_thread,
          Math.max(defaultMin, DEFAULT_MAX_COMMENTS_PER_THREAD)
        );
        const commentRange = resolveCommentRange(community, {
          min: Math.min(defaultMin, defaultMax),
          max: Math.max(defaultMin, defaultMax),
        });

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

        return {
          community,
          personas,
          localHeadlines: localHeadlines.slice(0, 10),
          recentSourceUrls,
          recentCoverage,
          pipelineConfig,
          commentRange,
        };
      });

      const modelSearch = setup.pipelineConfig.searcher
        ? `${setup.pipelineConfig.searcher.provider}/${setup.pipelineConfig.searcher.model}`
        : null;
      const modelGen = setup.pipelineConfig.generator
        ? `${setup.pipelineConfig.generator.provider}/${setup.pipelineConfig.generator.model}`
        : null;

      const mode = pickContentMode(setup.community);

      // STEP 3: Search (Conditional)
      const searchStart = Date.now();
      const searchResult: PipelineSearchResult = await step.run("search", async (): Promise<PipelineSearchResult> => {
        const requiresSearch = mode === "news" || mode === "web-search";
        if (!requiresSearch || setup.pipelineConfig.effectiveSearchStrategy !== 'injected') {
          return { results: [], query: null, strategy: 'none' };
        }

        const supabase = getSupabase();
        await upsertGenerationLog(supabase, {
          id: logId,
          community_id: communityId,
          status: "running",
          current_step: "searching",
          ...logCorrelation,
        });

        const sc = setup.pipelineConfig.externalSearch;
        if (!sc || !sc.apiKey) {
          console.warn(`[search] No active search config with API key — falling back to no search for ${setup.community.slug}`);
          return { results: [], query: null, strategy: 'injected' };
        }

        const query = deriveSearchQuery(setup.community.topic_prompt, setup.localHeadlines, setup.community.search_scope);
        console.log(`[search] Query: "${query}" via ${sc.provider} for ${setup.community.slug}`);

        try {
          const provider = getSearchProvider(sc.provider);
          const results = await provider.search(query, sc.apiKey, { maxResults: 10 });
          return { results: results ?? [], query, strategy: 'injected' };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[search] Search failed for ${setup.community.slug}: ${msg}`);
          return { results: [], query, strategy: 'injected' };
        }
      });

      const injectedResults = searchResult.results.filter(Boolean);

      if (searchResult.strategy === 'injected' && injectedResults.length > 0) {
        traceStep(trace, "Search", "success",
          `Search via ${setup.pipelineConfig.externalSearch?.provider ?? "unknown"}: ${injectedResults.length} results`,
          {
            provider: setup.pipelineConfig.externalSearch?.provider ?? null,
            query: searchResult.query,
            result_count: injectedResults.length,
            search_model: modelSearch,
          },
          searchStart,
          modelSearch ?? undefined,
        );
      } else if (searchResult.strategy === 'injected' && injectedResults.length === 0) {
        traceStep(trace, "Search", "failed",
          `Search returned no results for query: "${searchResult.query}"`,
          { provider: setup.pipelineConfig.externalSearch?.provider ?? null, query: searchResult.query },
          searchStart,
          modelSearch ?? undefined,
        );
      } else {
        // Search was skipped or strategy was 'none'
        // We only add a trace if search was skipped for a mode that didn't need it
        const requiresSearch = mode === "news" || mode === "web-search";
        if (!requiresSearch && setup.pipelineConfig.effectiveSearchStrategy === 'injected') {
          traceStep(trace, "Search", "skipped", `Skipped search: mode "${mode}" does not require external data.`, { mode }, searchStart);
        }
      }

      // STEP 4: Route & Generate Content Payload
      const routeStart = searchStart;
      const routeResult: PipelineContentResult = await step.run("route-content", async (): Promise<PipelineContentResult> => {
        const supabase = getSupabase();
        await upsertGenerationLog(supabase, {
          id: logId,
          community_id: communityId,
          status: "running",
          current_step: "routing",
          ...logCorrelation,
        });

        const needsSearch = mode === "news" || mode === "web-search";
        if (needsSearch && setup.pipelineConfig.effectiveSearchStrategy === 'none') {
          return { payload: null, error: `Mode "${mode}" requires search, but search is not enabled in settings.`, tokensUsed: 0 };
        }

        if (needsSearch && setup.pipelineConfig.effectiveSearchStrategy === 'injected' && injectedResults.length === 0) {
          return { payload: null, error: `Mode "${mode}" requires external search, but search failed or returned no results.`, tokensUsed: 0 };
        }

        const result = await routeContentGeneration(
          setup.community,
          setup.localHeadlines,
          mode,
          {
            injectedSearchResults: injectedResults.length > 0 ? injectedResults : undefined,
            recentSourceUrls: setup.recentSourceUrls,
          }
        );

        if (result.payload) return { payload: result.payload, error: null, tokensUsed: result.tokensUsed ?? 0 };

        if (needsSearch) {
          return {
            payload: null,
            error: result.error ?? "No grounding data or API error",
            tokensUsed: result.tokensUsed ?? 0,
            rawResponse: result.rawResponse
          };
        }

        const fallback = await routeContentGeneration(setup.community, setup.localHeadlines, "discussion");
        return { payload: fallback.payload ?? null, error: fallback.error ?? "Fallback discussion failed", tokensUsed: (result.tokensUsed ?? 0) + (fallback.tokensUsed ?? 0) };
      });

      totalTokens += routeResult.tokensUsed ?? 0;

      const t2 = Date.now();
      if (routeResult.error && !routeResult.payload) {
        traceStep(trace, "Routing", "failed",
          routeResult.error,
          {
            attempted_mode: "unknown",
            model_search: modelSearch,
            model_gen: modelGen,
            search_strategy: setup.pipelineConfig.effectiveSearchStrategy,
            raw_response: routeResult.rawResponse
          },
          routeStart,
        );
      } else if (routeResult.payload) {
        const routingModel = routeResult.payload.mode === "news" || routeResult.payload.mode === "web-search"
          ? modelSearch
          : modelGen;
        traceStep(trace, "Routing", "success",
          `Mode: ${routeResult.payload.mode}`,
          {
            mode: routeResult.payload.mode,
            headline: routeResult.payload.headline?.slice(0, 120),
            url: routeResult.payload.url,
            is_fallback: !!routeResult.error,
            model_search: modelSearch,
            model_gen: modelGen,
            search_strategy: setup.pipelineConfig.effectiveSearchStrategy,
          },
          routeStart,
          routingModel ?? undefined,
        );
      }

      // Handle Early Exits (Missing content, duplicates, missing personas)
      const contentPayload = routeResult.payload;

      const isDuplicateUrl = await step.run("check-duplicate-url", async () => {
        if (!contentPayload?.url || contentPayload.url.startsWith("https://www.google.com/search")) {
          return false;
        }
        if (isRecentlyCoveredUrl(contentPayload.url, setup.recentSourceUrls)) {
          return true;
        }
        const supabase = getSupabase();
        const duplicateWindowMs = isEvergreenSourceUrl(contentPayload.url)
          ? 30 * 24 * 60 * 60 * 1000
          : 24 * 60 * 60 * 1000;
        const duplicateCutoff = new Date(Date.now() - duplicateWindowMs).toISOString();
        const { count } = await supabase
          .from("threads")
          .select("*", { count: "exact", head: true })
          .eq("source_url", contentPayload.url)
          .gte("published_at", duplicateCutoff);
        return (count ?? 0) > 0;
      });

      if (!contentPayload || isDuplicateUrl || setup.personas.length === 0) {
        const reason = !contentPayload ? (routeResult.error || "No content generated") :
          (isDuplicateUrl ? "Duplicate URL detected" : "No personas available");

        traceStep(trace, "Thread", "skipped", reason, { model_gen: modelGen }, t2, modelGen ?? undefined);

        const tokensUsed = totalTokens;
        const status = (reason.includes("requires") || reason.includes("failed")) ? "failed" : "skipped" as const;
        await step.run("log-skipped", async () => {
          await upsertGenerationLog(getSupabase(), {
            id: logId,
            community_id: setup.community.id,
            status: status,
            current_step: "done",
            model_used: modelSearch || modelGen || "unknown",
            searcher_model: modelSearch,
            generator_model: modelGen,
            search_strategy: setup.pipelineConfig.effectiveSearchStrategy,
            error_message: reason,
            tokens_used: tokensUsed,
            trace,
            ...logCorrelation,
          });
        });
        return { community: setup.community.slug, status: "skipped", reason };
      }

      // STEP 4: Generate Thread
      const opPersona = setup.personas[Math.floor(Math.random() * setup.personas.length)];
      const generatorConfig = setup.pipelineConfig.generator ? {
        apiKey: setup.pipelineConfig.generator.apiKey,
        defaultModel: setup.pipelineConfig.generator.model,
        fallbackModel: setup.pipelineConfig.generator.fallbackModel,
        provider: setup.pipelineConfig.generator.provider,
        baseUrl: setup.pipelineConfig.generator.baseUrl,
        searchMode: setup.pipelineConfig.generator.searchMode,
        role: setup.pipelineConfig.generator.role,
      } : undefined;

      const threadStart = Date.now();
      const threadResult = await step.run("generate-thread", async () => {
        const supabase = getSupabase();
        await upsertGenerationLog(supabase, {
          id: logId,
          community_id: communityId,
          status: "running",
          current_step: "generating_thread",
          ...logCorrelation,
        });
        return await generateThread(setup.community, opPersona, contentPayload, generatorConfig);
      });

      if (!threadResult) {
        traceStep(trace, "Thread", "failed",
          "generateThread returned null — model likely returned malformed JSON or empty response",
          { model_gen: modelGen, content_mode: contentPayload.mode },
          threadStart,
          modelGen ?? undefined,
        );

        const tokensUsed = totalTokens;
        await step.run("log-failed-generation", async () => {
          await upsertGenerationLog(getSupabase(), {
            id: logId,
            community_id: setup.community.id,
            status: "failed",
            current_step: "done",
            model_used: modelSearch || modelGen || "unknown",
            searcher_model: modelSearch,
            generator_model: modelGen,
            search_strategy: setup.pipelineConfig.effectiveSearchStrategy,
            error_message: "Thread generation returned no content",
            tokens_used: tokensUsed,
            trace,
            ...logCorrelation,
          });
        });
        return { community: setup.community.slug, status: "failed_thread" };
      }

      traceStep(trace, "Thread", "success",
        `Thread generated, model: ${modelGen ?? "unknown"}`,
        {
          title_length: threadResult.title.length,
          body_length: threadResult.body.length,
          flair: threadResult.flair,
          model_gen: modelGen,
          content_mode: contentPayload.mode,
        },
        threadStart,
        modelGen ?? undefined,
      );

      // STEP 5: Generate Comments
      const commentsStart = Date.now();
      const commentResult = await step.run("generate-comments", async () => {
        const supabase = getSupabase();
        await upsertGenerationLog(supabase, {
          id: logId,
          community_id: communityId,
          status: "running",
          current_step: "generating_comments",
          ...logCorrelation,
        });
        return await generateCommentChain(
          setup.community,
          setup.personas,
          { title: threadResult.title, body: threadResult.body },
          opPersona.id,
          pickCommentCount(setup.commentRange),
          generatorConfig,
          setup.recentCoverage
        );
      });

      const generatedConversation: PipelineConversation = {
        threadContent: threadResult,
        commentChain: commentResult.chain,
        isSafetyFiltered: !!commentResult.isFiltered,
        tokensUsed: (threadResult.tokensUsed ?? 0) + (commentResult.tokensUsed ?? 0),
      };

      totalTokens += generatedConversation.tokensUsed;

      const t3 = Date.now();
      const commentCount = generatedConversation.commentChain.length;
      traceStep(trace, "Comments", commentCount > 0 ? "success" : "skipped",
        commentCount > 0
          ? `${commentCount} comments generated, model: ${modelGen ?? "unknown"}`
          : "No usable comments generated; publishing thread without comments",
        {
          comment_count: commentCount,
          is_safety_filtered: generatedConversation.isSafetyFiltered,
          model_gen: modelGen,
        },
        commentsStart,
        modelGen ?? undefined,
      );

      // STEP 6: Save Everything to DB
      const tokensUsed = totalTokens;
      const threadId: string = await step.run("save-to-db", async (): Promise<string> => {
        const supabase = getSupabase();
        await upsertGenerationLog(supabase, {
          id: logId,
          community_id: communityId,
          status: "running",
          current_step: "saving",
          ...logCorrelation,
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
            is_safety_filtered: generatedConversation.isSafetyFiltered,
            is_published: true,
            published_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (threadErr || !thread) throw new Error(`Thread insert failed: ${threadErr?.message}`);

        // Insert Comments — batch root comments first, then replies
        const chain = generatedConversation.commentChain;
        const rootComments = chain.filter(c => c.parentIndex === null);
        const replyComments = chain.filter(c => c.parentIndex !== null);

        let insertedIds: string[] = [];

        if (rootComments.length > 0) {
          const { data: rootInserted, error: rootErr } = await supabase
            .from("comments")
            .insert(rootComments.map(c => ({
              thread_id: thread.id,
              parent_comment_id: null,
              persona_id: c.persona.id,
              body: c.body,
              depth: 0,
            })))
            .select("id");

          if (rootErr) throw new Error(`Root comment insert failed: ${rootErr.message}`);
          insertedIds = [...(rootInserted ?? []).map(r => r.id)];
        }

        if (replyComments.length > 0) {
          const replyRows = replyComments.map(c => ({
            thread_id: thread.id,
            parent_comment_id: insertedIds[c.parentIndex!],
            persona_id: c.persona.id,
            body: c.body,
            depth: 1,
          }));

          const { data: replyInserted, error: replyErr } = await supabase
            .from("comments")
            .insert(replyRows)
            .select("id");

          if (replyErr) throw new Error(`Reply comment insert failed: ${replyErr.message}`);
          insertedIds.push(...(replyInserted ?? []).map(r => r.id));
        }

        // Finalize state — parallelize independent operations
        const finalCount = generatedConversation.commentChain.length;
        const completedAt = new Date().toISOString();
        await Promise.all([
          supabase.from("threads").update({ comments_count: finalCount, is_ready: true }).eq("id", thread.id),
          supabase.from("communities").update({
            last_generated_at: completedAt,
            last_generation_attempted_at: completedAt,
          }).eq("id", setup.community.id),
          upsertGenerationLog(supabase, {
            id: logId,
            community_id: setup.community.id,
            status: "success",
            current_step: "done",
            model_used: modelSearch || modelGen || "unknown",
            searcher_model: modelSearch,
            generator_model: modelGen,
            search_strategy: setup.pipelineConfig.effectiveSearchStrategy,
            thread_id: thread.id,
            tokens_used: tokensUsed,
            trace,
            ...logCorrelation,
          }),
        ]);

        return thread.id;
      });

      traceStep(trace, "Database", "success",
        `Thread and ${generatedConversation.commentChain.length} comments persisted`,
        { thread_id: threadId, community_id: setup.community.id, model_search: modelSearch, model_gen: modelGen },
        t3,
        modelGen ?? modelSearch ?? undefined,
      );

      // STEP 7: Revalidate Paths
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
          ...logCorrelation,
        });
      });
      throw err;
    }
  }
);
