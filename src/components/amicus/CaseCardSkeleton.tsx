import { Scale } from "lucide-react";

/** Shimmer placeholder shown while the backend fetches precedents. */
export function CaseCardSkeleton() {
  return (
    <article className="rounded border border-border bg-card p-4">
      <div className="mb-1 flex items-center gap-1.5">
        <Scale className="h-4 w-4 text-gold/30" aria-hidden />
        <div className="h-2.5 w-16 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      <div className="mt-3 flex items-center gap-3">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-3 h-5 w-32 animate-pulse rounded-full bg-muted" />
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-11/12 animate-pulse rounded bg-muted" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
      </div>
    </article>
  );
}

export function CaseListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <CaseCardSkeleton key={i} />
      ))}
    </div>
  );
}
