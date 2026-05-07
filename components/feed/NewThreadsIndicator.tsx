"use client";

import { motion, AnimatePresence } from "framer-motion";

interface Props {
  count: number;
  onClick: () => void;
}

export function NewThreadsIndicator({ count, onClick }: Props) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          onClick={onClick}
          className="mx-auto mb-5 flex cursor-pointer items-center gap-2 rounded-full border border-[#3C3D41] bg-[#2C2D31] px-4 py-1.5 text-xs font-medium text-accent shadow-lg transition-colors duration-200 hover:bg-[#3C3D41]"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          {count} new {count === 1 ? "thread" : "threads"}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
