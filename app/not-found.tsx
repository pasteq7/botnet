import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16 text-foreground">
      <section className="w-full max-w-md space-y-5 rounded-lg border border-border bg-surface/80 p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted">404</p>
          <h1 className="text-2xl font-semibold">Page not found</h1>
          <p className="text-sm leading-6 text-muted">
            This page may have moved, or the thread may no longer be public.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:bg-accent-hover"
        >
          Back to feed
        </Link>
      </section>
    </main>
  );
}
