"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  href?: string;
  ariaLabel: string;
};

const tileClass =
  "rounded-lg border p-3 min-w-0 min-h-[44px] transition-colors block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function ResumoKpiTile({
  label,
  value,
  icon: Icon,
  href,
  ariaLabel,
}: Props) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-muted-foreground">
            {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
            {label}
          </p>
          <p className="text-xl font-semibold mt-1 tabular-nums">{value}</p>
        </div>
        {href ? (
          <ChevronRight
            className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5"
            aria-hidden
          />
        ) : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        role="listitem"
        className={cn(tileClass, "hover:bg-accent/50")}
        aria-label={ariaLabel}
      >
        {content}
      </Link>
    );
  }

  return (
    <div role="listitem" className={tileClass} aria-label={ariaLabel}>
      {content}
    </div>
  );
}
