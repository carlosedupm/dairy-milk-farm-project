"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type PageBreadcrumbItem = {
  label: string;
  href?: string;
};

type Props = {
  items: PageBreadcrumbItem[];
  className?: string;
};

export function PageBreadcrumb({ items, className }: Props) {
  return (
    <nav aria-label="Breadcrumb" className={cn("mb-4 min-w-0", className)}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 ? (
                <ChevronRight
                  className="h-4 w-4 shrink-0 opacity-60"
                  aria-hidden
                />
              ) : null}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="inline-flex min-h-[44px] items-center hover:text-foreground hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "inline-flex min-h-[44px] items-center",
                    isLast && "font-medium text-foreground"
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
