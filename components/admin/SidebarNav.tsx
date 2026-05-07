"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", icon: "📊", label: "Dashboard" },
  { href: "/admin/subreddits", icon: "🏘️", label: "Subreddits" },
  { href: "/admin/personas", icon: "🎭", label: "Personas" },
  { href: "/admin/logs", icon: "📜", label: "Generation Logs" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-4 space-y-1">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
              isActive
                ? "bg-[#E5E1DA] text-[#4A443F] shadow-sm"
                : "text-[#4A443F] hover:bg-[#F9F8F6]"
            }`}
          >
            <span className={`text-lg transition-opacity ${isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
