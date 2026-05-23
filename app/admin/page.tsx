import { createClient } from "@/lib/supabase/server";
import { getDueCommunitiesAt, getEffectiveSchedulerConfig, getNextCommunityCronTick } from "@/lib/scheduler/due-communities";
import { DashboardContent } from "./DashboardContent";

interface HealthCheck {
  name: string;
  status: "connected" | "disconnected";
  detail?: string;
}

interface RecentThread {
  id: string;
  title: string;
  comments_count: number;
  content_mode: string;
  is_ready: boolean;
  is_safety_filtered: boolean;
  generated_at: string;
  communities: { name: string; slug: string; icon_name?: string | null } | null;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  const [
    { count: subCount, error: subError },
    { count: personaCount, error: personaError },
    { count: threadCount, error: threadError },
    { data: recentLogs, error: logError },
    { count: daySuccess },
    { count: dayFailed },
    { count: daySkipped },
    { count: hourSuccess },
    { count: hourFailed },
    { count: hourSkipped },
    { data: schedulerConfig },
    { data: activeCommunities },
    { count: commentCount },
    { count: dayThreadCount },
    { data: recentThreads },
    { data: dayTokenLogs, error: tokenError },
    { count: daySafetyFiltered, error: safetyError },
  ] = await Promise.all([
    supabase.from("communities").select("*", { count: "exact", head: true }),
    supabase.from("personas").select("*", { count: "exact", head: true }),
    supabase.from("threads").select("*", { count: "exact", head: true }),
    supabase.from("generation_logs").select("*, communities(name, slug)").order("created_at", { ascending: false }).limit(15),
    supabase.from("generation_logs").select("*", { count: "exact", head: true }).eq("status", "success").gte("created_at", twentyFourHoursAgo),
    supabase.from("generation_logs").select("*", { count: "exact", head: true }).eq("status", "failed").gte("created_at", twentyFourHoursAgo),
    supabase.from("generation_logs").select("*", { count: "exact", head: true }).eq("status", "skipped").gte("created_at", twentyFourHoursAgo),
    supabase.from("generation_logs").select("*", { count: "exact", head: true }).eq("status", "success").gte("created_at", oneHourAgo),
    supabase.from("generation_logs").select("*", { count: "exact", head: true }).eq("status", "failed").gte("created_at", oneHourAgo),
    supabase.from("generation_logs").select("*", { count: "exact", head: true }).eq("status", "skipped").gte("created_at", oneHourAgo),
    supabase
      .from("scheduler_config")
      .select("max_per_run, default_interval_minutes, is_active")
      .maybeSingle(),
    supabase
      .from("communities")
      .select("id, slug, name, icon_name, generation_interval_minutes, last_generated_at, last_generation_attempted_at")
      .eq("is_active", true),
    supabase.from("comments").select("*", { count: "exact", head: true }),
    supabase.from("threads").select("*", { count: "exact", head: true }).gte("generated_at", twentyFourHoursAgo),
    supabase
      .from("threads")
      .select("id, title, comments_count, content_mode, is_ready, is_safety_filtered, generated_at, communities(name, slug, icon_name)")
      .order("generated_at", { ascending: false })
      .limit(15),
    supabase.from("generation_logs").select("tokens_used, created_at, status").gte("created_at", twentyFourHoursAgo),
    supabase.from("threads").select("*", { count: "exact", head: true }).eq("is_safety_filtered", true).gte("generated_at", twentyFourHoursAgo),
  ]);

  const dayStats = {
    success: daySuccess ?? 0,
    failed: dayFailed ?? 0,
    skipped: daySkipped ?? 0,
  };

  const hourStats = {
    success: hourSuccess ?? 0,
    failed: hourFailed ?? 0,
    skipped: hourSkipped ?? 0,
  };

  const validTokenLogs = (dayTokenLogs ?? [])
    .filter((l): l is { tokens_used: number; created_at: string; status: string | null } => l.tokens_used !== null && l.tokens_used > 0 && typeof l.created_at === "string");
  const avgTokensDay = validTokenLogs.length > 0
    ? Math.round(validTokenLogs.reduce((acc, curr) => acc + (curr.tokens_used ?? 0), 0) / validTokenLogs.length)
    : 0;
  const tokenHistory = (dayTokenLogs ?? [])
    .filter((l): l is { tokens_used: number | null; created_at: string; status: string | null } => typeof l.created_at === "string")
    .map((log) => ({
      tokens_used: log.tokens_used,
      created_at: log.created_at,
      status: log.status,
    }));

  if (subError || personaError || threadError || logError || tokenError || safetyError) {
    console.error("Admin Dashboard fetch errors:", { subError, personaError, threadError, logError, tokenError, safetyError });
  }

  const nextCronTick = getNextCommunityCronTick(now);
  const nextDueCommunities = getDueCommunitiesAt(activeCommunities ?? [], schedulerConfig, nextCronTick);
  const effectiveScheduler = getEffectiveSchedulerConfig(schedulerConfig);

  const { data: activeConfigs } = await supabase
    .from("ai_configs")
    .select("id, provider, label, default_model")
    .eq("is_active", true);

  const aiChecks: HealthCheck[] = activeConfigs?.length
    ? activeConfigs.map((c) => ({
        name: `${c.provider.charAt(0).toUpperCase() + c.provider.slice(1)} API`,
        status: "connected" as const,
        detail: `${c.label} (${c.default_model})`,
      }))
    : [{ name: "AI API", status: "disconnected" as const, detail: "No active config" }];

  const healthChecks: HealthCheck[] = [
    {
      name: "Supabase",
      status: subError ? "disconnected" : "connected",
      detail: subError ? subError.message : undefined,
    },
    ...aiChecks,
    {
      name: "Inngest",
      status: (process.env.INNGEST_SIGNING_KEY || process.env.INNGEST_DEV === "1") ? "connected" : "disconnected",
    },
  ];

  const normalizedRecentThreads: RecentThread[] = (recentThreads ?? []).map((thread) => ({
    id: thread.id,
    title: thread.title,
    comments_count: thread.comments_count,
    content_mode: thread.content_mode,
    is_ready: thread.is_ready,
    is_safety_filtered: thread.is_safety_filtered,
    generated_at: thread.generated_at,
    communities: firstRelation(thread.communities),
  }));

  return (
    <DashboardContent
      healthChecks={healthChecks}
      subCount={subCount ?? 0}
      activeCommunityCount={activeCommunities?.length ?? 0}
      personaCount={personaCount ?? 0}
      threadCount={threadCount ?? 0}
      commentCount={commentCount ?? 0}
      dayThreadCount={dayThreadCount ?? 0}
      recentLogs={recentLogs ?? []}
      recentThreads={normalizedRecentThreads}
      dayStats={dayStats}
      hourStats={hourStats}
      nextCronTick={nextCronTick.toISOString()}
      nextDueCommunities={nextDueCommunities}
      schedulerPaused={!effectiveScheduler.isActive}
      avgTokensDay={avgTokensDay}
      daySafetyFiltered={daySafetyFiltered ?? 0}
      tokenHistory={tokenHistory}
    />
  );
}
