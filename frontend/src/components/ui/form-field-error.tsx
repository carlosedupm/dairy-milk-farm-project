"use client";

import { cn } from "@/lib/utils";

export type FormFieldErrorProps = {
  message?: string;
  id?: string;
  className?: string;
};

export function FormFieldError({ message, id, className }: FormFieldErrorProps) {
  const text = message?.trim();
  if (!text) return null;

  return (
    <p
      id={id}
      role="alert"
      aria-live="polite"
      className={cn("text-sm text-destructive break-words", className)}
    >
      {text}
    </p>
  );
}
