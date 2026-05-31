"use client";

import { forwardRef, useEffect, useRef } from "react";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type FormValidationAlertProps = {
  message: string;
  conformidadeCode?: string;
  /** Título do alerta (erros de API usam o default). */
  title?: string;
  /** Título quando o erro é de validação client-side. */
  validationTitle?: string;
  /** Quando true, usa validationTitle em vez de title. */
  isValidation?: boolean;
  className?: string;
};

export const FormValidationAlert = forwardRef<
  HTMLDivElement,
  FormValidationAlertProps
>(function FormValidationAlert(
  {
    message,
    conformidadeCode,
    title = "Não foi possível guardar",
    validationTitle = "Verifique os campos",
    isValidation = false,
    className,
  },
  forwardedRef
) {
  const innerRef = useRef<HTMLDivElement>(null);
  const prevMessageRef = useRef("");

  const text = message.trim();
  const displayTitle = isValidation ? validationTitle : title;

  useEffect(() => {
    const hadError = Boolean(prevMessageRef.current.trim());
    const hasError = Boolean(text);
    prevMessageRef.current = text;
    if (!hadError && hasError) {
      const el =
        (forwardedRef &&
          typeof forwardedRef !== "function" &&
          forwardedRef.current) ||
        innerRef.current;
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [text, forwardedRef]);

  if (!text) return null;

  const setRef = (node: HTMLDivElement | null) => {
    innerRef.current = node;
    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  return (
    <div
      ref={setRef}
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
          {displayTitle}
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
});
