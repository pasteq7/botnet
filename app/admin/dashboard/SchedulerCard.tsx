"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Pause } from "lucide-react";

import { CommunityIcon } from "@/components/ui/CommunityIcon";
import { GlassSurface } from "@/components/ui/GlassSurface";
import { SectionHeader } from "@/app/admin/dashboard/DashboardPrimitives";
import type { NextDueCommunity } from "@/app/admin/dashboard/types";
import { formatTime } from "@/app/admin/dashboard/utils";

export function SchedulerCard({
  mounted,
  nextCronTick,
  nextDueCommunities,
  schedulerPaused,
  onRefresh,
  className = "",
}: {
  mounted: boolean;
  nextCronTick: string;
  nextDueCommunities: NextDueCommunity[];
  schedulerPaused: boolean;
  onRefresh: () => void;
  className?: string;
}) {
  const dueCount = nextDueCommunities.length;

  return (
    <GlassSurface as="section" className={`flex min-h-0 flex-col overflow-hidden ${className}`}>
      <SectionHeader title="Scheduler" detail={schedulerPaused ? "Paused" : `${dueCount} due`} />

      <div className="flex flex-1 flex-col justify-center p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 sm:divide-x sm:divide-border/10 xl:grid-cols-1 xl:divide-x-0 xl:gap-4 flex-1 items-center">
          {/* Section 1: Next Tick countdown */}
          <div className="flex items-center gap-4 sm:pr-6 xl:pr-0 min-w-0">
            <div className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-surface/50 shadow-inner">
              {schedulerPaused ? (
                <Pause className="size-4 text-muted/70" />
              ) : (
                <>
                  <motion.div
                    className="absolute inset-0 rounded-full border-[1.5px] border-accent/10 border-r-accent/60 border-t-accent/60"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                  />
                  <Clock className="size-4 text-accent/80 animate-pulse" />
                </>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted/75">
                Next tick
              </p>
              <SchedulerCountdown
                nextCronTick={nextCronTick}
                paused={schedulerPaused}
                mounted={mounted}
                onComplete={onRefresh}
              />
            </div>
          </div>

          {/* Section 2: Due list / Status messages */}
          <div className="flex flex-col justify-center min-w-0 sm:pl-6 xl:pl-0">
            {/* If there are due communities */}
            {!schedulerPaused && nextDueCommunities.length > 0 && (
              <div className="min-w-0">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted/75">
                  Upcoming Due
                </p>
                <div className="divide-y divide-border/8">
                  {nextDueCommunities.slice(0, 4).map((community, index) => (
                    <motion.div
                      key={community.id}
                      initial={{ opacity: 0, x: 5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between gap-3 py-1.5 first:pt-0 last:pb-0"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="font-mono text-[11px] text-muted/55">
                          {(index + 1).toString().padStart(2, "0")}
                        </span>
                        <CommunityIcon
                          name={community.icon_name ?? "Hash"}
                          size="sm"
                          className="!size-5 shrink-0 !rounded bg-surface/40 !p-1 text-muted/70"
                        />
                        <p className="truncate text-sm font-medium leading-none text-foreground/90">
                          {community.name}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-xs font-semibold text-accent/85">
                        {mounted ? formatTime(community.next_due_at) : "--:--"}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* If no due communities */}
            {!schedulerPaused && nextDueCommunities.length === 0 && (
              <div className="flex flex-col justify-center py-1">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted/75">
                  Queue Status
                </p>
                <p className="text-sm font-medium italic text-muted/75">Nothing due on the next tick</p>
              </div>
            )}

            {/* If paused */}
            {schedulerPaused && (
              <div className="flex flex-col justify-center py-1">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted/75">
                  Queue Status
                </p>
                <p className="text-sm font-medium italic text-muted/75">Scheduler is currently paused</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </GlassSurface>
  );
}

function SchedulerCountdown({
  nextCronTick,
  paused,
  mounted,
  onComplete,
}: {
  nextCronTick: string;
  paused: boolean;
  mounted: boolean;
  onComplete: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const completedRef = useRef(false);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const target = nextCronTick ? new Date(nextCronTick).getTime() : 0;
  const timeLeft = paused || !target ? 0 : Math.max(0, target - now);

  useEffect(() => {
    completedRef.current = false;

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    if (paused || !nextCronTick) return;

    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(id);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [nextCronTick, paused, onComplete]);

  useEffect(() => {
    if (paused || !nextCronTick || timeLeft > 0 || completedRef.current) return;

    completedRef.current = true;
    refreshTimeoutRef.current = setTimeout(onComplete, 300);
  }, [nextCronTick, onComplete, paused, timeLeft]);

  if (!mounted) {
    return (
      <p className="mt-0.5 font-mono text-2xl font-medium leading-none tracking-tight text-foreground">
        --:--
      </p>
    );
  }

  if (paused) {
    return (
      <p className="mt-0.5 font-mono text-2xl font-medium leading-none tracking-tight text-muted/75">
        PAUSED
      </p>
    );
  }

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  return (
    <div className="mt-0.5 flex items-center gap-2">
      <p className="font-mono text-3xl font-medium leading-none tracking-tight text-foreground">
        {minutes.toString().padStart(2, "0")}
        <span className="text-muted/65">:</span>
        {seconds.toString().padStart(2, "0")}
      </p>
      {timeLeft > 0 && timeLeft <= 60000 && (
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="size-1.5 rounded-full bg-accent"
        />
      )}
    </div>
  );
}
