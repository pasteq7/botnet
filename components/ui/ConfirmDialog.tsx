"use client";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="relative w-full max-w-sm bg-background rounded-xl border border-border/60 shadow-2xl p-5"
          >
            <div className="flex gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 shrink-0">
                <AlertTriangle className="size-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted mt-1 leading-relaxed">{message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={onCancel}
                className="px-3 py-1.5 text-sm font-medium text-muted hover:text-foreground bg-surface hover:bg-surface-hover border border-border/60 rounded-lg transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className="px-3 py-1.5 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors shadow-sm"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
