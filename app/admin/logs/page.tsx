import { getLogs } from "./actions";
import { LogsDashboard } from "./LogsDashboard";

export default async function ActivityLogsPage() {
  const result = await getLogs({ page: 1, limit: 10 });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-light tracking-tight text-foreground">Activity Logs</h1>
        <p className="text-sm text-muted mt-1">Audit trail of AI content generation and background jobs</p>
      </header>

      {result.error ? (
          <div className="rounded-xl border border-border/60 bg-surface shadow-sm p-8 text-center">
          <p className="text-sm text-muted">{result.error}</p>
        </div>
      ) : (
        <LogsDashboard initialLogs={result.data ?? []} initialTotal={result.total ?? 0} />
      )}
    </div>
  );
}
