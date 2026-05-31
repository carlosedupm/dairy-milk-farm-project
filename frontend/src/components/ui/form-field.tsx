"use client";

import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";
import { Label } from "@/components/ui/label";
import { FormFieldError } from "@/components/ui/form-field-error";
import { cn } from "@/lib/utils";

export type FormFieldProps = {
  label: ReactNode;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  children: ReactElement<{ id?: string; className?: string }>;
  className?: string;
  hint?: ReactNode;
};

export function FormField({
  label,
  htmlFor,
  error,
  required,
  children,
  className,
  hint,
}: FormFieldProps) {
  const fallbackId = useId();
  const fieldId = htmlFor ?? children.props.id ?? fallbackId;
  const errorId = `${fieldId}-error`;
  const hasError = Boolean(error?.trim());

  const control = isValidElement(children)
    ? cloneElement(children, {
        id: fieldId,
        "aria-invalid": hasError || undefined,
        "aria-describedby": hasError ? errorId : undefined,
        className: cn(
          children.props.className,
          hasError && "border-destructive focus-visible:border-destructive"
        ),
      } as Record<string, unknown>)
    : children;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={fieldId}>
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </Label>
      {control}
      {hint && !hasError ? (
        <div className="text-xs text-muted-foreground">{hint}</div>
      ) : null}
      <FormFieldError id={errorId} message={error} />
    </div>
  );
}
