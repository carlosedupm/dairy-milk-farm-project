"use client";

import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Inbox,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EmptyStateVariant = "default" | "error" | "success";

export type EmptyStateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
};

export type EmptyStateProps = {
  variant?: EmptyStateVariant;
  icon?: LucideIcon;
  title: string;
  description?: string;
  filterTerm?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
};

const VARIANT_DEFAULTS: Record<
  EmptyStateVariant,
  { icon: LucideIcon; iconWrap: string; iconColor: string; role: "status" | "alert" }
> = {
  default: {
    icon: Inbox,
    iconWrap: "bg-muted",
    iconColor: "text-muted-foreground",
    role: "status",
  },
  error: {
    icon: AlertCircle,
    iconWrap: "bg-destructive/10",
    iconColor: "text-destructive",
    role: "alert",
  },
  success: {
    icon: CheckCircle2,
    iconWrap: "bg-feedback-success/10",
    iconColor: "text-feedback-success",
    role: "status",
  },
};

function EmptyStateActionButton({
  action,
  variant = "default",
}: {
  action: EmptyStateAction;
  variant?: "default" | "outline";
}) {
  const Icon = action.icon;
  const content = (
    <>
      {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
      {action.label}
    </>
  );

  if (action.href) {
    return (
      <Button
        asChild
        variant={variant === "outline" ? "outline" : "default"}
        className="w-full min-h-[44px] sm:w-auto"
      >
        <Link href={action.href}>{content}</Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={variant === "outline" ? "outline" : "default"}
      className="w-full min-h-[44px] sm:w-auto"
      onClick={action.onClick}
    >
      {content}
    </Button>
  );
}

export function EmptyState({
  variant = "default",
  icon,
  title,
  description,
  filterTerm,
  primaryAction,
  secondaryAction,
  className,
}: EmptyStateProps) {
  const defaults = VARIANT_DEFAULTS[variant];
  const Icon = icon ?? defaults.icon;

  const resolvedTitle = filterTerm
    ? `Nenhum resultado para "${filterTerm}"`
    : title;

  const resolvedDescription =
    description ??
    (filterTerm ? "Tente ajustar os filtros." : undefined);

  const hasActions = primaryAction || secondaryAction;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in duration-300",
        className,
      )}
      role={defaults.role}
    >
      <div
        className={cn(
          "mb-4 flex h-20 w-20 items-center justify-center rounded-full",
          defaults.iconWrap,
        )}
      >
        <Icon className={cn("h-12 w-12", defaults.iconColor)} aria-hidden />
      </div>
      <h3 className="text-lg font-semibold">{resolvedTitle}</h3>
      {resolvedDescription ? (
        <p className="mt-2 max-w-md text-muted-foreground">{resolvedDescription}</p>
      ) : null}
      {hasActions ? (
        <div className="mt-6 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
          {primaryAction ? (
            <EmptyStateActionButton action={primaryAction} />
          ) : null}
          {secondaryAction ? (
            <EmptyStateActionButton
              action={secondaryAction}
              variant="outline"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
