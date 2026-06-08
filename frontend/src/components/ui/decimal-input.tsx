"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import {
  canInsertDecimalChar,
  decimalCursorAfterSanitize,
  sanitizeDecimalInput,
} from "@/lib/decimal-input";
import { cn } from "@/lib/utils";

export type DecimalInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "inputMode" | "value" | "onChange"
> & {
  value: string;
  onValueChange: (value: string) => void;
  /** Limite de casas decimais após o separador (opcional). */
  maxFractionDigits?: number;
};

/**
 * Campo decimal para mobile: `type="text"` + `inputMode="decimal"` evita
 * cursor jumping do `type="number"`, com filtro de caracteres inválidos.
 */
export const DecimalInput = React.forwardRef<HTMLInputElement, DecimalInputProps>(
  (
    { value, onValueChange, maxFractionDigits, className, onBeforeInput, ...props },
    ref
  ) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null);
    const cursorRef = React.useRef<number | null>(null);

    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref]
    );

    React.useLayoutEffect(() => {
      if (cursorRef.current == null || !innerRef.current) return;
      innerRef.current.setSelectionRange(cursorRef.current, cursorRef.current);
      cursorRef.current = null;
    }, [value]);

    const handleBeforeInput = React.useCallback(
      (event: React.InputEvent<HTMLInputElement>) => {
        onBeforeInput?.(event);
        if (event.defaultPrevented) return;

        const nativeEvent = event.nativeEvent;
        if (!nativeEvent.data || nativeEvent.inputType?.startsWith("delete")) {
          return;
        }

        if (
          !canInsertDecimalChar(value, nativeEvent.data, maxFractionDigits)
        ) {
          event.preventDefault();
        }
      },
      [maxFractionDigits, onBeforeInput, value]
    );

    const handleChange = React.useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const input = event.target;
        const raw = input.value;
        const sanitized = sanitizeDecimalInput(raw, maxFractionDigits);
        const cursor = input.selectionStart ?? sanitized.length;

        if (sanitized !== raw) {
          cursorRef.current = decimalCursorAfterSanitize(
            raw,
            sanitized,
            cursor
          );
        } else {
          cursorRef.current = cursor;
        }

        onValueChange(sanitized);
      },
      [maxFractionDigits, onValueChange]
    );

    return (
      <Input
        ref={setRefs}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onBeforeInput={handleBeforeInput}
        onChange={handleChange}
        className={cn(className)}
        {...props}
      />
    );
  }
);

DecimalInput.displayName = "DecimalInput";
