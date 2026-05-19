"use client";

import { useState } from "react";
import { Loader, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useOverlay } from "@/lib/overlay-store";

interface Props {
  communityId: string;
  communitySlug: string;
  communityName: string;
}

export function CommunityGenerationButton({
  communityId,
  communitySlug,
  communityName,
}: Props) {
  const { addEntry } = useOverlay();
  const [isTriggering, setIsTriggering] = useState(false);
  const [hasError, setHasError] = useState(false);

  async function handleTrigger() {
    if (isTriggering) return;

    setIsTriggering(true);
    setHasError(false);

    try {
      const res = await fetch("/api/admin/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.logId) {
        throw new Error(data?.error || "Failed to queue generation");
      }

      addEntry(data.logId, communitySlug);
    } catch (err) {
      console.error("Failed to trigger sidebar generation:", err);
      setHasError(true);
      window.setTimeout(() => setHasError(false), 3000);
    } finally {
      setIsTriggering(false);
    }
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={handleTrigger}
      disabled={isTriggering}
      title={hasError ? "Generation failed to queue" : `Generate for ${communityName}`}
      aria-label={`Generate for ${communityName}`}
      className={`grid size-7 shrink-0 place-items-center rounded-lg border text-muted transition-all duration-200 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 ${
        hasError
          ? "border-error/40 bg-error/10 text-error"
          : "border-transparent hover:border-accent/30 hover:bg-accent/10 hover:text-accent"
      }`}
    >
      {isTriggering ? (
        <Loader className="size-3.5 animate-spin" />
      ) : (
        <Zap className="size-3.5" />
      )}
    </motion.button>
  );
}
