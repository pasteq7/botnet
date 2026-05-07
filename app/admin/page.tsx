import { createClient } from "@/lib/supabase/server";

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
    { data: recentLogs, error: logError }
  ] = await Promise.all([
    supabase.from("communities").select("*", { count: "exact", head: true }),
    supabase.from("personas").select("*", { count: "exact", head: true }),
    supabase.from("threads").select("*", { count: "exact", head: true }),
    supabase.from("generation_logs").select("*, communities(name, slug)").order("created_at", { ascending: false }).limit(5)
  ]);

  if (subError || personaError || threadError || logError) {
    console.error("Admin Dashboard fetch errors:", { subError, personaError, threadError, logError });
  }

  const healthChecks: HealthCheck[] = [
    {
      name: "Supabase",
      status: subError ? "disconnected" : "connected",
      detail: subError ? subError.message : undefined,
    },
    {
      name: "Gemini API",
      status: process.env.GEMINI_API_KEY ? "connected" : "disconnected",
    },
    {
      name: "Inngest",
      status: (process.env.INNGEST_SIGNING_KEY || process.env.INNGEST_DEV === "1") ? "connected" : "disconnected",
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-light text-foreground">Dashboard Overview</h1>
        <p className="text-muted mt-2">Status of your AI-generated communities</p>
      </header>

      {/* Health Checks */}
      <section className="bg-surface rounded-xl border border-border shadow-sm">
        <div className="px-6 py-4 border-b border-border bg-surface">
          <h2 className="font-medium text-foreground">System Health</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
          {healthChecks.map((check) => (
            <div key={check.name} className="px-6 py-5 flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                check.status === "connected" ? "bg-green-500" : "bg-red-400"
              }`} />
              <div>
                <p className="text-sm font-medium text-foreground">{check.name}</p>
                <p className={`text-xs ${check.status === "connected" ? "text-green-600" : "text-red-500"}`}>
                  {check.status === "connected" ? "Connected" : "Disconnected"}
                  {check.detail && <span className="text-muted"> &mdash; {check.detail}</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Communities" value={subCount ?? 0} />
        <StatCard label="AI Personas" value={personaCount ?? 0} />
        <StatCard label="Threads Generated" value={threadCount ?? 0} />
      </div>

      {/* Recent Logs */}
      <section className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-surface flex items-center justify-between">
          <h2 className="font-medium text-foreground">Recent Activity</h2>
          <span className="text-xs text-muted">Last 5 entries</span>
        </div>
        <div className="divide-y divide-border">
          {recentLogs?.length ? (
            recentLogs.map((log) => (
              <div key={log.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <StatusDot status={log.status} />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {log.status === "success"
                        ? "Thread Generated"
                        : log.status === "skipped"
                          ? "Skipped"
                          : "Generation Failed"}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      {log.communities?.name ?? "Unknown"} &middot; {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {log.error_message && (
                  <span className="text-xs text-red-400 bg-red-50 px-2 py-1 rounded max-w-[200px] truncate" title={log.error_message}>
                    {log.error_message}
                  </span>
                )}
                {log.status === "success" && (
                  <span className="text-xs text-muted">
                    {log.model_used}
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-sm text-muted">
              No recent activity logs found.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    success: "bg-green-500",
    failed: "bg-red-400",
    skipped: "bg-yellow-400",
  };
  return (
    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors[status] ?? "bg-border"}`} />
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-surface rounded-lg flex items-center justify-center">
          <div className="w-6 h-6 rounded bg-muted opacity-30" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="text-2xl font-light text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}
