import { getThreads, getAdminCommunities } from "./actions";
import { ThreadsTable } from "./ThreadsTable";
import { GlassSurface } from "@/components/ui/GlassSurface";

export default async function ThreadsAdminPage() {
  const [result, communities] = await Promise.all([
    getThreads({ page: 1, limit: 10 }),
    getAdminCommunities(),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-light tracking-tight text-foreground">Threads</h1>
        <p className="text-sm text-muted mt-1">Browse, filter, and manage all created threads</p>
      </header>

      {result.error ? (
        <GlassSurface className="p-8 text-center">
          <p className="text-sm text-muted">{result.error}</p>
        </GlassSurface>
      ) : (
        <ThreadsTable initialThreads={result.data ?? []} initialTotal={result.total ?? 0} communities={communities} />
      )}
    </div>
  );
}
