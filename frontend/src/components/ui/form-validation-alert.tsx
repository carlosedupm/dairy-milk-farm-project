"use client";

import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type FormValidationAlertProps = {
  message: string;
  conformidadeCode?: string;
  title?: string;
  className?: string;
};

export function FormValidationAlert({
  message,
  conformidadeCode,
  title = "Não foi possível guardar",
  className,
}: FormValidationAlertProps) {
  const text = message.trim();
  if (!text) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 space-y-2",
        className
      )}
    >
      <div className="flex flex-wrap items-start gap-2">
        <AlertCircle
          className="h-5 w-5 shrink-0 text-destructive mt-0.5"
          aria-hidden
        />
        <p className="text-base font-medium text-foreground flex-1 min-w-0 break-words">
          {title}
        </p>
        {conformidadeCode ? (
          <Badge variant="destructive" className="shrink-0">
            {conformidadeCode}
          </Badge>
        ) : null}
      </div>
      <p className="text-sm sm:text-base text-foreground break-words pl-7 sm:pl-7">
        {text}
      </p>
    </div>
  );
}
