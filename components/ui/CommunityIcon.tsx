"use client";

import * as LucideIcons from "lucide-react";
import { motion } from "framer-motion";

interface CommunityIconProps {
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function CommunityIcon({ name, size = "md", className }: CommunityIconProps) {
  // @ts-expect-error - Dynamically access Lucide icons
  const Icon = LucideIcons[name] || LucideIcons.Hash;

  const sizeClasses = {
    sm: "size-6 p-1 rounded-md",
    md: "size-9 p-2 rounded-xl",
    lg: "size-12 p-3 rounded-2xl",
  };

  const iconSize = {
    sm: 14,
    md: 20,
    lg: 24,
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`inline-flex items-center justify-center shrink-0 transition-colors duration-200 ${sizeClasses[size]} ${className || ""}`}
    >
      <Icon size={iconSize[size]} strokeWidth={1.8} />
    </motion.div>
  );
}
