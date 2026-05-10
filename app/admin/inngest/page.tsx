import { getInngestRuns } from "./actions";
import { RunsTable } from "./RunsTable";

export default async function InngestDashboardPage() {
  const { data: runs, error } = await getInngestRuns();

  if (error) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-light text-foreground">Background Jobs</h1>
          <p className="text-muted mt-2">Monitor and manage Inngest background runs</p>
        </header>
        <div className="bg-surface rounded-xl border border-border shadow-sm p-8 text-center">
          <p className="text-sm text-muted">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light text-foreground">Background Jobs</h1>
          <p className="text-muted mt-2">Monitor and manage Inngest background runs</p>
        </div>
        <div className="flex gap-3 text-xs text-muted">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Completed
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Running
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400" /> Failed
          </span>
        </div>
      </header>

      <RunsTable runs={runs ?? []} />
    </div>
  );
}
