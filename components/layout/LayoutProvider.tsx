"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type LayoutMode = "compact" | "full";
export type ThreadDisplay = "compact" | "expanded";

type LayoutContextType = {
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
  threadDisplay: ThreadDisplay;
  setThreadDisplay: (display: ThreadDisplay) => void;
};

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

function getInitialLayoutMode(): LayoutMode {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("layoutMode") as LayoutMode | null;
    if (stored === "compact" || stored === "full") return stored;
  }
  return "compact";
}

function getInitialThreadDisplay(): ThreadDisplay {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("threadDisplay") as ThreadDisplay | null;
    if (stored === "compact" || stored === "expanded") return stored;
  }
  return "compact";
}

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>(getInitialLayoutMode);
  const [threadDisplay, setThreadDisplayState] = useState<ThreadDisplay>(getInitialThreadDisplay);

  const setLayoutMode = useCallback((mode: LayoutMode) => {
    setLayoutModeState(mode);
    localStorage.setItem("layoutMode", mode);
  }, []);

  const setThreadDisplay = useCallback((display: ThreadDisplay) => {
    setThreadDisplayState(display);
    localStorage.setItem("threadDisplay", display);
  }, []);

  return (
    <LayoutContext.Provider value={{ layoutMode, setLayoutMode, threadDisplay, setThreadDisplay }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
}
