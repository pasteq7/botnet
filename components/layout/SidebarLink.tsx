"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

interface Props {
  href: string;
  icon: string;
  label: string;
}

export function SidebarLink({ href, icon, label }: Props) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link href={href} className="relative block group">
      <div className="relative px-3 py-2 flex items-center gap-3 transition-colors duration-300">
        {isActive && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute inset-0 bg-surface rounded-xl border border-border/50"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        
        <span className={`relative z-10 shrink-0 text-lg transition-transform duration-300 group-hover:scale-110 ${
          isActive ? "text-accent" : "text-muted group-hover:text-foreground"
        }`}>
          {icon}
        </span>
        
        <span className={`relative z-10 truncate text-[13px] font-medium tracking-wide transition-colors duration-300 ${
          isActive ? "text-foreground" : "text-muted group-hover:text-foreground"
        }`}>
          {label}
        </span>

        {!isActive && (
          <motion.div
            className="absolute inset-0 bg-surface-hover/0 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 -z-10"
            whileHover={{ scale: 1.02 }}
          />
        )}
      </div>
    </Link>
  );
}
