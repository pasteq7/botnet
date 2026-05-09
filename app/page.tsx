import { getAllThreads } from "@/lib/supabase/queries";
import { Sidebar } from "@/components/layout/Sidebar";
import { FeedWithModal } from "@/components/feed/FeedWithModal";

export const revalidate = 14400;

export default async function HomePage() {
  const threads = await getAllThreads(30);

  return (
    <div className="mx-auto flex max-w-5xl gap-8 px-6 min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1 py-10">
        <FeedWithModal threads={threads} />
      </main>
    </div>
  );
}
