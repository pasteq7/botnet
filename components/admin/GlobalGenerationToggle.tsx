"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Power } from "lucide-react";
import { COMMUNITY_CRON_INTERVAL_MINUTES } from "@/lib/constants";

export function GlobalGenerationToggle() {
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings?section=scheduler")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setIsActive(d.is_active));
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const updateTimer = () => {
      const now = new Date();
      const intervalMs = COMMUNITY_CRON_INTERVAL_MINUTES * 60_000;
      const nextTick = Math.ceil(now.getTime() / intervalMs) * intervalMs;
      const diffMs = Math.max(0, nextTick - now.getTime());
      const diffMinutes = Math.floor(diffMs / 60_000);
      const diffSeconds = Math.floor((diffMs % 60_000) / 1000);

      setTimeLeft(`${diffMinutes}:${diffSeconds.toString().padStart(2, "0")}`);
    };

    updateTimer();
    const id = setInterval(updateTimer, 1000);
    return () => clearInterval(id);
  }, [isActive]);

  const toggle = async () => {
    if (isActive === null || loading) return;
    setLoading(true);
    try {
      const getConfig = await fetch("/api/admin/settings?section=scheduler").then((r) => r.json());
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _section: "scheduler", ...getConfig, is_active: !isActive }),
      });
      if (res.ok) setIsActive(!isActive);
    } catch (err) {
      console.error("Failed to toggle generation:", err);
    } finally {
      setLoading(false);
    }
  };

  if (isActive === null) {
    return (
      <div className="h-[46px] rounded-lg bg-surface-hover/40 animate-pulse" />
    );
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={toggle}
      disabled={loading}
      aria-pressed={isActive}
      aria-label={isActive ? "Pause generation" : "Resume generation"}
      title={isActive ? "Pause generation" : "Resume generation"}
      className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-foreground/80 hover:bg-surface-hover hover:text-foreground disabled:cursor-wait disabled:opacity-70"
    >
      <span className="relative flex size-4 shrink-0 items-center justify-center">
        <Power className={`size-4 ${isActive ? "text-accent" : "text-muted"}`} />
        {loading && (
          <Loader2 className="absolute size-4 animate-spin text-muted" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">Generation</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isActive ? "active" : "paused"}
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 2 }}
            transition={{ duration: 0.14 }}
            className="mt-0.5 block truncate text-xs text-muted"
          >
            {isActive ? `Next ${timeLeft || "--:--"}` : "Paused"}
          </motion.span>
        </AnimatePresence>
      </span>

      <span
        className={`relative h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ${
          isActive ? "bg-accent/90" : "bg-muted/25"
        }`}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 600, damping: 38 }}
          className={`block size-4 rounded-full bg-background shadow-sm ${
            isActive ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
    </motion.button>
  );
}
