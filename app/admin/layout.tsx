"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { SidebarNav } from "@/components/admin/SidebarNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background">
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-56 border-r border-border/60 bg-surface flex flex-col"
      >
        <div className="p-5 border-b border-border/60">
          <Link href="/admin" className="flex items-center gap-2.5 text-sm font-medium text-foreground">
            <Image src="/icon.svg" alt="BotNet" width={20} height={20} className="size-5" />
            <span className="tracking-tight">Admin</span>
          </Link>
        </div>

        <SidebarNav />

        <div className="p-5 border-t border-border/60">
          <LogoutButton />
        </div>
      </motion.aside>

      <main className="flex-1 p-8 overflow-auto">
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
    </div>
  );
}
