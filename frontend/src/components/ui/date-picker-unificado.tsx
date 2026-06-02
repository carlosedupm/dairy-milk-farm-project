"use client";

import * as React from "react";
import { CalendarIcon, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  dateInputErrorMessage,
  digitsOnly,
  formatDigitsToDisplay,
  formatIsoToDisplay,
  isValidDisplayDate,
  parseDisplayToIso,
  tryCompleteDayWithCurrentMonthYear,
} from "@/lib/date-input";
import { todayISODate } from "@/lib/date-limits";
import { addDaysToISODate } from "@/lib/gestao-date-limits";
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
  /** Mensagem «✓ Data selecionada» abaixo do input (desligar em DateTimePicker). */
  showConfirmationMessage?: boolean;
};

function isIsoInRange(
  iso: string,
  minDate?: string,
  maxDate?: string
): boolean {
  if (minDate && iso < minDate) return false;
  if (maxDate && iso > maxDate) return false;
  return true;
}

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
  showConfirmationMessage = true,
}: DatePickerUnificadoProps) {
  const fallbackId = React.useId();
  const fieldId = id ?? fallbackId;
  const errorId = `${fieldId}-error`;
  const successId = `${fieldId}-success`;

  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [inputError, setInputError] = React.useState("");

  const parseOpts = React.useMemo(
    () => ({ minYear, maxYear, minDate, maxDate }),
    [minYear, maxYear, minDate, maxDate]
  );

  const isValid = React.useMemo(
    () => isValidDisplayDate(inputValue, parseOpts),
    [inputValue, parseOpts]
  );

  const today = React.useMemo(() => todayISODate(), []);
  const shortcutDates = React.useMemo(
    () => ({
      hoje: today,
      ontem: addDaysToISODate(today, -1),
      semanaPassada: addDaysToISODate(today, -7),
    }),
    [today]
  );

  React.useEffect(() => {
    setInputValue(formatIsoToDisplay(value));
    setInputError("");
  }, [value]);

  const handleChange = React.useCallback(
    (isoValue: string) => {
      onChange?.(isoValue);
      if (isoValue) {
        setInputValue(formatIsoToDisplay(isoValue));
      } else {
        setInputValue("");
      }
      setInputError("");
    },
    [onChange]
  );

  const applyManualValue = React.useCallback(() => {
    const parsed = parseDisplayToIso(inputValue, parseOpts);
    if (parsed.error) {
      setInputError(
        dateInputErrorMessage(parsed.error, { minDate, maxDate })
      );
      return;
    }

    setInputError("");
    onChange?.(parsed.iso);
  }, [inputValue, parseOpts, minDate, maxDate, onChange]);

  const handleManualBlur = () => {
    const completed = tryCompleteDayWithCurrentMonthYear(inputValue, parseOpts);
    if (completed) {
      setInputValue(completed.display);
      setInputError("");
      onChange?.(completed.iso);
      return;
    }
    applyManualValue();
  };

  const handleManualKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyManualValue();
    }
  };

  const pickShortcutIso = React.useCallback(
    (iso: string) => {
      if (disabled || !isIsoInRange(iso, minDate, maxDate)) return;
      handleChange(iso);
      setOpen(false);
    },
    [disabled, minDate, maxDate, handleChange]
  );

  const summary = value
    ? formatIsoToDisplay(value)
    : "Nenhuma data selecionada";

  const confirmationDisplay =
    (value ? formatIsoToDisplay(value) : "") || inputValue;

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
  const describedBy = inputError
    ? errorId
    : showConfirmationMessage && isValid && !inputError
      ? successId
      : undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Input
            id={fieldId}
            value={inputValue}
            disabled={disabled}
            placeholder={placeholder}
            inputMode="numeric"
            maxLength={10}
            className={cn(
              "min-h-[44px] w-full transition-colors duration-200",
              isValid && !disabled && "border-feedback-success pr-10"
            )}
            aria-label={inputAriaLabel}
            aria-invalid={inputError ? true : undefined}
            aria-describedby={describedBy}
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
          {isValid && !disabled ? (
            <Check
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-feedback-success"
              aria-hidden
            />
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            disabled={disabled || !isIsoInRange(shortcutDates.hoje, minDate, maxDate)}
            className="shrink-0 self-center text-sm text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
            onClick={() => pickShortcutIso(shortcutDates.hoje)}
          >
            Hoje
          </button>
          <DatePickerOverlay
            open={open}
            onOpenChange={setOpen}
            trigger={calendarIconButton}
            title="Selecionar data"
            summary={summary}
          >
            <>
              {panel}
              <div className="shrink-0 border-t border-border px-3 pb-3 pt-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center sm:gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={
                      disabled ||
                      !isIsoInRange(shortcutDates.hoje, minDate, maxDate)
                    }
                    className="min-h-[44px] w-full py-1 px-3 text-sm sm:min-h-0 sm:w-auto"
                    onClick={() => pickShortcutIso(shortcutDates.hoje)}
                  >
                    Hoje
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={
                      disabled ||
                      !isIsoInRange(shortcutDates.ontem, minDate, maxDate)
                    }
                    className="min-h-[44px] w-full py-1 px-3 text-sm sm:min-h-0 sm:w-auto"
                    onClick={() => pickShortcutIso(shortcutDates.ontem)}
                  >
                    Ontem
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={
                      disabled ||
                      !isIsoInRange(
                        shortcutDates.semanaPassada,
                        minDate,
                        maxDate
                      )
                    }
                    className="min-h-[44px] w-full py-1 px-3 text-sm sm:min-h-0 sm:w-auto"
                    onClick={() =>
                      pickShortcutIso(shortcutDates.semanaPassada)
                    }
                  >
                    Semana passada
                  </Button>
                </div>
              </div>
            </>
          </DatePickerOverlay>
        </div>
      </div>
      {showConfirmationMessage && isValid && !inputError ? (
        <p
          id={successId}
          aria-live="polite"
          className="text-sm text-feedback-success break-words"
        >
          ✓ Data selecionada: {confirmationDisplay}
        </p>
      ) : null}
      <FormFieldError id={errorId} message={inputError} />
    </div>
  );
}
