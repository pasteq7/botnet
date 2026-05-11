"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGroup, motion } from "framer-motion";
import { LayoutDashboard, Users, UserCircle, ScrollText, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/communities", icon: Users, label: "Communities" },
  { href: "/admin/personas", icon: UserCircle, label: "Personas" },
  { href: "/admin/logs", icon: ScrollText, label: "Activity Logs" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <LayoutGroup>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 px-4 py-2.5 text-sm font-normal rounded-lg transition-colors duration-150 ${
                isActive
                  ? "text-foreground bg-surface-hover"
                  : "text-muted hover:text-foreground hover:bg-surface-hover"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="active-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <motion.span
                className="flex items-center gap-3 w-full"
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </motion.span>
            </Link>
          );
        })}
      </nav>
    </LayoutGroup>
  );
}
