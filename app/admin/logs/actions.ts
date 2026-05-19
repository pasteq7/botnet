"use server"

import { createClient } from "@supabase/supabase-js";
import type { ActivityLog, ActivityLogDetails, StepTrace, TraceEntry } from "@/types";
import { getServerSupabaseUrl } from "@/lib/supabase/urls";

const CLOUD_API_BASE = "https://api.inngest.com";

function getSupabase() {
  return createClient(
    getServerSupabaseUrl(),
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: { persistSession: false },
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
      },
    }
  );
}

function getInngestApiBase() {
  const rawBase =
    process.env.INNGEST_REST_API_BASE_URL ||
    (process.env.INNGEST_DEV === "1"
      ? process.env.INNGEST_DEVSERVER_URL || process.env.INNGEST_BASE_URL || "http://localhost:8288"
      : process.env.INNGEST_BASE_URL || CLOUD_API_BASE);

  const base = rawBase.replace(/\/+$/, "");
  return base.endsWith("/v1") ? base : `${base}/v1`;
}

function isLocalInngestBase(base: string) {
  return process.env.INNGEST_DEV === "1" || /:\/\/(localhost|127\.0\.0\.1|inngest)(:|\/)/.test(base);
}

function getInngestHeaders(base: string) {
  const key = process.env.INNGEST_SIGNING_KEY || process.env.INNGEST_REST_API_KEY;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key) headers.Authorization = `Bearer ${key}`;
  if (!key && !isLocalInngestBase(base)) {
    return {
      headers,
      error: "INNGEST_SIGNING_KEY or INNGEST_REST_API_KEY is required to fetch Inngest cloud run details.",
    };
  }
  return { headers, error: null };
}

function getDataArray(json: unknown): Record<string, unknown>[] {
  const data = (json as { data?: unknown })?.data;
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (Array.isArray(json)) return json as Record<string, unknown>[];
  return [];
}

async function fetchInngestJson(url: string, headers: Record<string, string>) {
  const res = await fetch(url, { headers, cache: "no-store" });
  const text = await res.text();
  let json: unknown = null;

  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { message: text };
    }
  }

  if (!res.ok) {
    const body = json as { error?: string; message?: string } | null;
    throw new Error(body?.error || body?.message || `HTTP ${res.status}`);
  }

  return json;
}

function stringifyMaybe(value: unknown) {
  if (value === null || value === undefined) return undefined;
  return typeof value === "string" ? value : JSON.stringify(value);
}

function normalizeStepList(rawSteps: unknown): StepTrace[] {
  if (!Array.isArray(rawSteps)) return [];

  return rawSteps.map((s: Record<string, unknown>) => ({
    id: String(s.id ?? s.job_id ?? s.jobID ?? s.step_id ?? s.stepId ?? s.name ?? ""),
    name: String(s.name ?? s.step_name ?? s.stepName ?? s.id ?? "step"),
    status: String(s.status ?? "unknown"),
    started_at: String(s.started_at ?? s.startedAt ?? s.run_started_at ?? s.created_at ?? ""),
    ended_at: (s.ended_at ?? s.endedAt ?? s.completed_at ?? s.updated_at ?? null) as string | null,
    output: stringifyMaybe(s.output ?? s.result),
    error: stringifyMaybe(s.error),
  }));
}

function normalizeSteps(runOrJobs: unknown): StepTrace[] {
  const source = runOrJobs as Record<string, unknown> | null;
  const directSteps = normalizeStepList(source?.steps);
  if (directSteps.length) return directSteps;

  const jobs = normalizeStepList(source?.jobs);
  if (jobs.length) return jobs;

  const dataJobs = normalizeStepList((source?.data as Record<string, unknown> | undefined)?.jobs);
  if (dataJobs.length) return dataJobs;

  if (source?.run_id || source?.id) {
    return [{
      id: String(source.run_id ?? source.id),
      name: String(source.function_name ?? source.function_id ?? "Function run"),
      status: String(source.status ?? "unknown"),
      started_at: String(source.run_started_at ?? source.started_at ?? source.startedAt ?? ""),
      ended_at: (source.ended_at ?? source.endedAt ?? null) as string | null,
      output: stringifyMaybe(source.output),
      error: stringifyMaybe(source.error),
    }];
  }

  return [];
}

async function findEventIdByLogId(base: string, headers: Record<string, string>, logId: string) {
  const eventsJson = await fetchInngestJson(
    `${base}/events?name=botnet/community.generate`,
    headers,
  );
  const events = getDataArray(eventsJson);
  const match = events.find((event) => {
    const data = event.data as Record<string, unknown> | undefined;
    return data?.logId === logId;
  });

  return typeof match?.id === "string" ? match.id : null;
}

