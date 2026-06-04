"use client";

import { Badge } from "@/components/ui/badge";
import {
  STATUS_SAUDE_LABELS,
  type StatusSaude,
} from "@/services/animais";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<StatusSaude, string> = {
  SAUDAVEL:
    "border-feedback-success/40 bg-feedback-success/10 text-feedback-success",
  EM_TRATAMENTO:
    "border-feedback-warning/40 bg-feedback-warning/10 text-feedback-warning-foreground",
  DOENTE:
    "border-feedback-error/40 bg-feedback-error/10 text-destructive",
};

type Props = {
  status?: StatusSaude | string | null;
  className?: string;
};

export function AnimalStatusSaudeBadge({ status, className }: Props) {
  if (!status) {
    return null;
  }

  const key = status as StatusSaude;
  const label = STATUS_SAUDE_LABELS[key] ?? status;
  const colorClass = STATUS_CLASS[key] ?? "";

  return (
    <Badge
      variant="outline"
      className={cn("shrink-0 text-xs", colorClass, className)}
    >
      {label}
    </Badge>
  );
}
