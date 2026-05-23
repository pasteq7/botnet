"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  ExternalLink,
  Globe,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  Newspaper,
} from "lucide-react";
import { motion } from "framer-motion";

import { CommunityIcon } from "@/components/ui/CommunityIcon";
import { GlassSurface } from "@/components/ui/GlassSurface";
import { SectionHeader } from "@/app/admin/dashboard/DashboardPrimitives";
import type { RecentThread } from "@/app/admin/dashboard/types";
import { timeAgo } from "@/app/admin/dashboard/utils";
import { staggerContainer } from "@/app/admin/dashboard/animation";

export function ThreadFeed({
  threads,
  mounted,
  className = "",
}: {
  threads: RecentThread[];
  mounted: boolean;
  className?: string;
}) {
  const feedThreads = threads.slice(0, 15);

  return (
    <GlassSurface as="section" className={`flex min-h-0 flex-col overflow-hidden ${className}`}>
      <SectionHeader title="Outcomes" detail="Posts" />

      {feedThreads.length > 0 ? (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="flex-1 divide-y divide-border/5 overflow-y-auto scrollbar-thin"
        >
          {feedThreads.map((thread) => (
            <ThreadRow key={thread.id} thread={thread} mounted={mounted} />
          ))}
        </motion.div>
      ) : (
        <div className="flex flex-1 items-center justify-center py-8 text-sm font-medium text-muted/70">
          No posts
        </div>
      )}
    </GlassSurface>
  );
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 120,
      damping: 18,
    },
  },
};

function ThreadRow({ thread, mounted }: { thread: RecentThread; mounted: boolean }) {
  const modeConfig: Record<string, { icon: ReactNode; bg: string; text: string }> = {
    news: {
      icon: <Newspaper className="size-3" />,
      bg: "bg-accent/10 border-accent/20",
      text: "text-accent",
    },
    tips: {
      icon: <Lightbulb className="size-3" />,
      bg: "bg-success/10 border-success/20",
      text: "text-success",
    },
    discussion: {
      icon: <MessageSquare className="size-3" />,
      bg: "bg-surface/50 border-border/20",
      text: "text-muted",
    },
    ask: {
      icon: <HelpCircle className="size-3" />,
      bg: "bg-warning/10 border-warning/20",
      text: "text-warning",
    },
  };

  const mode = modeConfig[thread.content_mode.toLowerCase()] || {
    icon: <Globe className="size-3" />,
    bg: "bg-surface/40 border-border/10",
    text: "text-muted",
  };

  return (
    <motion.div
      variants={itemVariants}
      className="group border-b border-border/8 px-3.5 py-3 transition-all duration-300 hover:bg-surface-hover/25 last:border-b-0 sm:px-4 sm:py-3.5"
    >
      {/* Mobile Layout (<640px) */}
      <div className="flex flex-col gap-2 sm:hidden">
        {/* Top meta line */}
        <div className="flex items-center justify-between text-xs text-muted/70">
          <div className="flex items-center gap-1.5 font-medium">
            {thread.communities && (
              <CommunityIcon
                name={thread.communities.icon_name ?? "Hash"}
                size="sm"
                className="!size-4 shrink-0 !rounded bg-surface/40 !p-0.5 text-muted/70"
              />
            )}
            <span className="text-foreground/80">{thread.communities?.name ?? "General"}</span>
          </div>
          <span>{mounted ? timeAgo(thread.generated_at) : "--"}</span>
        </div>

        {/* Title */}
        <a
          href={`/c/${thread.communities?.slug || "general"}/${thread.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group/link flex items-start gap-1 text-sm font-semibold leading-relaxed text-foreground transition-colors duration-150 hover:text-accent"
        >
          <span className="line-clamp-2 min-w-0 flex-1">{thread.title}</span>
          <ExternalLink className="mt-0.5 size-3 shrink-0 text-muted/55 opacity-0 transition-opacity duration-150 group-hover/link:opacity-100" />
        </a>

        {/* Bottom actions & indicators */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-2">
            {/* Mode badge with label instead of just circle */}
            <div
              className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium leading-none ${mode.bg} ${mode.text}`}
              title={`Content Mode: ${thread.content_mode}`}
            >
              {mode.icon}
              <span className="capitalize">{thread.content_mode}</span>
            </div>

            {thread.is_safety_filtered && (
              <div
                className="flex items-center gap-1 rounded-full border border-error/20 bg-error/10 px-1.5 py-1 text-[11px] font-medium text-error"
                title="Safety Filtered"
              >
                <AlertTriangle className="size-2.5 animate-pulse" />
                <span>Filtered</span>
              </div>
            )}
          </div>

          {/* Comments count */}
          <div className="flex items-center gap-1 text-xs text-muted/70" title={`${thread.comments_count} comments`}>
            <MessageSquare className="size-3 text-muted/65" />
            <span className="font-mono font-semibold">{thread.comments_count}</span>
          </div>
        </div>
      </div>

      {/* Desktop Layout (>=640px) */}
      <div className="hidden sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {thread.communities && (
            <CommunityIcon
              name={thread.communities.icon_name ?? "Hash"}
              size="sm"
              className="!size-5 shrink-0 !rounded bg-surface/40 !p-0.5 text-muted/70"
            />
          )}

          <a
            href={`/c/${thread.communities?.slug || "general"}/${thread.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group/link flex min-w-0 flex-1 items-center gap-1 text-sm font-semibold text-foreground/95 transition-colors duration-150 hover:text-accent"
            title={thread.title}
          >
            <span className="min-w-0 flex-1 truncate">{thread.title}</span>
            <ExternalLink className="size-3 shrink-0 text-muted/55 opacity-0 transition-opacity duration-150 group-hover/link:opacity-100" />
          </a>

          <div
            className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-transform duration-300 hover:scale-110 ${mode.bg} ${mode.text}`}
            title={`Content Mode: ${thread.content_mode}`}
          >
            {mode.icon}
          </div>

          {thread.is_safety_filtered && (
            <div
              className="flex size-5 shrink-0 animate-pulse items-center justify-center rounded-full border border-error/20 bg-error/10 text-error"
              title="Safety Filtered"
            >
              <AlertTriangle className="size-2.5" />
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3 text-xs text-muted/70">
          <span className="font-medium">{mounted ? timeAgo(thread.generated_at) : "--"}</span>
          <div className="flex items-center gap-1 rounded border border-border/15 bg-surface/45 px-1.5 py-0.5 text-muted/80" title={`${thread.comments_count} comments`}>
            <MessageSquare className="size-3 text-muted/65" />
            <span className="font-mono font-semibold">{thread.comments_count}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
