"use client";

/**
 * Skeleton rows for the next infinite-scroll page (mobile list cards).
 */
export function MobileInfiniteListSkeleton() {
  return (
    <ul className="space-y-3 min-w-0 md:hidden" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          className="min-h-[88px] rounded-lg border border-border p-4 animate-pulse"
        >
          <div className="h-5 w-2/3 max-w-xs rounded bg-muted mb-2" />
          <div className="h-4 w-1/2 max-w-[200px] rounded bg-muted" />
        </li>
      ))}
    </ul>
  );
}
