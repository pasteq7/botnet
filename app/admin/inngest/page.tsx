import { getInngestRuns } from "./actions";
import { RunsTable } from "./RunsTable";

export default async function InngestDashboardPage() {
  const { data: runs, error } = await getInngestRuns();

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light text-foreground">Background Jobs</h1>
          <p className="text-muted mt-2">Monitor and manage background generation runs</p>
        </div>
        <div className="flex gap-3 text-xs text-muted">
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

      {process.env.INNGEST_DEV === "1" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-3 text-sm text-amber-700 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span>Inngest Dev Server is active. Use <a href="http://127.0.0.1:8288" className="underline font-medium hover:text-amber-800" target="_blank" rel="noopener noreferrer">http://127.0.0.1:8288</a> for step-level traces.</span>
        </div>
      )}

      {error ? (
        <div className="bg-surface rounded-xl border border-border shadow-sm p-8 text-center">
          <p className="text-sm text-muted">{error}</p>
        </div>
      ) : (
        <RunsTable runs={runs ?? []} />
      )}
    </div>
  );
}
