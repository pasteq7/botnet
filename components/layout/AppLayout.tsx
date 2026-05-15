"use client";

import type { ReactNode } from "react";
import { useLayout } from "./LayoutProvider";

interface Props {
  sidebar: ReactNode;
  children: ReactNode;
}

export function AppLayout({ sidebar, children }: Props) {
  const { layoutMode } = useLayout();

  if (layoutMode === "full") {
    return (
      <div className="flex min-h-screen">
        {sidebar}
        <main className="flex-1 min-w-0 px-10 py-10">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl gap-8 px-6 min-h-screen">
      {sidebar}
      <main className="min-w-0 flex-1 py-10">
        {children}
      </main>
    </div>
  );
}
