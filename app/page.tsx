import { getAllThreads } from "@/lib/supabase/queries";
import { Sidebar } from "@/components/layout/Sidebar";
import { FeedWithModal } from "@/components/feed/FeedWithModal";
import { AppLayout } from "@/components/layout/AppLayout";

export const revalidate = 14400;

export default async function HomePage() {
  const threads = await getAllThreads(30);

  return (
    <AppLayout sidebar={<Sidebar />}>
      <FeedWithModal threads={threads} />
    </AppLayout>
  );
}
