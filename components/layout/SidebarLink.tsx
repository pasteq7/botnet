// components/layout/SidebarLink.tsx
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
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 group
        ${isActive
          ? "bg-surface text-foreground border border-border/50"
          : "text-muted hover:bg-surface/60 hover:text-foreground border border-transparent"
        }`}
    >
      <span className={`shrink-0 text-lg transition-colors duration-200
        ${isActive ? "text-accent" : "text-muted group-hover:text-foreground"}`}
      >
        {icon}
      </span>
      <span className={`truncate text-[13px] tracking-wide transition-colors duration-200
        ${isActive ? "font-medium text-foreground" : "font-normal group-hover:text-foreground"}`}
      >
        {label}
      </span>
    </Link>
  );
}