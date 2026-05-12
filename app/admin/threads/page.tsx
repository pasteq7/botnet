import { getThreads } from "./actions";
import { ThreadsTable } from "./ThreadsTable";

export default async function ThreadsAdminPage() {
  const result = await getThreads({ page: 1, limit: 50 });

  return (
    <div className="space-y-8 max-w-6xl">
      <header>
        <h1 className="text-xl font-light tracking-tight text-foreground">Threads</h1>
        <p className="text-sm text-muted mt-1">Browse, filter, and manage all created threads</p>
      </header>

      {result.error ? (
        <div className="rounded-xl border border-border/60 bg-surface shadow-sm p-8 text-center">
          <p className="text-sm text-muted">{result.error}</p>
        </div>
      ) : (
        <ThreadsTable initialThreads={result.data ?? []} initialTotal={result.total ?? 0} />
      )}
    </div>
  );
}
