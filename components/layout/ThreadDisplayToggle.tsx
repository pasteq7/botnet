"use client";

import { List, TextSelect } from "lucide-react";
import { useLayout } from "./LayoutProvider";

export function ThreadDisplayToggle() {
  const { threadDisplay, setThreadDisplay } = useLayout();

  return (
    <button
      type="button"
      onClick={() => setThreadDisplay(threadDisplay === "compact" ? "expanded" : "compact")}
      className="flex items-center justify-center w-full h-10 rounded-lg text-foreground/80 hover:bg-surface-hover transition-colors duration-150"
      aria-label={`Switch to ${threadDisplay === "compact" ? "expanded" : "compact"} thread view`}
    >
      {threadDisplay === "expanded" ? (
        <List className="size-5" />
      ) : (
        <TextSelect className="size-5" />
      )}
    </button>
  );
}
