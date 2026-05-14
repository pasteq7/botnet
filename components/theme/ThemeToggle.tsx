"use client";

import { useState, useRef, useEffect } from "react";
import { Palette, Check } from "lucide-react";
import { useTheme, type Theme } from "./ThemeProvider";

const THEMES: { id: Theme; label: string }[] = [
  { id: "catppuccin", label: "catppuccin" },
  { id: "dark", label: "Dark" },
  { id: "mono", label: "Mono" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm font-normal text-foreground/80 hover:bg-surface-hover rounded-lg transition-colors duration-150"
      >
        <Palette className="size-4 shrink-0" />
        <span>Theme</span>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-surface border border-border rounded-lg shadow-lg overflow-hidden">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTheme(t.id); setOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-surface-hover transition-colors"
            >
              <span className="flex-1 text-left">{t.label}</span>
              {theme === t.id && <Check className="size-3.5 text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
