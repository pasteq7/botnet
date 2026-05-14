"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Power, PowerOff, Loader2 } from "lucide-react";

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
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();

      const nextTick = Math.ceil((minutes + (seconds > 0 ? 0.1 : 0)) / 15) * 15;
      let diffMinutes = nextTick - minutes;
      let diffSeconds = 60 - seconds;

      if (diffSeconds === 60) {
        diffSeconds = 0;
      } else {
        diffMinutes -= 1;
      }

      if (diffMinutes < 0) diffMinutes = 14;

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

  if (isActive === null) return null;

  return (
    <div className="space-y-1">
      {/* Next tick — sits quietly above the button */}
      <AnimatePresence>
        {isActive && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between px-2 pb-2"
          >
            <span className="text-xs tracking-wide text-foreground/60 uppercase">
              Next tick
            </span>
            <span className="text-sm font-medium tabular-nums text-muted/80">
              {timeLeft}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={toggle}
        disabled={loading}
        className={`flex items-center gap-2.5 w-full px-2 py-4 rounded-md text-sm transition-all duration-150 ${isActive
          ? "text-foreground/100 bg-accent/5 hover:bg-accent/10 border border-accent/40"
          : "text-muted hover:text-foreground hover:bg-surface-hover border border-transparent"
          }`}
      >
        <div className="shrink-0">
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isActive ? (
            <Power className="size-4 text-accent" />
          ) : (
            <PowerOff className="size-4" />
          )}
        </div>
        <span className="flex-1 text-left font-medium truncate">
          {isActive ? "Engine Running" : "Engine Paused"}
        </span>
        {!loading && (
          <span
            className={`size-1.5 rounded-full shrink-0 ${isActive
              ? "bg-accent shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]"
              : "bg-muted/40"
              }`}
          />
        )}
      </motion.button>
    </div>
  );
}