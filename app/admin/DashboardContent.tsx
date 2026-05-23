"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { ActivityFeed } from "@/app/admin/dashboard/ActivityFeed";
import { fadeUp, staggerContainer } from "@/app/admin/dashboard/animation";
import { MetricStrip } from "@/app/admin/dashboard/MetricStrip";
import { ProductionCard } from "@/app/admin/dashboard/ProductionCard";
import { PulseBar } from "@/app/admin/dashboard/PulseBar";
import { SchedulerCard } from "@/app/admin/dashboard/SchedulerCard";
import { ThreadFeed } from "@/app/admin/dashboard/ThreadFeed";
import { TokenUsageChart } from "@/app/admin/dashboard/TokenUsageChart";
import type { DashboardContentProps } from "@/app/admin/dashboard/types";
import { buildActivityItems } from "@/app/admin/dashboard/utils";
import { useSettings } from "@/lib/settings-context";

export function DashboardContent({
  healthChecks,
  subCount,
  activeCommunityCount,
  personaCount,
  threadCount,
  commentCount,
  dayThreadCount,
  recentLogs,
  recentThreads,
  dayStats,
  hourStats,
  nextCronTick,
  nextDueCommunities,
  schedulerPaused,
  avgTokensDay = 0,
  tokenHistory = [],
}: DashboardContentProps) {
  const { openSettings } = useSettings();
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);
  const [range, setRange] = useState<"day" | "hour">("day");
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const activeStats = range === "day" ? dayStats : hourStats;
  const avgComments = threadCount > 0 ? (commentCount / threadCount).toFixed(1) : "0";

  const activityItems = useMemo(
    () => buildActivityItems(recentThreads, recentLogs),
    [recentThreads, recentLogs],
  );

  const totalTokens24h = useMemo(
    () => tokenHistory.reduce((sum, log) => sum + (log.tokens_used ?? 0), 0),
    [tokenHistory],
  );

  return (
    <motion.div
      className="flex h-full min-h-0 max-h-full flex-col gap-4 overflow-hidden sm:gap-5"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={fadeUp} className="shrink-0">
        <PulseBar
          healthChecks={healthChecks}
          onRefresh={refresh}
          onOpenSettings={openSettings}
        />
      </motion.div>

      <motion.div variants={fadeUp} className="shrink-0">
        <MetricStrip
          communities={subCount}
          activeCommunities={activeCommunityCount}
          threads={threadCount}
          todayThreads={dayThreadCount}
          comments={commentCount}
          avgComments={avgComments}
          personas={personaCount}
          totalTokens24h={totalTokens24h}
          avgTokensDay={avgTokensDay}
        />
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1 scrollbar-thin sm:gap-5 xl:overflow-hidden"
      >
        <div className="grid min-h-[188px] shrink-0 grid-cols-1 items-stretch gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <motion.div variants={fadeUp} className="min-w-0">
            <TokenUsageChart tokenHistory={tokenHistory} mounted={mounted} className="h-full" />
          </motion.div>

          <ProductionCard range={range} setRange={setRange} stats={activeStats} className="h-full" />
        </div>

        <div className="grid min-h-[220px] flex-1 grid-cols-1 items-stretch gap-4 sm:gap-5 xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_380px]">
          <ActivityFeed items={activityItems} mounted={mounted} className="h-full" />
          <ThreadFeed threads={recentThreads} mounted={mounted} className="h-full" />
          <SchedulerCard
            mounted={mounted}
            nextCronTick={nextCronTick}
            nextDueCommunities={nextDueCommunities}
            schedulerPaused={schedulerPaused}
            onRefresh={refresh}
            className="h-full"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
