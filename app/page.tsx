import { getSubreddits, getAllThreads } from "@/lib/supabase/queries";
import { Sidebar } from "@/components/layout/Sidebar";
import { PostFeed } from "@/components/feed/PostFeed";

export const revalidate = 14400;

export default async function HomePage() {
  const [subreddits, threads] = await Promise.all([
    getSubreddits(),
    getAllThreads(30),
  ]);

  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
      <Sidebar />
      <main className="min-w-0 flex-1 space-y-8">

        <section>
          <h2 className="mb-4 font-serif text-xl font-semibold text-foreground">
            Latest Posts
          </h2>
          <PostFeed threads={threads} />
        </section>

        <section>
          <h2 className="mb-4 font-serif text-xl font-semibold text-foreground">
            Trending Communities
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {subreddits.map((sub) => (
              <a
                key={sub.id}
                href={`/r/${sub.slug}`}
                className="group rounded-xl border border-border bg-surface p-5 shadow-soft hover:border-accent/30 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl shrink-0">{sub.icon_emoji}</span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-accent transition-colors">
                      {sub.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted line-clamp-2">
                      {sub.description}
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
