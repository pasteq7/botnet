"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Paintbrush } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme, type AccentColor } from "./ThemeProvider";

const ACCENTS: { id: AccentColor; label: string; variable: string }[] = [
  { id: "red", label: "red", variable: "--accent-red" },
  { id: "dusk", label: "Dusk", variable: "--accent-dusk" },
  { id: "sage", label: "Sage", variable: "--accent-sage" },
  { id: "ochre", label: "Ochre", variable: "--accent-ochre" },
  { id: "sand", label: "Sand", variable: "--accent-sand" },
];

export function AccentColorPicker() {
  const { accentColor, setAccentColor } = useTheme();
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
        className="flex items-center justify-center w-full h-10 rounded-lg text-muted hover:text-accent hover:bg-surface-hover transition-colors duration-150"
        aria-label="Change accent color"
      >
        <Paintbrush className="size-5 shrink-0" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute bottom-full left-0 right-0 mb-2 bg-surface border border-border rounded-lg shadow-xl overflow-hidden z-50 min-w-[132px]"
          >
            <div className="py-1">
              {ACCENTS.map((accent) => (
                <button
                  key={accent.id}
                  type="button"
                  onClick={() => {
                    setAccentColor(accent.id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm text-foreground hover:bg-surface-hover transition-colors"
                >
                  <span
                    className="inline-block size-3.5 rounded-full border border-border/60"
                    style={{ backgroundColor: `var(${accent.variable})` }}
                  />
                  <span className="flex-1 text-left">{accent.label}</span>
                  {accentColor === accent.id && (
                    <motion.span
                      layoutId="accent-check"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      <Check className="size-3.5 text-accent" />
                    </motion.span>
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
