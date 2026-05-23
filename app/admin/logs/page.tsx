import { getLogs } from "./actions";
import { LogsDashboard } from "./LogsDashboard";
import { GlassSurface } from "@/components/ui/GlassSurface";

export default async function ActivityLogsPage() {
  const result = await getLogs({ page: 1, limit: 10 });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-light tracking-tight text-foreground">Activity Logs</h1>
        <p className="text-sm text-muted mt-1">Audit trail of AI content generation and background jobs</p>
      </header>

      {result.error ? (
        <GlassSurface className="p-8 text-center">
          <p className="text-sm text-muted">{result.error}</p>
        </GlassSurface>
      ) : (
        <LogsDashboard initialLogs={result.data ?? []} initialTotal={result.total ?? 0} />
      )}
    </div>
  );
}
