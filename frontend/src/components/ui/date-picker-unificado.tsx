"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  dateInputErrorMessage,
  digitsOnly,
  formatDigitsToDisplay,
  formatIsoToDisplay,
  parseDisplayToIso,
} from "@/lib/date-input";
import { Button } from "@/components/ui/button";
import { DatePickerOverlay } from "@/components/ui/date-picker-overlay";
import { DatePickerPanel } from "@/components/ui/date-picker-panel";
import { FormFieldError } from "@/components/ui/form-field-error";
import { Input } from "@/components/ui/input";

export type DatePickerUnificadoProps = {
  value?: string; // YYYY-MM-DD
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  /** @deprecated Comportamento unificado é sempre ativo; prop ignorada. */
  manualInput?: boolean;
  minYear?: number;
  maxYear?: number;
  minDate?: string;
  maxDate?: string;
  ariaLabel?: string;
};

/** Input com máscara DD/MM/AAAA + calendário em Dialog (todos os breakpoints). */
export function DatePickerUnificado({
  value,
  onChange,
  placeholder = "DD/MM/AAAA",
  disabled = false,
  className,
  id,
  minYear = 1950,
  maxYear = new Date().getFullYear() + 1,
  minDate,
  maxDate,
  ariaLabel,
}: DatePickerUnificadoProps) {
  const fallbackId = React.useId();
  const fieldId = id ?? fallbackId;
  const errorId = `${fieldId}-error`;

  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [inputError, setInputError] = React.useState("");

  const parseOpts = React.useMemo(
    () => ({ minYear, maxYear, minDate, maxDate }),
    [minYear, maxYear, minDate, maxDate]
  );

  React.useEffect(() => {
    setInputValue(formatIsoToDisplay(value));
    setInputError("");
  }, [value]);

  const handleChange = (isoValue: string) => {
    onChange?.(isoValue);
    if (isoValue) {
      setInputValue(formatIsoToDisplay(isoValue));
    } else {
      setInputValue("");
    }
    setInputError("");
  };

  const applyManualValue = () => {
    const parsed = parseDisplayToIso(inputValue, parseOpts);
    if (parsed.error) {
      setInputError(
        dateInputErrorMessage(parsed.error, { minDate, maxDate })
      );
      return;
    }

    setInputError("");
    onChange?.(parsed.iso);
  };

  const handleManualBlur = () => {
    applyManualValue();
  };

  const handleManualKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyManualValue();
    }
  };

  const summary = value
    ? formatIsoToDisplay(value)
    : "Nenhuma data selecionada";

  const panel = (
    <DatePickerPanel
      mode="date"
      value={value ?? ""}
      onChange={handleChange}
      minYear={minYear}
      maxYear={maxYear}
      minDate={minDate}
      maxDate={maxDate}
      onDone={() => setOpen(false)}
      closeOnSelect
    />
  );

  const calendarIconButton = (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      className="min-h-[44px] min-w-[44px] shrink-0"
      aria-label="Abrir calendário"
    >
      <CalendarIcon className="h-4 w-4" />
    </Button>
  );

  const inputAriaLabel = ariaLabel ?? placeholder ?? "Data";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        <Input
          id={fieldId}
          value={inputValue}
          disabled={disabled}
          placeholder={placeholder}
          inputMode="numeric"
          maxLength={10}
          className="min-h-[44px] flex-1"
          aria-label={inputAriaLabel}
          aria-invalid={inputError ? true : undefined}
          aria-describedby={inputError ? errorId : undefined}
          onChange={(e) => {
            const digits = digitsOnly(e.target.value);
            const masked = formatDigitsToDisplay(digits);
            setInputValue(masked);
            if (inputError) setInputError("");
            if (!digits) {
              onChange?.("");
              return;
            }
            if (digits.length === 8) {
              const parsed = parseDisplayToIso(masked, parseOpts);
              if (!parsed.error) {
                onChange?.(parsed.iso);
                setInputError("");
              }
            }
          }}
          onBlur={handleManualBlur}
          onKeyDown={handleManualKeyDown}
        />
        <DatePickerOverlay
          open={open}
          onOpenChange={setOpen}
          trigger={calendarIconButton}
          title="Selecionar data"
          summary={summary}
        >
          {panel}
        </DatePickerOverlay>
      </div>
      <FormFieldError id={errorId} message={inputError} />
    </div>
  );
}
