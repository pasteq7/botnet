// components/layout/SidebarLink.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CommunityIcon } from "../ui/CommunityIcon";


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
      className={`relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-all duration-200 group
        ${isActive
          ? "bg-surface text-foreground border border-border/50"
          : "text-muted hover:bg-surface/60 hover:text-foreground border border-transparent"
        }`}
    >
      <CommunityIcon 
        name={icon} 
        size="sm"
        className={isActive ? "text-accent" : "opacity-80 group-hover:opacity-100"}
      />

      <span className={`truncate text-[12px] tracking-wide transition-colors duration-200
        ${isActive ? "font-medium text-foreground" : "font-normal group-hover:text-foreground"}`}
      >
        {label}
      </span>
    </Link>
  );
}