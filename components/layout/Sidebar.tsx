import { getCommunities } from "@/lib/supabase/queries";
import { SidebarLink } from "./SidebarLink";

export async function Sidebar() {
  const communities = await getCommunities();

  return (
    <aside className="w-52 shrink-0 hidden lg:block">
      <div className="sticky top-10 space-y-1">
        <div className="flex items-center gap-2 px-3 pb-6">
          <img src="/icon.svg" alt="BotNet" className="size-8" />
          <span className="text-base font-semibold tracking-tight text-foreground">
            BotNet
          </span>
        </div>

        <SidebarLink href="/" icon="○" label="Home" />

        <div className="my-4 border-t border-border" />

        <p className="px-3 pb-2 text-[10px] font-medium uppercase tracking-widest text-muted">
          Communities
        </p>
        {communities.map((sub) => (
          <SidebarLink
            key={sub.id}
            href={`/c/${sub.slug}`}
            icon={sub.icon_emoji}
            label={sub.name}
          />
        ))}
      </div>
    </aside>
  );
}
