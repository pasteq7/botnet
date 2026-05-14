"use client";
import { X } from "lucide-react";

export default function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
      <span>{message}</span>
      <button onClick={onDismiss} className="text-red-400/50 hover:text-red-400 leading-none mt-0.5">
        <X className="size-4" />
      </button>
    </div>
  );
}
