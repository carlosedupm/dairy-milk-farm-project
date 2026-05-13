"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getPerfilLabel } from "@/lib/perfilLabels";

export type IdentityUser = {
  id: number;
  email: string;
  perfil: string;
  nome: string;
};

export function userIdentityInitials(user: IdentityUser): string {
  const nome = user.nome?.trim();
  if (nome) {
    const parts = nome.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const a = parts[0][0];
      const b = parts[parts.length - 1][0];
      if (a && b) return (a + b).toUpperCase();
    }
    if (parts[0].length === 1) {
      const c = parts[0][0]?.toUpperCase() ?? "?";
      return `${c}${c}`;
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  const local = user.email.split("@")[0] || user.email;
  return local.slice(0, 2).toUpperCase() || "??";
}

export function userIdentityAriaLabel(
  user: IdentityUser,
  fazendaAtivaNome?: string | null
): string {
  const base = `${user.nome?.trim() || user.email}, perfil ${getPerfilLabel(user.perfil)}`;
  const f = fazendaAtivaNome?.trim();
  if (f) return `${base}, fazenda ativa ${f}`;
  return base;
}

type UserIdentitySummaryProps = {
  user: IdentityUser;
  variant: "compact" | "panel";
  fazendaAtivaNome?: string | null;
  className?: string;
  /** Quando falso, o contentor não define `aria-label` (ex.: grupo pai no Header desktop) */
  withAccessibleLabel?: boolean;
};

export function UserIdentitySummary({
  user,
  variant,
  fazendaAtivaNome,
  className,
  withAccessibleLabel = true,
}: UserIdentitySummaryProps) {
  const primary = user.nome?.trim() || user.email;
  const secondaryEmail =
    user.nome?.trim() && user.email ? user.email : null;
  const initials = userIdentityInitials(user);
  const label = userIdentityAriaLabel(user, fazendaAtivaNome);

  const isCompact = variant === "compact";

  return (
    <div
      className={cn(
        "flex min-w-0 gap-2",
        isCompact ? "items-center" : "items-start",
        className
      )}
      {...(withAccessibleLabel ? { "aria-label": label } : {})}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-muted font-semibold uppercase text-foreground",
          isCompact ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm"
        )}
        aria-hidden
      >
        {initials}
      </div>
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-0.5",
          isCompact ? "items-end text-right" : "items-start text-left"
        )}
      >
        <span
          className={cn(
            "truncate font-medium text-foreground",
            isCompact ? "text-sm max-w-[min(280px,30vw)] lg:max-w-[min(320px,34vw)]" : "text-base"
          )}
          title={primary}
        >
          {primary}
        </span>
        {secondaryEmail ? (
          <span
            className={cn(
              "break-all text-muted-foreground",
              isCompact ? "text-xs max-w-[min(280px,30vw)] lg:max-w-[min(320px,34vw)]" : "text-sm"
            )}
            title={secondaryEmail}
          >
            {secondaryEmail}
          </span>
        ) : null}
        <Badge
          variant="secondary"
          className={cn(
            "w-fit text-xs font-normal",
            isCompact ? "shrink-0" : "mt-0.5"
          )}
        >
          {getPerfilLabel(user.perfil)}
        </Badge>
      </div>
    </div>
  );
}
