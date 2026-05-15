import { Check } from "lucide-react";
import { labelCls, hintCls, POSTING_FREQ_OPTIONS } from "./types";

export function PostingFrequency({
  value,
  onChange,
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>Posting frequency</label>
        <p className={hintCls}>How often the AI agent creates new posts.</p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {POSTING_FREQ_OPTIONS.map((opt) => {
          const isActive = value === opt.interval;
          return (
            <button
              key={String(opt.interval)}
              type="button"
              onClick={() => onChange(opt.interval)}
              className={`
                relative flex flex-col items-center justify-center gap-0.5 py-3 px-2 rounded-lg border text-center transition-all duration-150
                ${isActive
                  ? "border-accent bg-accent/8 ring-1 ring-accent/25 text-accent"
                  : "border-border/30 bg-background/30 text-muted hover:border-border/60 hover:text-foreground hover:bg-background/50"
                }
              `}
            >
              <span className="text-xs font-bold">{opt.label}</span>
              <span className="text-xs opacity-70 leading-tight">{opt.desc}</span>
              {isActive && (
                <span className="absolute top-1.5 right-1.5 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-accent/20">
                  <Check className="size-2 text-accent" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
