import { createClient } from "@/lib/supabase/server";

const STATUS_STYLES: Record<string, { bg: string; text: string; ring: string; label: string }> = {
  success: {
    bg: "bg-green-50",
    text: "text-green-700",
    ring: "ring-green-600/20",
    label: "Success",
  },
  failed: {
    bg: "bg-red-50",
    text: "text-red-700",
    ring: "ring-red-600/20",
    label: "Failed",
  },
  skipped: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    ring: "ring-yellow-600/20",
    label: "Skipped",
  },
};

export default async function GenerationLogsPage() {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("generation_logs")
    .select("*, subreddits(name, slug)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light text-[#4A443F]">Generation Logs</h1>
          <p className="text-[#828A7A] mt-2">Audit trail of AI content creation</p>
        </div>
        <div className="flex gap-3 text-xs text-[#828A7A]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Success
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-400" /> Skipped
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400" /> Failed
          </span>
        </div>
      </header>

      <div className="bg-white rounded-xl border border-[#E5E1DA] shadow-sm overflow-hidden">
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
            {logs?.map((log) => {
              const style = STATUS_STYLES[log.status] ?? STATUS_STYLES.failed;
              return (
                <tr key={log.id} className="hover:bg-[#F9F8F6] transition-colors">
                  <td className="px-6 py-4 text-xs text-[#828A7A] whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#4A443F]">
                    {log.subreddits?.name || "Global"}
                    <span className="block text-[10px] text-[#B5B0A7]">
                      r/{log.subreddits?.slug}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ring-1 ring-inset ${style.bg} ${style.text} ${style.ring}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${style.bg.replace("50", "500")}`} />
                      {style.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-[11px] text-[#828A7A] bg-[#F9F8F6] px-2 py-0.5 rounded">
                      {log.model_used || "—"}
                    </code>
                  </td>
                  <td className="px-6 py-4 text-xs max-w-xs">
                    {log.error_message ? (
                      <div className="group relative">
                        <span className="text-red-500 cursor-default truncate block">
                          {log.error_message.length > 50
                            ? `${log.error_message.slice(0, 50)}...`
                            : log.error_message}
                        </span>
                        {log.error_message.length > 50 && (
                          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10">
                            <div className="bg-[#4A443F] text-white text-xs rounded-lg px-4 py-2 shadow-lg max-w-md whitespace-normal">
                              {log.error_message}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : log.status === "success" ? (
                      <span className="text-green-600">
                        Generated successfully
                        {log.thread_id && (
                          <span className="block text-[10px] text-[#B5B0A7]">ID: {log.thread_id}</span>
                        )}
                      </span>
                    ) : log.status === "skipped" ? (
                      <span className="text-yellow-600">Processing skipped</span>
                    ) : (
                      <span className="text-[#B5B0A7]">No details</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {(!logs || logs.length === 0) && (
          <div className="px-6 py-12 text-center text-sm text-[#B5B0A7]">
            No generation logs found yet. Trigger a generation to see results here.
          </div>
        )}
      </div>
    </div>
  );
}
