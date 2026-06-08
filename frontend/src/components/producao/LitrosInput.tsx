"use client";

import * as React from "react";

import { DecimalInput } from "@/components/ui/decimal-input";
import {
  LITROS_INPUT_MAX_FRACTION_DIGITS,
  formatLitrosInputOnBlur,
  litrosNumberToInputValue,
  sanitizeLitrosInput,
} from "@/lib/litros-format";
import { cn } from "@/lib/utils";

export type LitrosInputProps = Omit<
  React.ComponentProps<typeof DecimalInput>,
  "value" | "onValueChange" | "maxFractionDigits"
> & {
  value: string;
  onValueChange: (value: string) => void;
};

/**
 * Input de litros de leite: pt-BR (vírgula), máx. 2 decimais, sem texto livre,
 * cursor estável no mobile. Usar em formulários de produção.
 */
export const LitrosInput = React.forwardRef<HTMLInputElement, LitrosInputProps>(
  (
    {
      value,
      onValueChange,
      placeholder = "Ex.: 25,5",
      onBlur,
      className,
      ...props
    },
    ref
  ) => {
    const canonicalValue = React.useMemo(
      () => sanitizeLitrosInput(value).replace(",", "."),
      [value]
    );

    const handleValueChange = React.useCallback(
      (nextCanonical: string) => {
        onValueChange(nextCanonical.replace(".", ","));
      },
      [onValueChange]
    );

    const handleBlur = React.useCallback(
      (event: React.FocusEvent<HTMLInputElement>) => {
        onValueChange(formatLitrosInputOnBlur(value));
        onBlur?.(event);
      },
      [onBlur, onValueChange, value]
    );

    return (
      <DecimalInput
        ref={ref}
        value={canonicalValue}
        onValueChange={handleValueChange}
        maxFractionDigits={LITROS_INPUT_MAX_FRACTION_DIGITS}
        placeholder={placeholder}
        onBlur={handleBlur}
        className={cn(className)}
        {...props}
      />
    );
  }
);

LitrosInput.displayName = "LitrosInput";

export { litrosNumberToInputValue };
