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
            className="w-56 border-r border-border/60 flex flex-col h-full shrink-0"
          >
            {/* Logo */}
            <div className="px-4 h-14 flex items-center shrink-0 border-b border-border/60">
              <Link
                href="/admin"
                className="flex items-center gap-2.5 text-sm font-semibold text-foreground hover:opacity-80 transition-opacity"
              >
                <Image src="/icon.svg" alt="BotNet" width={18} height={18} className="size-[18px]" />
                <span className="tracking-tight">BotNet Admin</span>
              </Link>
            </div>

            {/* Nav — grows to fill available space */}
            <div className="flex-1 overflow-y-auto py-3 scrollbar-thin">
              <SidebarNav />
            </div>

            {/* Footer — user + actions */}
            <div className="shrink-0 border-t border-border/60 p-3 space-y-1">

              {/* Settings button */}
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-colors duration-150"
              >
                <Settings className="size-4 shrink-0" />
                <span>Settings</span>
              </button>

              {/* User row */}
              <div className="flex items-center gap-2 px-2.5 py-2 rounded-md">

                {/* Compact actions */}
                <div className="flex items-center gap-0.5 shrink-0 ml-auto">
                  <ThemeToggle />
                  <LogoutButton />
                </div>
              </div>

            </div>
          </motion.aside>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="max-w-6xl mx-auto px-8 py-8 text-foreground">
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