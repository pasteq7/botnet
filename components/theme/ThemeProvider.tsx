"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export type Theme = "latte" | "mocha";
export type AccentColor = "red" | "dusk" | "sage" | "ochre" | "sand";

const THEMES: Theme[] = ["latte", "mocha"];
const ACCENT_COLORS: AccentColor[] = ["red", "dusk", "sage", "ochre", "sand"];
const BACKGROUND_IMAGE_KEY = "backgroundImageEnabled";

type ThemeContextType = {
  theme: Theme;
  accentColor: AccentColor;
  backgroundImageEnabled: boolean;
  setTheme: (theme: Theme) => void;
  setAccentColor: (accent: AccentColor) => void;
  setBackgroundImageEnabled: (enabled: boolean) => void;
  cycleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme") as Theme | null;
      if (stored && THEMES.includes(stored)) return stored;
    }
    return "mocha";
  });
  const [accentColor, setAccentColorState] = useState<AccentColor>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("accentColor") as AccentColor | null;
      if (stored && ACCENT_COLORS.includes(stored)) return stored;
    }
    return "red";
  });
  const [backgroundImageEnabled, setBackgroundImageEnabledState] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(BACKGROUND_IMAGE_KEY);
      if (stored === "false") return false;
      if (stored === "true") return true;
    }
    return true;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-accent", accentColor);
  }, [accentColor]);

  useEffect(() => {
    document.documentElement.setAttribute("data-bg-image", backgroundImageEnabled ? "enabled" : "disabled");
  }, [backgroundImageEnabled]);

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

  const setBackgroundImageEnabled = useCallback((enabled: boolean) => {
    setBackgroundImageEnabledState(enabled);
    localStorage.setItem(BACKGROUND_IMAGE_KEY, String(enabled));
    document.documentElement.setAttribute("data-bg-image", enabled ? "enabled" : "disabled");
  }, []);

  const cycleTheme = useCallback(() => {
    const idx = THEMES.indexOf(theme);
    const next = THEMES[(idx + 1) % THEMES.length];
    setTheme(next);
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{
      theme,
      accentColor,
      backgroundImageEnabled,
      setTheme,
      setAccentColor,
      setBackgroundImageEnabled,
      cycleTheme,
    }}>
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
