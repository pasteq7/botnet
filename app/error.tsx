"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16 text-foreground">
      <section className="w-full max-w-md space-y-5 rounded-lg border border-border bg-surface/80 p-6 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-sm leading-6 text-muted">
            The app hit an unexpected error while loading this view.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:bg-accent-hover"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
