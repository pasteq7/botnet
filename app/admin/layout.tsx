"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Globe, Settings } from "lucide-react";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { SidebarNav } from "@/components/admin/SidebarNav";
import { AccentColorPicker } from "@/components/theme/AccentColorPicker";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { BotNetIcon } from "@/components/ui/BotNetIcon";
import { GlassSurface } from "@/components/ui/GlassSurface";
import SettingsModal from "@/components/admin/SettingsModal";
import { OverlayProvider } from "@/lib/overlay-store";
import { SettingsProvider } from "@/lib/settings-context";
import { GenerationStatusOverlay } from "@/components/admin/GenerationStatusOverlay";
import { GlobalGenerationToggle } from "@/components/admin/GlobalGenerationToggle";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isDashboard = pathname === "/admin";

  return (
    <OverlayProvider>
      <SettingsProvider openSettings={() => setSettingsOpen(true)}>
        <div className="flex h-screen overflow-hidden">

          {/* Sidebar */}
          <GlassSurface
            as={motion.aside}
            variant="sidebar"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative z-30 w-52 rounded-none border-y-0 border-l-0 flex flex-col h-full shrink-0"
          >
            {/* Logo */}
            <div className="px-4 mt-1 h-12 flex items-center shrink-0 border-b border-border/40">
              <Link
                href="/admin"
                className="flex items-center gap-2.5 text-sm font-semibold text-foreground hover:opacity-80 transition-opacity"
              >
                <BotNetIcon className="size-[25px] text-accent" />
                <span className="tracking-tight">BotNet Admin</span>
              </Link>
            </div>

            {/* Nav — grows to fill available space */}
            <div className="flex-1 overflow-y-auto pt-3 pb-8 scrollbar-thin">
              <SidebarNav />
            </div>

            {/* Footer — user + actions */}
            <div className="shrink-0 border-t border-border/40 px-3 py-3">

              <GlobalGenerationToggle />

              <div className="mt-2 space-y-1 border-t border-border/40 pt-2">
                {/* View Website Link */}
                <Link
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-foreground/80 hover:text-foreground hover:bg-surface-hover transition-colors duration-150"
                >
                  <motion.span
                    className="flex items-center gap-3 w-full"
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.12, ease: "easeOut" }}
                  >
                    <Globe className="size-4 shrink-0" />
                    <span className="font-medium">View Website</span>
                    <ExternalLink className="ml-auto size-3.5 shrink-0 text-foreground/50" aria-hidden="true" />
                  </motion.span>
                </Link>

                {/* Settings button */}
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-foreground/80 hover:text-foreground hover:bg-surface-hover transition-colors duration-150"
                >
                  <Settings className="size-4 shrink-0" />
                  <span className="font-medium">Settings</span>
                </button>
              </div>


              {/* Compact actions */}
              <div className="grid grid-cols-3 gap-1 mt-2 pt-2 border-t border-border/40">
                <AccentColorPicker />
                <ThemeToggle />
                <LogoutButton />
              </div>
            </div>


          </GlassSurface>

          {/* Main content */}
          <main className={`min-w-0 flex-1 ${isDashboard ? "overflow-hidden" : "overflow-y-auto scrollbar-thin"}`}>
            <div
              className={`w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 text-foreground ${
                isDashboard ? "h-full min-h-0 py-4" : "py-8"
              }`}
            >
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className={isDashboard ? "h-full min-h-0" : undefined}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>

          <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </div>
        <GenerationStatusOverlay />
      </SettingsProvider>
    </OverlayProvider>
  );
}
