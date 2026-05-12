import { getCommunities } from "@/lib/supabase/queries";
import { SidebarLink } from "./SidebarLink";
import { SidebarLogo } from "./SidebarLogo";

export async function Sidebar() {
  const communities = await getCommunities();

  return (
    <aside className="w-56 shrink-0 hidden lg:block border-r border-border h-screen sticky top-0">
      <div className="py-5 px-4 flex flex-col h-full">
        <SidebarLogo />

        <nav className="space-y-1 mt-2">
          <SidebarLink href="/" icon="Circle" label="Home" />
        </nav>

        <div className="mt-8 mb-2">
          <div className="flex items-center gap-3 px-3 mb-4">
            <div className="h-px flex-1 bg-border/60" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap">
              Communities
            </p>
            <div className="h-px w-4 bg-border/60" />
          </div>

          <div className="space-y-1">
            {communities.map((sub) => (
              <SidebarLink
                key={sub.id}
                href={`/c/${sub.slug}`}
                icon={sub.icon_name}
                label={sub.name}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
