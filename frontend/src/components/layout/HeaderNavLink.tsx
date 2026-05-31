"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  alertasAbertosBadgeAriaLabel,
  formatAlertasNavBadgeCount,
} from "@/hooks/useAlertasAbertosCount";
import type { LucideIcon } from "lucide-react";

type HeaderNavLinkProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  variant: "desktop" | "drawer";
  badgeCount?: number;
  onNavigate?: () => void;
};

export function HeaderNavLink({
  href,
  label,
  icon: Icon,
  active,
  variant,
  badgeCount,
  onNavigate,
}: HeaderNavLinkProps) {
  const isDrawer = variant === "drawer";
  const showBadge = badgeCount != null && badgeCount > 0;

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
      <span className="relative shrink-0">
        <Icon
          className={cn(
            isDrawer ? "h-5 w-5" : "h-4 w-4",
            !active && isDrawer && "text-muted-foreground"
          )}
          aria-hidden
        />
        {showBadge ? (
          <Badge
            variant="destructive"
            className="absolute -top-1.5 -right-2 h-4 min-w-4 px-1 text-[10px] tabular-nums pointer-events-none"
            aria-label={alertasAbertosBadgeAriaLabel(badgeCount)}
          >
            {formatAlertasNavBadgeCount(badgeCount)}
          </Badge>
        ) : null}
      </span>
      {label}
    </Link>
  );
}
