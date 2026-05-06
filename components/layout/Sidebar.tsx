import { getSubreddits } from "@/lib/supabase/queries";
import { SidebarLink } from "./SidebarLink";

export async function Sidebar() {
  const subreddits = await getSubreddits();

  return (
    <aside className="w-64 shrink-0 hidden lg:block">
      <div className="rounded-xl border border-border bg-surface p-4 shadow-soft sticky top-20">
        <nav className="space-y-1">
          <SidebarLink href="/" icon="🏠" label="Home" />
          <SidebarLink href="/r/all" icon="📋" label="All Posts" />
          <div className="my-3 border-t border-border" />
          <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted">
            Communities
          </h2>
          {subreddits.map((sub) => (
            <SidebarLink
              key={sub.id}
              href={`/r/${sub.slug}`}
              icon={sub.icon_emoji}
              label={sub.name}
            />
          ))}
        </nav>
      </div>
    </aside>
  );
}
