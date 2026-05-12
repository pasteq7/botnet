"use client";

import { useState, useMemo, useRef, useEffect, useCallback, UIEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { CommunityIcon } from "./CommunityIcon";
import icons from "@/lib/lucide-icons.json";

interface IconPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (name: string) => void;
  current?: string;
}

const ICON_LIST = icons as string[];
const COLS = 9;
const CELL_SIZE = 72;
const GRID_HEIGHT = 420;
const OVERSCAN_ROWS = 2;

function useDebounce<T>(value: T, delay = 150): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function IconPicker({ isOpen, onClose, onSelect, current }: IconPickerProps) {
  const [query, setQuery] = useState("");
  const [scrollTop, setScrollTop] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 150);

  // Focus input when modal opens; query/scrollTop reset naturally on remount
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!debouncedQuery) return ICON_LIST;
    const lower = debouncedQuery.toLowerCase();
    return ICON_LIST.filter((n) => n.toLowerCase().includes(lower));
  }, [debouncedQuery]);

  const rowCount = Math.ceil(filtered.length / COLS);
  const totalHeight = rowCount * CELL_SIZE;

  // Which rows are visible + overscan
  const firstVisibleRow = Math.max(0, Math.floor(scrollTop / CELL_SIZE) - OVERSCAN_ROWS);
  const lastVisibleRow = Math.min(
    rowCount - 1,
    Math.ceil((scrollTop + GRID_HEIGHT) / CELL_SIZE) + OVERSCAN_ROWS
  );

  const visibleIcons = useMemo(() => {
    const items: { name: string; index: number; row: number; col: number }[] = [];
    for (let row = firstVisibleRow; row <= lastVisibleRow; row++) {
      for (let col = 0; col < COLS; col++) {
        const index = row * COLS + col;
        if (index >= filtered.length) break;
        items.push({ name: filtered[index], index, row, col });
      }
    }
    return items;
  }, [filtered, firstVisibleRow, lastVisibleRow]);

  const handleScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Reset scroll when results change
  useEffect(() => {
    if (gridRef.current) gridRef.current.scrollTop = 0;
  }, [filtered]);

  const gridWidth = COLS * CELL_SIZE;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative bg-surface rounded-2xl shadow-2xl border border-border/60 overflow-hidden flex flex-col"
            style={{ width: gridWidth + 40 }}
          >
            {/* Search bar */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40 shrink-0">
              <Search className="size-4 text-muted shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search icons…"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted/50 focus:outline-none"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-muted/50 hover:text-foreground text-xs">
                  Clear
                </button>
              )}
              <button onClick={onClose} className="text-muted/50 hover:text-foreground p-1">
                <X className="size-4" />
              </button>
            </div>

            {/* Count hint */}
            <div className="px-5 py-1.5 text-[11px] text-muted/50 shrink-0 border-b border-border/20">
              {filtered.length} icon{filtered.length !== 1 ? "s" : ""}
              {debouncedQuery ? ` matching "${debouncedQuery}"` : ""}
            </div>

            {/* Virtual grid */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted/60">
                <Search className="size-8 mb-3" />
                <p className="text-sm">No icons found for &ldquo;{query}&rdquo;</p>
              </div>
            ) : (
              <div
                ref={gridRef}
                onScroll={handleScroll}
                style={{ height: GRID_HEIGHT, width: gridWidth + 20, overflowY: "scroll" }}
              >
                {/* Spacer that gives the scrollbar its full range */}
                <div style={{ height: totalHeight, position: "relative" }}>
                  {visibleIcons.map(({ name, row, col }) => (
                    <div
                      key={name}
                      style={{
                        position: "absolute",
                        top: row * CELL_SIZE,
                        left: col * CELL_SIZE,
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        padding: 4,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => { onSelect(name); onClose(); }}
                        title={name}
                        className={`w-full h-full flex flex-col items-center justify-center gap-1.5 rounded-xl border transition-all ${name === current
                            ? "border-accent bg-accent/10 ring-1 ring-accent/30"
                            : "border-transparent hover:border-border/60 hover:bg-surface-hover"
                          }`}
                      >
                        <CommunityIcon name={name} size="md" />
                        <span className="text-[9px] text-muted truncate w-full text-center px-1 leading-tight">
                          {name}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}