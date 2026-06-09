"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  variant?: "default" | "prominent";
  className?: string;
};

export function AnimalBaixadoBadge({
  variant = "default",
  className,
}: Props) {
  return (
    <Badge
      variant={variant === "prominent" ? "outline" : "secondary"}
      className={cn(
        "shrink-0",
        variant === "default" && "text-xs",
        variant === "prominent" &&
          "border-feedback-warning/50 bg-feedback-warning/10 text-feedback-warning-foreground font-medium",
        className,
      )}
    >
      Baixado
    </Badge>
  );
}
