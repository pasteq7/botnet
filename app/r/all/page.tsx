import { getAllThreads } from "@/lib/supabase/queries";
import { Sidebar } from "@/components/layout/Sidebar";
import { PostFeed } from "@/components/feed/PostFeed";

export const revalidate = 14400;

export default async function AllPostsPage() {
  const threads = await getAllThreads(50);

  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <div className="mb-6">
          <h1 className="font-serif text-2xl font-bold text-foreground">
            All Posts
          </h1>
          <p className="mt-1 text-muted text-sm">
            Every post from every community, in one feed.
          </p>
        </div>
        <PostFeed threads={threads} />
      </main>
    </div>
  );
}
