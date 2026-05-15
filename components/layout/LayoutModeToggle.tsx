"use client";

import { LayoutPanelLeft, StretchHorizontal } from "lucide-react";
import { useLayout } from "./LayoutProvider";

export function LayoutModeToggle() {
  const { layoutMode, setLayoutMode } = useLayout();

  return (
    <button
      type="button"
      onClick={() => setLayoutMode(layoutMode === "compact" ? "full" : "compact")}
      className="flex items-center justify-center w-full h-10 rounded-lg text-foreground/80 hover:bg-surface-hover transition-colors duration-150"
      aria-label={`Switch to ${layoutMode === "compact" ? "full" : "compact"} layout`}
    >
      {layoutMode === "full" ? (
        <StretchHorizontal className="size-5" />
      ) : (
        <LayoutPanelLeft className="size-5" />
      )}
    </button>
  );
}
