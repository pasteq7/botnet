"use client";

import * as LucideIcons from "lucide-react";
import { motion } from "framer-motion";

interface CommunityIconProps {
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const ICON_STYLES: Record<string, { bg: string; text: string }> = {
  // Mapping common icon names to pastel Japandi colors
  Globe: { bg: "bg-[#e1e6e8]", text: "text-[#4a5a61]" }, // Dusty Blue
  Microscope: { bg: "bg-[#e3e8e1]", text: "text-[#4a5a4d]" }, // Sage
  Scroll: { bg: "bg-[#e8e6e1]", text: "text-[#5a564a]" }, // Ochre
  BookOpen: { bg: "bg-[#f2efe9]", text: "text-[#615e55]" }, // Sand
  Github: { bg: "bg-[#e2e2e2]", text: "text-[#4a4a4a]" }, // Slate/Gray
  Gamepad2: { bg: "bg-[#e8e1e1]", text: "text-[#614a4a]" }, // Terracotta
  Palmtree: { bg: "bg-[#e3e8e1]", text: "text-[#4a5a4d]" }, // Sage
  Music: { bg: "bg-[#f0e6f2]", text: "text-[#5a4a61]" }, // Lavender
  Sprout: { bg: "bg-[#e3e8e1]", text: "text-[#4a5a4d]" }, // Sage
  VeniceMask: { bg: "bg-[#f2e9e9]", text: "text-[#614a4a]" }, // Soft Rose
  Home: { bg: "bg-[#f2efe9]", text: "text-[#615e55]" }, // Sand
  Newspaper: { bg: "bg-[#e1e6e8]", text: "text-[#4a5a61]" }, // Dusty Blue
};

const DEFAULT_STYLE = { bg: "bg-surface", text: "text-muted" };

export function CommunityIcon({ name, className = "", size = "md" }: CommunityIconProps) {
  // @ts-ignore - Dynamically access Lucide icons
  const Icon = LucideIcons[name] || LucideIcons.Hash;
  const style = ICON_STYLES[name] || DEFAULT_STYLE;

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
      className={`inline-flex items-center justify-center shrink-0 transition-colors duration-200 ${sizeClasses[size]} ${style.bg} ${style.text} ${className}`}
    >
      <Icon size={iconSize[size]} strokeWidth={1.8} />
    </motion.div>
  );
}
