"use client";

import { createContext, useContext, type ReactNode } from "react";

const SettingsContext = createContext<{
  openSettings: () => void;
} | null>(null);

export function SettingsProvider({
  children,
  openSettings,
}: {
  children: ReactNode;
  openSettings: () => void;
}) {
  return (
    <SettingsContext.Provider value={{ openSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
