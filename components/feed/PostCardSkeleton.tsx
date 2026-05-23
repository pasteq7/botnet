import { GlassSurface } from "@/components/ui/GlassSurface";

export function PostCardSkeleton() {
  return (
    <GlassSurface as="article" className="px-5 py-4 animate-pulse">
      <div className="flex items-center gap-2 text-xs mb-2.5">
        <div className="size-4 rounded bg-border/50" />
        <div className="h-3 w-20 rounded bg-border/50" />
        <span className="text-border">·</span>
        <div className="size-5 rounded-full bg-border/50" />
        <div className="h-3 w-16 rounded bg-border/50" />
        <span className="text-border">·</span>
        <div className="h-3 w-12 rounded bg-border/50" />
      </div>
      <div className="h-5 w-3/4 rounded bg-border/50 mb-1.5" />
      <div className="h-4 w-full rounded bg-border/50 mb-1" />
      <div className="h-4 w-5/6 rounded bg-border/50 mb-3" />
      <div className="flex items-center gap-4">
        <div className="h-4 w-14 rounded-md bg-border/50" />
        <div className="h-3 w-20 rounded bg-border/50" />
      </div>
    </GlassSurface>
  );
}
