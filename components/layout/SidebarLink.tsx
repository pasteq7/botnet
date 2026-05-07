"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  href: string;
  icon: string;
  label: string;
}

export function SidebarLink({ href, icon, label }: Props) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-150 ${
        isActive
          ? "bg-surface text-foreground font-medium"
          : "text-muted hover:text-foreground hover:bg-surface-hover"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
