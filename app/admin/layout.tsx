"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Settings } from "lucide-react";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { SidebarNav } from "@/components/admin/SidebarNav";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
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

  return (
    <OverlayProvider>
      <SettingsProvider openSettings={() => setSettingsOpen(true)}>
        <div className="flex h-screen bg-background overflow-hidden">

          {/* Sidebar */}
          <motion.aside
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-52 border-r border-border/40 flex flex-col h-full shrink-0"
          >
            {/* Logo */}
            <div className="px-4 mt-1 h-12 flex items-center shrink-0 border-b border-border/40">
              <Link
                href="/admin"
                className="flex items-center gap-2.5 text-sm font-semibold text-foreground hover:opacity-80 transition-opacity"
              >
                <Image src="/icon.svg" alt="BotNet" width={25} height={25} className="size-[25px]" />
                <span className="tracking-tight">BotNet Admin</span>
              </Link>
            </div>

            {/* Nav — grows to fill available space */}
            <div className="flex-1 overflow-y-auto pt-3 pb-8 scrollbar-thin">
              <SidebarNav />
            </div>

            {/* Footer — user + actions */}
            <div className="shrink-0 border-t border-border/40 p-4 pt-6 space-y-2">

              <GlobalGenerationToggle />

              {/* Settings button */}
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-3 w-full px-2 py-3 rounded-md text-sm text-foreground/80 hover:text-foreground hover:bg-surface-hover transition-colors duration-150"
              >
                <Settings className="size-5 shrink-0" />
                <span className="font-medium">Settings</span>
              </button>


              {/* Compact actions */}
              <div className="grid grid-cols-2 gap-1 pt-2 border-t border-border/40">
                <ThemeToggle />
                <LogoutButton />
              </div>
            </div>


          </motion.aside>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 text-foreground">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
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