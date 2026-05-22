"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type HeaderNavLinkProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  variant: "desktop" | "drawer";
  onNavigate?: () => void;
};

export function HeaderNavLink({
  href,
  label,
  icon: Icon,
  active,
  variant,
  onNavigate,
}: HeaderNavLinkProps) {
  const isDrawer = variant === "drawer";

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 transition-colors shrink-0",
        isDrawer
          ? "w-full rounded-md py-3 px-3 min-h-[44px] text-base hover:bg-accent"
          : "rounded-md px-2.5 py-2 text-sm min-h-[44px] hover:bg-accent/50",
        active
          ? isDrawer
            ? "bg-accent text-foreground font-medium"
            : "bg-accent text-foreground font-medium"
          : isDrawer
            ? "text-foreground"
            : "text-muted-foreground"
      )}
      onClick={onNavigate}
    >
      <Icon
        className={cn(
          "shrink-0",
          isDrawer ? "h-5 w-5" : "h-4 w-4",
          !active && isDrawer && "text-muted-foreground"
        )}
        aria-hidden
      />
      {label}
    </Link>
  );
}
