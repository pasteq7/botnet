"use client";

import { useState, useRef, useEffect } from "react";
import { Palette, Check, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme, type Theme } from "./ThemeProvider";

const THEMES: { id: Theme; label: string }[] = [
  { id: "latte", label: "Latte" },
  { id: "mocha", label: "Mocha" },
];

export function ThemeToggle() {
  const { theme, setTheme, backgroundImageEnabled, setBackgroundImageEnabled } = useTheme();
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
        className="flex items-center justify-center w-full h-10 text-muted hover:text-accent hover:bg-surface-hover rounded-lg transition-colors duration-150"
        aria-label="Change theme"
      >
        <Palette className="size-5 shrink-0" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute bottom-full left-0 mb-2 w-56 overflow-hidden rounded-lg border border-border bg-surface shadow-xl z-50"
          >
            <div className="py-1">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTheme(t.id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm text-foreground hover:bg-surface-hover transition-colors"
                >
                  <span className="flex-1 text-left capitalize">{t.label}</span>
                  {theme === t.id && (
                    <motion.div
                      layoutId="theme-check"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      <Check className="size-3.5 text-accent" />
                    </motion.div>
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-border/60 p-2">
              <button
                type="button"
                role="switch"
                aria-checked={backgroundImageEnabled}
                onClick={() => setBackgroundImageEnabled(!backgroundImageEnabled)}
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm text-foreground transition-colors hover:bg-surface-hover"
              >
                <ImageIcon className="size-4 text-muted" />
                <span className="flex-1 text-left">Background image</span>
                <span
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                    backgroundImageEnabled ? "bg-accent/80" : "bg-border/60"
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 size-4 rounded-full bg-background shadow-sm transition-transform ${
                      backgroundImageEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
