"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  children?: React.ReactNode;
  /** Navegação principal (toque no corpo do card) */
  href?: string;
  onPrimaryClick?: () => void;
  /** Menu ⋮ ou outras ações — fora da área de navegação principal */
  actions?: React.ReactNode;
  className?: string;
};

export function MobileListCard({
  title,
  subtitle,
  meta,
  children,
  href,
  onPrimaryClick,
  actions,
  className,
}: Props) {
  const body = (
    <div className="min-w-0 flex-1">
      <div className="text-base font-medium leading-snug break-words">{title}</div>
      {subtitle ? (
        <div className="mt-0.5 text-sm text-muted-foreground break-words">
          {subtitle}
        </div>
      ) : null}
      {meta ? <div className="mt-2 text-sm break-words">{meta}</div> : null}
      {children}
    </div>
  );

  const primaryClass =
    "flex min-h-[44px] min-w-0 flex-1 items-start rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <article
      className={cn(
        "flex items-start gap-2 rounded-md border bg-card p-3 text-base shadow-sm",
        className
      )}
    >
      {href ? (
        <Link href={href} className={primaryClass}>
          {body}
        </Link>
      ) : onPrimaryClick ? (
        <button
          type="button"
          className={primaryClass}
          onClick={onPrimaryClick}
        >
          {body}
        </button>
      ) : (
        <div className="min-w-0 flex-1">{body}</div>
      )}
      {actions ? (
        <div className="flex shrink-0 items-start">{actions}</div>
      ) : null}
    </article>
  );
}
