"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export type Theme = "catppuccin" | "dark" | "mono";
export type AccentColor = "red" | "dusk" | "sage" | "ochre" | "sand";

const THEMES: Theme[] = ["catppuccin", "dark", "mono"];
const ACCENT_COLORS: AccentColor[] = ["red", "dusk", "sage", "ochre", "sand"];

type ThemeContextType = {
  theme: Theme;
  accentColor: AccentColor;
  setTheme: (theme: Theme) => void;
  setAccentColor: (accent: AccentColor) => void;
  cycleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme") as Theme | null;
      if (stored && THEMES.includes(stored)) return stored;
    }
    return "catppuccin";
  });
  const [accentColor, setAccentColorState] = useState<AccentColor>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("accentColor") as AccentColor | null;
      if (stored && ACCENT_COLORS.includes(stored)) return stored;
    }
    return "red";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-accent", accentColor);
  }, [accentColor]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  }, []);

  const setAccentColor = useCallback((newAccent: AccentColor) => {
    setAccentColorState(newAccent);
    localStorage.setItem("accentColor", newAccent);
    document.documentElement.setAttribute("data-accent", newAccent);
  }, []);

  const cycleTheme = useCallback(() => {
    const idx = THEMES.indexOf(theme);
    const next = THEMES[(idx + 1) % THEMES.length];
    setTheme(next);
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, accentColor, setTheme, setAccentColor, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
