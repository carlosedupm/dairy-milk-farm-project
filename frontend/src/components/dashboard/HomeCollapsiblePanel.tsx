"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  title: string;
  icon?: LucideIcon;
  badgeCount?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function HomeCollapsiblePanel({
  id,
  title,
  icon: Icon,
  badgeCount,
  defaultOpen = false,
  children,
  className,
}: Props) {
  return (
    <details
      id={id}
      open={defaultOpen}
      className={cn(
        "group rounded-xl border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      <summary
        className={cn(
          "flex min-h-[52px] cursor-pointer list-none items-center gap-2 px-4 py-3",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "[&::-webkit-details-marker]:hidden",
        )}
      >
        {Icon ? (
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        ) : null}
        <span className="min-w-0 flex-1 truncate text-base font-semibold">
          {title}
        </span>
        {badgeCount != null && badgeCount > 0 ? (
          <Badge variant="secondary" className="shrink-0 tabular-nums">
            {badgeCount}
          </Badge>
        ) : null}
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t px-4 py-3 min-w-0">{children}</div>
    </details>
  );
}
