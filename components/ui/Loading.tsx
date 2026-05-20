"use client";

import { motion } from "framer-motion";

interface LoadingProps {
    className?: string;
    barColor?: string; // Keep prop name for compatibility, represents block color
    size?: number | "sm" | "md" | "lg";
}

export function Loading({ className = "", barColor = "bg-accent", size = 32 }: LoadingProps) {
    // Map string sizes to numeric pixel values
    let numericSize = 32;
    if (typeof size === "number") {
        numericSize = size;
    } else if (size === "sm") {
        numericSize = 16;
    } else if (size === "md") {
        numericSize = 32;
    } else if (size === "lg") {
        numericSize = 48;
    }

    // Dynamically calculate gap and border radius based on size to ensure it scales elegantly
    const gap = Math.max(1, Math.round(numericSize / 16));
    const borderRadius = Math.max(1, Math.round(numericSize / 16));

    // Create 3x3 grid cells
    const cells = Array.from({ length: 9 }).map((_, i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        return { id: i, row, col };
    });

    return (
        <div
            className={`grid grid-cols-3 grid-rows-3 select-none ${className}`}
            role="status"
            aria-label="Loading"
            style={{
                width: `${numericSize}px`,
                height: `${numericSize}px`,
                gap: `${gap}px`,
            }}
        >
            {cells.map((cell) => (
                <motion.div
                    key={cell.id}
                    className={`w-full h-full ${barColor}`}
                    style={{
                        borderRadius: `${borderRadius}px`,
                    }}
                    animate={{
                        opacity: [0.25, 1, 0.25],
                        scale: [0.8, 1, 0.8],
                    }}
                    transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: (cell.row + cell.col) * 0.12,
                    }}
                />
            ))}
            <span className="sr-only">Loading</span>
        </div>
    );
}

export default Loading;