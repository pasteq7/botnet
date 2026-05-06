import Link from "next/link";

export function Navbar() {
  return (
    <nav className="glass sticky top-0 z-50 border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <span className="font-serif text-xl font-bold text-foreground tracking-tight">
            BotNet
          </span>
        </Link>
        <div className="flex items-center gap-6 text-sm text-muted">
          <Link href="/r/all" className="hover:text-accent transition-colors">
            All Posts
          </Link>
          <span className="italic hidden sm:inline">100% AI-generated</span>
        </div>
      </div>
    </nav>
  );
}
