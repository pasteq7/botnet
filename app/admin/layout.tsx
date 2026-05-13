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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-56 border-r border-border/60 flex flex-col h-full shrink-0"
      >
        <div className="p-5 border-b border-border/60">
          <Link href="/admin" className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
            <Image src="/icon.svg" alt="BotNet" width={20} height={20} className="size-5" />
            <span className="tracking-tight">Admin</span>
          </Link>
        </div>

        <SidebarNav />

        <div className="p-4 border-t border-border/60 space-y-0.5">
          <ThemeToggle />
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-hover rounded-lg transition-colors duration-150"
          >
            <Settings className="size-4 shrink-0" />
            Settings
          </button>
          <LogoutButton />
        </div>
      </motion.aside>

      <main className="flex-1 p-8 overflow-y-auto scrollbar-thin">
        <div className="max-w-6xl mx-auto text-foreground">
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
  );
}
