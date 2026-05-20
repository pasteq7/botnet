"use client";

import { createContext, useContext, useReducer, useCallback, type ReactNode } from "react";

export type GenerationStatus = "queued" | "running" | "success" | "failed" | "skipped";

export function normalizeGenerationStatus(status: unknown): GenerationStatus {
  const value = typeof status === "string" ? status.toLowerCase() : "";
  if (value === "completed") return "success";
  if (value === "error" || value === "cancelled" || value === "canceled") return "failed";
  if (value === "queued" || value === "running" || value === "success" || value === "failed" || value === "skipped") {
    return value;
  }
  return "failed";
}

export interface OverlayEntry {
  logId: string;
  communitySlug: string;
  status: GenerationStatus;
  current_step: string | null;
  error_message: string | null;
  thread_id: string | null;
  triggeredAt: number;
}

type Action =
  | { type: "ADD_ENTRY"; logId: string; communitySlug: string }
  | { type: "UPDATE_ENTRY"; logId: string; data: Partial<OverlayEntry> }
  | { type: "DISMISS_ENTRY"; logId: string };

function reducer(state: OverlayEntry[], action: Action): OverlayEntry[] {
  switch (action.type) {
    case "ADD_ENTRY":
      if (state.some((e) => e.logId === action.logId)) return state;
      return [
        ...state,
        {
          logId: action.logId,
          communitySlug: action.communitySlug,
          status: "queued",
          current_step: null,
          error_message: null,
          thread_id: null,
          triggeredAt: Date.now(),
        },
      ];
    case "UPDATE_ENTRY":
      return state.map((e) =>
        e.logId === action.logId
          ? {
              ...e,
              ...action.data,
              status: action.data.status ? normalizeGenerationStatus(action.data.status) : e.status,
            }
          : e
      );
    case "DISMISS_ENTRY":
      return state.filter((e) => e.logId !== action.logId);
    default:
      return state;
  }
}

const OverlayContext = createContext<{
  entries: OverlayEntry[];
  addEntry: (logId: string, communitySlug: string) => void;
  updateEntry: (logId: string, data: Partial<OverlayEntry>) => void;
  dismissEntry: (logId: string) => void;
} | null>(null);

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [entries, dispatch] = useReducer(reducer, []);

  const addEntry = useCallback((logId: string, communitySlug: string) => {
    dispatch({ type: "ADD_ENTRY", logId, communitySlug });
  }, []);

  const updateEntry = useCallback(
    (logId: string, data: Partial<OverlayEntry>) => {
      dispatch({ type: "UPDATE_ENTRY", logId, data });
    },
    []
  );

  const dismissEntry = useCallback((logId: string) => {
    dispatch({ type: "DISMISS_ENTRY", logId });
  }, []);

  return (
    <OverlayContext.Provider
      value={{ entries, addEntry, updateEntry, dismissEntry }}
    >
      {children}
    </OverlayContext.Provider>
  );
}

export function useOverlay() {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error("useOverlay must be used within OverlayProvider");
  return ctx;
}