async function enrichWithInngest(details: ActivityLogDetails) {
  const base = getInngestApiBase();
  const { headers, error } = getInngestHeaders(base);
  if (error) {
    details.inngest_steps_error = error;
    return;
  }

  let eventId = details.inngest_event_id ?? null;
  if (!eventId) {
    try {
      eventId = await findEventIdByLogId(base, headers, details.id);
    } catch (err) {
      details.inngest_steps_error = `Could not search Inngest events: ${err instanceof Error ? err.message : String(err)}`;
      return;
    }
  }

  if (!eventId) {
    details.inngest_steps_error = "No Inngest event ID recorded for this log.";
    return;
  }

  details.inngest_event_id = eventId;

  try {
    const runsJson = await fetchInngestJson(`${base}/events/${eventId}/runs`, headers);
    const runs = getDataArray(runsJson);
    const firstRun = runs[0];

    if (!firstRun) {
      details.inngest_steps_error = "Inngest returned no runs for this event yet.";
      return;
    }

    const runId = firstRun.run_id ?? firstRun.id;
    if (typeof runId === "string") {
      details.inngest_run_id = runId;
    }

    let steps = normalizeSteps(firstRun);

    if (details.inngest_run_id) {
      try {
        const runJson = await fetchInngestJson(`${base}/runs/${details.inngest_run_id}`, headers);
        const detailedRun = (runJson as { data?: unknown })?.data ?? runJson;
        const detailedSteps = normalizeSteps(detailedRun);
        if (detailedSteps.length) steps = detailedSteps;
      } catch {
        // Some dev-server/API versions expose jobs but not detailed run payloads.
      }

      try {
        const jobsJson = await fetchInngestJson(`${base}/runs/${details.inngest_run_id}/jobs`, headers);
        const jobSteps = normalizeStepList(getDataArray(jobsJson));
        if (jobSteps.length) steps = jobSteps;
      } catch {
        // Jobs are a best-effort enrichment; keep the run-level fallback.
      }
    }

    details.steps = steps;

    if (details.inngest_run_id) {
      const supabase = getSupabase();
      await supabase
        .from("generation_logs")
        .update({ inngest_event_id: eventId, inngest_run_id: details.inngest_run_id })
        .eq("id", details.id);
    }
  } catch (err) {
    details.inngest_steps_error = `Could not fetch Inngest run details: ${err instanceof Error ? err.message : String(err)}`;
  }
}

export async function getLogs(params?: {
  page?: number;
  limit?: number;
  status?: string;
  communityId?: string;
}) {
  try {
    const supabase = getSupabase();
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 50;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("generation_logs")
      .select("id, community_id, thread_id, status, current_step, model_used, searcher_model, generator_model, tokens_used, error_message, search_strategy, created_at, communities(name, slug)", { count: "exact" });

    if (params?.status) {
      query = query.eq("status", params.status);
    }
    if (params?.communityId) {
      query = query.eq("community_id", params.communityId);
    }

    const { data: logs, error: dbError, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (dbError) throw new Error(`Database query failed: ${dbError.message}`);

    const items: ActivityLog[] = (logs ?? []).map((log: Record<string, unknown>) => {
      const communities = log.communities as Record<string, unknown> | null;
      return {
        id: log.id as string,
        community_id: log.community_id as string,
        community_name: (communities?.name as string | null) ?? null,
        community_slug: (communities?.slug as string | null) ?? null,
        thread_id: (log.thread_id as string | null) ?? null,
        status: log.status as string,
        model_used: (log.model_used as string | null) ?? null,
        searcher_model: (log.searcher_model as string | null) ?? null,
        generator_model: (log.generator_model as string | null) ?? null,
        search_strategy: (log.search_strategy as string | null) ?? null,
        tokens_used: (log.tokens_used as number | null) ?? null,
        current_step: (log.current_step as string | null) ?? null,
        error_message: (log.error_message as string | null) ?? null,
        created_at: log.created_at as string,
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

export async function getLogDetails(logId: string) {
  try {
    const supabase = getSupabase();
    const { data: log, error: dbError } = await supabase
      .from("generation_logs")
      .select("*, communities(name, slug)")
      .eq("id", logId)
      .single();

    if (dbError || !log) {
      return { error: "Log entry not found." };
    }

    const rawTrace = log.trace as Record<string, unknown>[] | null;
    const details: ActivityLogDetails = {
      id: log.id,
      community_id: log.community_id,
      community_name: log.communities?.name ?? null,
      community_slug: log.communities?.slug ?? null,
      thread_id: log.thread_id ?? null,
      status: log.status,
      model_used: log.model_used ?? null,
      searcher_model: log.searcher_model ?? null,
      generator_model: log.generator_model ?? null,
      search_strategy: log.search_strategy ?? null,
      tokens_used: log.tokens_used ?? null,
      current_step: log.current_step ?? null,
      error_message: log.error_message ?? null,
      created_at: log.created_at,
      trace: Array.isArray(rawTrace) ? (rawTrace as unknown as TraceEntry[]) : undefined,
      inngest_event_id: log.inngest_event_id ?? undefined,
      inngest_run_id: log.inngest_run_id ?? undefined,
    };

    await enrichWithInngest(details);

    return { data: details };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getLogsChartData(granularity: "day" | "hour" | "minute" = "day") {
  try {
    const supabase = getSupabase();

    const now = Date.now();
    const rangeMs =
      granularity === "day" ? 30 * 24 * 60 * 60 * 1000
      : granularity === "hour" ? 7 * 24 * 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;

    const since = new Date(now - rangeMs).toISOString();

    const { data, error } = await supabase
      .from("generation_logs")
      .select("status, created_at")
      .gte("created_at", since);

    if (error) throw error;

    const countsByDate: Record<string, Record<string, number>> = {};

    for (const log of data ?? []) {
      const d = new Date(log.created_at);
      const pad = (n: number) => String(n).padStart(2, "0");
      const date =
        granularity === "day"
          ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
          : granularity === "hour"
          ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:00`
          : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

      if (!countsByDate[date]) {
        countsByDate[date] = {};
      }
      const status: string = log.status;
      countsByDate[date][status] = (countsByDate[date][status] ?? 0) + 1;
    }

    const chartData = Object.entries(countsByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({
        date,
        success: counts.success ?? 0,
        failed: counts.failed ?? 0,
        skipped: counts.skipped ?? 0,
        running: counts.running ?? 0,
        queued: counts.queued ?? 0,
        cancelled: counts.cancelled ?? 0,
      }));

    return { data: chartData };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
