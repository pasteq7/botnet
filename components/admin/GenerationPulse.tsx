"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check } from "lucide-react";

type PulseState = "idle" | "generating" | "success";

export function GenerationPulse() {
  const [state, setState] = useState<PulseState>("idle");

  useEffect(() => {
    const supabase = createClient();

    const checkStatus = async () => {
      const [queued, latest] = await Promise.all([
        supabase.from("generation_logs").select("id").eq("status", "queued").limit(1),
        supabase.from("generation_logs").select("status").order("created_at", { ascending: false }).limit(1),
      ]);
      if (queued.data?.length) {
        setState("generating");
      } else if (latest.data?.[0]?.status === "success") {
        setState("success");
      } else {
        setState("idle");
      }
    };

    checkStatus();

    const channel = supabase
      .channel("generation-pulse-sidebar")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "generation_logs" },
        checkStatus
      )
      .subscribe();

    // Auto-dismiss success after 10s
    const timer = state === "success" ? setTimeout(() => setState("idle"), 10000) : undefined;

    return () => {
      supabase.removeChannel(channel);
      if (timer) clearTimeout(timer);
    };
  }, [state]);

  if (state === "idle") return null;

  if (state === "success") {
    return (
      <span className="ml-auto flex items-center justify-center size-3">
        <Check className="size-3 text-green-500" strokeWidth={3} />
      </span>
    );
  }

  return (
    <span className="relative flex size-1.5 ml-auto">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
      <span className="relative inline-flex rounded-full size-1.5 bg-accent"></span>
    </span>
  );
}
