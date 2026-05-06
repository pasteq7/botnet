import { createClient } from "@/lib/supabase/server";

export default async function GenerationLogsPage() {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("generation_logs")
    .select("*, subreddits(name, slug)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-light text-[#4A443F]">Generation Logs</h1>
        <p className="text-[#828A7A] mt-2">Audit trail of AI content creation</p>
      </header>

      <div className="bg-white rounded-xl border border-[#E5E1DA] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F9F8F6] border-b border-[#E5E1DA]">
              <th className="px-6 py-4 text-sm font-medium text-[#828A7A]">Time</th>
              <th className="px-6 py-4 text-sm font-medium text-[#828A7A]">Subreddit</th>
              <th className="px-6 py-4 text-sm font-medium text-[#828A7A]">Status</th>
              <th className="px-6 py-4 text-sm font-medium text-[#828A7A]">Model</th>
              <th className="px-6 py-4 text-sm font-medium text-[#828A7A]">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E1DA]">
            {logs?.map((log) => (
              <tr key={log.id} className="hover:bg-[#F9F8F6] transition-colors">
                <td className="px-6 py-4 text-xs text-[#828A7A]">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-[#4A443F]">
                  {log.subreddits?.name || "Global"}
                  <span className="block text-[10px] text-[#B5B0A7]">r/{log.subreddits?.slug}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium ${
                    log.status === "success" 
                      ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20" 
                      : "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20"
                  }`}>
                    {log.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-[#828A7A]">
                  {log.model_used}
                </td>
                <td className="px-6 py-4 text-xs">
                  {log.error_message ? (
                    <span className="text-red-500">{log.error_message}</span>
                  ) : (
                    <span className="text-green-600">Generated successfully</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
