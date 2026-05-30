"use client";

import { cn } from "@/lib/utils";

const tileClass =
  "rounded-lg border p-3 min-w-0 min-h-[44px] animate-pulse";

export function DashboardKpiSkeleton() {
  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      aria-hidden
      role="presentation"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={cn(tileClass)}>
          <div className="h-3.5 w-20 rounded bg-muted mb-2" />
          <div className="h-7 w-14 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
