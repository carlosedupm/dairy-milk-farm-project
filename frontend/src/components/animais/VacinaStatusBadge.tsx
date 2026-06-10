"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusVacinaLabel } from "@/services/animalVacinas";

function badgeClassName(status: string): string | undefined {
  switch (status) {
    case "APLICADA":
      return "border-feedback-success/40 bg-feedback-success/10 text-feedback-success";
    case "PREVISTA":
      return "border-feedback-info/40 bg-feedback-info/10 text-feedback-info";
    case "ATRASADA":
    case "REFORCO_VENCIDO":
      return undefined; // destructive variant
    default:
      return undefined;
  }
}

function badgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "ATRASADA" || status === "REFORCO_VENCIDO") {
    return "destructive";
  }
  return "outline";
}

export function VacinaStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={badgeVariant(status)}
      className={cn("shrink-0", badgeClassName(status))}
    >
      {statusVacinaLabel(status)}
    </Badge>
  );
}
