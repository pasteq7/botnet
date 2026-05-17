import { getCommunities } from "@/lib/supabase/queries";
import { SidebarLink } from "./SidebarLink";
import { SidebarLogo } from "./SidebarLogo";
import { AccentColorPicker } from "@/components/theme/AccentColorPicker";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LayoutModeToggle } from "@/components/layout/LayoutModeToggle";
import { ThreadDisplayToggle } from "@/components/layout/ThreadDisplayToggle";

export async function Sidebar() {
  const communities = await getCommunities();

  return (
    <aside className="w-52 shrink-0 hidden lg:block border-r border-border h-screen sticky top-0">
      <div className="py-3 px-3 flex flex-col h-full">
        <SidebarLogo />

        <nav className="mt-1">
          <SidebarLink href="/" icon="Circle" label="Home" />
        </nav>

        <div className="mt-4">
          <div className="flex items-center gap-2 px-2 mb-1.5">
            <div className="h-px flex-1 bg-border/60" />
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] whitespace-nowrap text-muted">
              Communities
            </p>
            <div className="h-px w-3 bg-border/60" />
          </div>

          {communities.map((sub) => (
            <SidebarLink
              key={sub.id}
              href={`/c/${sub.slug}`}
              icon={sub.icon_name}
              label={sub.name}
            />
          ))}

        </div>

        <div className="mt-auto pt-3 border-t border-border/60 grid grid-cols-4 gap-0.5">
          <LayoutModeToggle />
          <ThreadDisplayToggle />
          <AccentColorPicker />
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
