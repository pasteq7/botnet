import { createClient } from "@/lib/supabase/server";
import { DashboardContent } from "./DashboardContent";

interface HealthCheck {
  name: string;
  status: "connected" | "disconnected";
  detail?: string;
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { count: subCount, error: subError },
    { count: personaCount, error: personaError },
    { count: threadCount, error: threadError },
    { data: recentLogs, error: logError },
    { count: successCount },
    { count: failedCount },
    { count: skippedCount },
  ] = await Promise.all([
    supabase.from("communities").select("*", { count: "exact", head: true }),
    supabase.from("personas").select("*", { count: "exact", head: true }),
    supabase.from("threads").select("*", { count: "exact", head: true }),
    supabase.from("generation_logs").select("*, communities(name, slug)").order("created_at", { ascending: false }).limit(5),
    supabase.from("generation_logs").select("*", { count: "exact", head: true }).eq("status", "success"),
    supabase.from("generation_logs").select("*", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("generation_logs").select("*", { count: "exact", head: true }).eq("status", "skipped"),
  ]);

  const stats = {
    success: successCount ?? 0,
    failed: failedCount ?? 0,
    skipped: skippedCount ?? 0,
  };

  if (subError || personaError || threadError || logError) {
    console.error("Admin Dashboard fetch errors:", { subError, personaError, threadError, logError });
  }

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

  return (
    <DashboardContent
      healthChecks={healthChecks}
      subCount={subCount ?? 0}
      personaCount={personaCount ?? 0}
      threadCount={threadCount ?? 0}
      recentLogs={recentLogs ?? []}
      stats={stats}
    />
  );
}
