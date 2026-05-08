import { getCommunities } from "@/lib/supabase/queries";
import { SidebarLink } from "./SidebarLink";
import { SidebarLogo } from "./SidebarLogo";

export async function Sidebar() {
  const communities = await getCommunities();

  return (
    <aside className="w-56 shrink-0 hidden lg:block border-r border-border/40 min-h-screen">
      <div className="sticky top-0 h-screen py-2 px-4 flex flex-col">
        <SidebarLogo />

        <nav className="space-y-1 mt-2">
          <SidebarLink href="/" icon="○" label="Home" />
        </nav>

        <div className="mt-8 mb-2">
          <div className="flex items-center gap-3 px-3 mb-4">
            <div className="h-px flex-1 bg-border/60" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/80 whitespace-nowrap">
              Communities
            </p>
            <div className="h-px w-4 bg-border/60" />
          </div>

          <div className="space-y-1">
            {communities.map((sub) => (
              <SidebarLink
                key={sub.id}
                href={`/c/${sub.slug}`}
                icon={sub.icon_emoji}
                label={sub.name}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
