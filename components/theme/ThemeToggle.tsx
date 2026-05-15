"use client";

import { useState, useRef, useEffect } from "react";
import { Palette, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
        className="flex items-center justify-center w-full h-10 text-foreground/80 hover:bg-surface-hover rounded-lg transition-colors duration-150"
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
            className="absolute bottom-full left-0 right-0 mb-2 bg-surface border border-border rounded-lg shadow-xl overflow-hidden z-50 min-w-[120px]"
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
