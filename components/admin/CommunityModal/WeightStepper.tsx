// components/admin/CommunityModal/WeightStepper.tsx
"use client";

import { Globe } from "lucide-react";
import { Toggle } from "@/components/ui/Toggle";
import { useRef, useCallback, useEffect } from "react";

const STEP = 0.1;
const MIN = 0;
const MAX = 1;

const FILL_MAP: Record<string, string> = {
    "bg-blue-500": "#3b82f6",
    "bg-violet-500": "#8b5cf6",
    "bg-pink-500": "#ec4899",
    "bg-amber-500": "#f59e0b",
    "bg-emerald-500": "#10b981",
    "bg-orange-500": "#f97316",
    "bg-cyan-500": "#06b6d4",
    "bg-rose-500": "#f43f5e",
    "bg-lime-500": "#84cc16",
    "bg-fuchsia-500": "#d946ef",
};

// Human-readable level labels shown instead of raw numbers
function levelLabel(v: number): string {
    if (v === 0) return "Off";
    if (v <= 2) return "Low";
    if (v <= 5) return "Medium";
    if (v <= 8) return "High";
    return "Max";
}

interface WeightStepperProps {
    mode: string;
    color: string;
    description: string;
    value: number;
    requiresSearch?: boolean;
    onChange: (val: number) => void;
}

export function WeightStepper({
    mode,
    color,
    description,
    value,
    requiresSearch,
    onChange,
}: WeightStepperProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const lastValueRef = useRef(value > 0 ? value : 2);

    const enabled = value > 0;
    const fillHex = FILL_MAP[color] ?? "#888";
    const pct = (value / MAX) * 100;

    useEffect(() => {
        if (value > 0) lastValueRef.current = value;
    }, [value]);

    const clamp = (v: number) =>
        Math.max(MIN, Math.min(MAX, Math.round((v / STEP)) * STEP));

    const getValueFromClient = useCallback(
        (clientX: number) => {
            if (!trackRef.current) return value;
            const rect = trackRef.current.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            return clamp(ratio * MAX);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [value],
    );

    // Track click — only fires when NOT dragging
    const handleTrackPointerDown = (e: React.PointerEvent) => {
        if (!enabled) return;
        // If the thumb itself captured this, skip
        if ((e.target as HTMLElement).dataset.thumb) return;
        onChange(getValueFromClient(e.clientX));
    };

    // Thumb drag
    const handleThumbPointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        isDragging.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handleThumbPointerMove = (e: React.PointerEvent) => {
        if (!isDragging.current) return;
        onChange(getValueFromClient(e.clientX));
    };

    const handleThumbPointerUp = () => {
        isDragging.current = false;
    };

    const handleToggle = () => {
        onChange(enabled ? 0 : lastValueRef.current);
    };

    return (
        <div className={`py-3 ${!enabled ? "opacity-40" : ""} transition-opacity`}>
            {/* ── Top row ── */}
            <div className="flex items-center gap-2.5 mb-2.5">
                <Toggle checked={enabled} onChange={handleToggle} />

                <span
                    className={`size-2.5 rounded-full shrink-0 ${color} ${!enabled ? "grayscale" : ""}`}
                />

                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="text-xs font-semibold capitalize text-foreground/90">
                        {mode}
                    </span>
                    {requiresSearch && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-blue-500/10 text-xs text-blue-400 border border-blue-500/20">
                            <Globe className="size-2.5" />
                            Needs search
                        </span>
                    )}
                </div>

                {/* Level label + raw value on hover */}
                <span
                    className={`text-xs font-medium w-14 text-right ${enabled ? "text-foreground/80" : "text-muted/60"
                        }`}
                    title={enabled ? `${value.toFixed(1)} / ${MAX}` : undefined}
                >
                    {enabled ? levelLabel(value) : "Off"}
                    {enabled && (
                        <span className="text-xs font-mono text-muted/60 ml-1">
                            {value.toFixed(1)}
                        </span>
                    )}
                </span>
            </div>

            {/* ── Slider (only when enabled) ── */}
            {enabled && (
                <div>
                    <div
                        ref={trackRef}
                        className="relative h-2 rounded-full bg-border/20 cursor-pointer select-none"
                        onPointerDown={handleTrackPointerDown}
                        role="slider"
                        aria-label={`${mode} weight`}
                        aria-valuemin={MIN}
                        aria-valuemax={MAX}
                        aria-valuenow={value}
                    >
                        {/* Fill */}
                        <div
                            className="absolute inset-y-0 left-0 rounded-full pointer-events-none transition-[width] duration-75"
                            style={{ width: `${pct}%`, backgroundColor: fillHex }}
                        />

                        {/* Thumb */}
                        <div
                            data-thumb="true"
                            className="absolute top-1/2 -translate-y-1/2 size-4 rounded-full bg-white shadow-md border border-border/30 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform touch-none"
                            style={{ left: `${pct}%`, marginLeft: "-8px" }}
                            onPointerDown={handleThumbPointerDown}
                            onPointerMove={handleThumbPointerMove}
                            onPointerUp={handleThumbPointerUp}
                        />
                    </div>

                    <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-muted/60">Low</span>
                        <span className="text-[10px] text-muted/60">Max</span>
                    </div>
                </div>
            )}

            {/* ── Description ── */}
            <p className="text-xs text-muted/70 mt-1.5">{description}</p>
        </div>
    );
}