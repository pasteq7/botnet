import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { count: subCount, error: subError },
    { count: personaCount, error: personaError },
    { count: threadCount, error: threadError },
    { data: recentLogs, error: logError }
  ] = await Promise.all([
    supabase.from("subreddits").select("*", { count: "exact", head: true }),
    supabase.from("personas").select("*", { count: "exact", head: true }),
    supabase.from("threads").select("*", { count: "exact", head: true }),
    supabase.from("generation_logs").select("*").order("created_at", { ascending: false }).limit(5)
  ]);

  if (subError || personaError || threadError || logError) {
    console.error("Admin Dashboard fetch errors:", { subError, personaError, threadError, logError });
  }


  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-light text-[#4A443F]">Dashboard Overview</h1>
        <p className="text-[#828A7A] mt-2">Status of your AI-generated communities</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Subreddits" value={subCount ?? 0} icon="🏘️" />
        <StatCard label="AI Personas" value={personaCount ?? 0} icon="🎭" />
        <StatCard label="Threads Generated" value={threadCount ?? 0} icon="🧵" />
      </div>

      {/* Recent Logs */}
      <section className="bg-white rounded-xl border border-[#E5E1DA] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E1DA] bg-[#F9F8F6]">
          <h2 className="font-medium text-[#4A443F]">Recent Activity</h2>
        </div>
        <div className="divide-y divide-[#E5E1DA]">
          {recentLogs?.length ? (
            recentLogs.map((log) => (
              <div key={log.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#4A443F]">
                    {log.status === "success" ? "✅ Thread Generated" : "❌ Generation Failed"}
                  </p>
                  <p className="text-xs text-[#828A7A] mt-1">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
                {log.error_message && (
                  <span className="text-xs text-red-400 bg-red-50 px-2 py-1 rounded">
                    {log.error_message}
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-sm text-[#B5B0A7]">
              No recent activity logs found.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-[#E5E1DA] hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-4">
        <span className="text-3xl bg-[#F9F8F6] p-3 rounded-lg">{icon}</span>
        <div>
          <p className="text-sm font-medium text-[#828A7A]">{label}</p>
          <p className="text-2xl font-light text-[#4A443F]">{value}</p>
        </div>
      </div>
    </div>
  );
}
