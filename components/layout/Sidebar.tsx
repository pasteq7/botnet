import { getCommunities } from "@/lib/supabase/queries";
import { SidebarLink } from "./SidebarLink";
import { SidebarLogo } from "./SidebarLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LayoutModeToggle } from "@/components/layout/LayoutModeToggle";
import { ThreadDisplayToggle } from "@/components/layout/ThreadDisplayToggle";
import { CommunityGenerationButton } from "@/components/layout/CommunityGenerationButton";
import { GenerationStatusOverlay } from "@/components/admin/GenerationStatusOverlay";
import { OverlayProvider } from "@/lib/overlay-store";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_SIDEBAR_GENERATION_BUTTON_ENABLED } from "@/lib/constants";

export async function Sidebar() {
  const communities = await getCommunities();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let showGenerationButtons = false;

  if (user) {
    const admin = createAdminClient();
    const { data: schedulerConfig } = await admin
      .from("scheduler_config")
      .select("sidebar_generation_button_enabled")
      .maybeSingle();

    showGenerationButtons =
      schedulerConfig?.sidebar_generation_button_enabled ??
      DEFAULT_SIDEBAR_GENERATION_BUTTON_ENABLED;
  }

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

          {showGenerationButtons ? (
            <OverlayProvider>
              <div className="space-y-0.5">
                {communities.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-1">
                    <div className="min-w-0 flex-1">
                      <SidebarLink
                        href={`/c/${sub.slug}`}
                        icon={sub.icon_name}
                        label={sub.name}
                      />
                    </div>
                    <CommunityGenerationButton
                      communityId={sub.id}
                      communitySlug={sub.slug}
                      communityName={sub.name}
                    />
                  </div>
                ))}
              </div>
              <GenerationStatusOverlay />
            </OverlayProvider>
          ) : (
            communities.map((sub) => (
              <SidebarLink
                key={sub.id}
                href={`/c/${sub.slug}`}
                icon={sub.icon_name}
                label={sub.name}
              />
            ))
          )}

        </div>

        <div className="mt-auto pt-3 border-t border-border/60 grid grid-cols-3 gap-0.5">
          <LayoutModeToggle />
          <ThreadDisplayToggle />
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
