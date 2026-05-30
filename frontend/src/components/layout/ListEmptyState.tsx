"use client";

import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";
import {
  EmptyState,
  type EmptyStateAction,
  type EmptyStateVariant,
} from "@/components/ui/empty-state";

export type ListEmptyStateProps = {
  icon?: LucideIcon;
  emptyTitle: string;
  emptyDescription?: string;
  registerLabel?: string;
  registerHref?: string;
  registerOnClick?: () => void;
  canRegister?: boolean;
  hasActiveFilters?: boolean;
  filterTerm?: string;
  filteredTitle?: string;
  filteredDescription?: string;
  onClearFilters?: () => void;
  variant?: EmptyStateVariant;
  primaryAction?: EmptyStateAction;
};

export function ListEmptyState({
  icon,
  emptyTitle,
  emptyDescription,
  registerLabel,
  registerHref,
  registerOnClick,
  canRegister = true,
  hasActiveFilters = false,
  filterTerm,
  filteredTitle = "Nenhum resultado encontrado",
  filteredDescription,
  onClearFilters,
  variant = "default",
  primaryAction,
}: ListEmptyStateProps) {
  const showRegister =
    !hasActiveFilters &&
    canRegister &&
    (primaryAction || registerHref || registerOnClick);

  const resolvedPrimary: EmptyStateAction | undefined = showRegister
    ? primaryAction ??
      (registerLabel
        ? {
            label: registerLabel,
            href: registerHref,
            onClick: registerOnClick,
            icon: icon ?? Plus,
          }
        : undefined)
    : undefined;

  return (
    <EmptyState
      variant={variant}
      icon={icon}
      title={hasActiveFilters ? filteredTitle : emptyTitle}
      description={
        hasActiveFilters ? filteredDescription : emptyDescription
      }
      filterTerm={hasActiveFilters ? filterTerm : undefined}
      primaryAction={resolvedPrimary}
      secondaryAction={
        hasActiveFilters && onClearFilters
          ? { label: "Limpar filtros", onClick: onClearFilters }
          : undefined
      }
    />
  );
}
