"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function SidebarLogo() {
  return (

    <Link href="/" className="flex flex-col px-3 pb-5 group">
      <div className="flex items-center gap-2.5">
        <motion.div
          whileHover={{ scale: 1.02, rotate: 1 }}
          whileTap={{ scale: 0.98 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-accent/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <img
            src="/icon.svg"
            alt="BotNet"
            className="size-10 relative z-10 drop-shadow-sm opacity-90 group-hover:opacity-100 transition-opacity"
          />
        </motion.div>
        <div className="flex flex-col">
          <span className="text-base font-semibold tracking-tight text-foreground/90 leading-tight">
            BotNet
          </span>
          <span className="text-[11px] text-muted/50 font-normal leading-tight">
            100% AI driven content
          </span>

        </div>
      </div>

    </Link>

  );
}
