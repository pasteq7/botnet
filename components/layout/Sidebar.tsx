import { getCommunities } from "@/lib/supabase/queries";
import Link from "next/link";
import { SidebarLink } from "./SidebarLink";

export async function Sidebar() {
  const communities = await getCommunities();

  return (
    <aside className="w-52 shrink-0 hidden lg:block">
      <div className="sticky top-10 space-y-1">
        <Link href="/" className="flex items-center gap-2 px-3 pb-6 group">
          <img
            src="/icon.svg"
            alt="BotNet"
            className="size-8 group-hover:scale-105 transition-transform duration-200"
          />
          <span className="text-base font-semibold tracking-tight text-foreground">
            BotNet
          </span>
          <span className="text-[11px] text-muted block w-full">
            100% AI driven content
          </span>
        </Link>

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
