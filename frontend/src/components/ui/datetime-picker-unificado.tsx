"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import {
  clampDatetimeToMax,
  clampDatetimeToMin,
  composeLocalDatetimeString,
  datetimeInputErrorMessage,
  defaultDatetimeParts,
  getAvailableHours,
  getAvailableMinutes,
  getEffectiveMaxDateTime,
  parseValueToDatetimeParts,
  validateDatetime,
} from "@/lib/datetime-input";
import { DatePickerUnificado } from "@/components/ui/date-picker-unificado";
import { FormFieldError } from "@/components/ui/form-field-error";
import { Label } from "@/components/ui/label";

const nativeSelectClassName = cn(
  "flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2",
  "text-base text-foreground shadow-sm",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
);

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export type DateTimePickerUnificadoProps = {
  value: string;
  onChange: (localDatetime: string) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  placeholder?: string;
  minYear?: number;
  maxYear?: number;
  minDate?: string;
  maxDate?: string;
  maxDateTime?: string;
  ariaLabel?: string;
};

/**
 * Data e hora em pt-BR: input com máscara DD/MM/AAAA + calendário + selects inline.
 * Valor: `YYYY-MM-DDTHH:mm` (local).
 */
export function DateTimePickerUnificado({
  value,
  onChange,
  disabled = false,
  id,
  className,
  placeholder = "DD/MM/AAAA",
  minYear = 1950,
  maxYear = new Date().getFullYear() + 2,
  minDate,
  maxDate,
  maxDateTime,
  ariaLabel,
}: DateTimePickerUnificadoProps) {
  const fallbackId = React.useId();
  const fieldId = id ?? fallbackId;
  const hourId = `${fieldId}-hour`;
  const minuteId = `${fieldId}-minute`;
  const datetimeErrorId = `${fieldId}-datetime-error`;

  const cap = React.useMemo(
    () => getEffectiveMaxDateTime({ maxDateTime, maxDate }),
    [maxDateTime, maxDate]
  );

  const parts = React.useMemo(() => parseValueToDatetimeParts(value), [value]);
  const datePart = parts
    ? `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`
    : "";

  const [datetimeError, setDatetimeError] = React.useState("");

  React.useEffect(() => {
    if (!value.trim()) return;
    let next = clampDatetimeToMin(value, minDate);
    next = clampDatetimeToMax(next, cap);
    if (next !== value) {
      onChange(next);
    }
  }, [value, cap, minDate, onChange]);

  const emitChange = React.useCallback(
    (next: string) => {
      if (!next.trim()) {
        onChange("");
        setDatetimeError("");
        return;
      }

      let clamped = clampDatetimeToMin(next, minDate);
      clamped = clampDatetimeToMax(clamped, cap);
      const validation = validateDatetime(clamped, {
        minDate,
        maxDate,
        maxDateTime: cap,
      });

      if (!validation.valid && validation.error) {
        setDatetimeError(
          datetimeInputErrorMessage(validation.error, { maxDateTime: cap })
        );
      } else {
        setDatetimeError("");
      }

      onChange(clamped);
    },
    [cap, maxDate, minDate, onChange]
  );

  const handleDateChange = React.useCallback(
    (isoDate: string) => {
      if (!isoDate) {
        onChange("");
        setDatetimeError("");
        return;
      }

      const [year, month, day] = isoDate.split("-").map(Number);
      const current = parts ?? defaultDatetimeParts();
      emitChange(
        composeLocalDatetimeString({
          year,
          month,
          day,
          hour: current.hour,
          minute: current.minute,
        })
      );
    },
    [emitChange, onChange, parts]
  );

  const handleHourChange = React.useCallback(
    (hour: number) => {
      if (!parts) return;
      const minutes = getAvailableMinutes(parts, hour, cap);
      const minute = minutes.includes(parts.minute)
        ? parts.minute
        : (minutes[minutes.length - 1] ?? 0);
      emitChange(
        composeLocalDatetimeString({
          ...parts,
          hour,
          minute,
        })
      );
    },
    [cap, emitChange, parts]
  );

  const handleMinuteChange = React.useCallback(
    (minute: number) => {
      if (!parts) return;
      emitChange(composeLocalDatetimeString({ ...parts, minute }));
    },
    [emitChange, parts]
  );

  const availableHours = parts ? getAvailableHours(parts, cap) : [];
  const availableMinutes = parts
    ? getAvailableMinutes(parts, parts.hour, cap)
    : [];

  const dateAriaLabel = ariaLabel ?? "Data";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(13rem,1fr)_5.5rem_5.5rem] sm:items-end">
        <div className="min-w-0">
          <DatePickerUnificado
            id={fieldId}
            className="w-full"
            value={datePart || undefined}
            onChange={handleDateChange}
            placeholder={placeholder}
            disabled={disabled}
            minYear={minYear}
            maxYear={maxYear}
            minDate={minDate}
            maxDate={maxDate}
            ariaLabel={dateAriaLabel}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:contents">
          <div className="space-y-1">
            <Label htmlFor={hourId} className="text-muted-foreground">
              Hora
            </Label>
            <select
              id={hourId}
              className={cn(nativeSelectClassName, "w-full sm:w-[5.5rem]")}
              value={parts?.hour ?? ""}
              disabled={disabled || !datePart}
              onChange={(e) => handleHourChange(Number(e.target.value))}
              aria-label="Hora"
              aria-invalid={datetimeError ? true : undefined}
              aria-describedby={datetimeError ? datetimeErrorId : undefined}
            >
              {!datePart ? (
                <option value="">--</option>
              ) : (
                availableHours.map((h) => (
                  <option key={h} value={h}>
                    {pad2(h)}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={minuteId} className="text-muted-foreground">
              Minutos
            </Label>
            <select
              id={minuteId}
              className={cn(nativeSelectClassName, "w-full sm:w-[5.5rem]")}
              value={parts?.minute ?? ""}
              disabled={disabled || !datePart}
              onChange={(e) => handleMinuteChange(Number(e.target.value))}
              aria-label="Minutos"
              aria-invalid={datetimeError ? true : undefined}
              aria-describedby={datetimeError ? datetimeErrorId : undefined}
            >
              {!datePart ? (
                <option value="">--</option>
              ) : (
                availableMinutes.map((m) => (
                  <option key={m} value={m}>
                    {pad2(m)}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>
      <FormFieldError id={datetimeErrorId} message={datetimeError} />
    </div>
  );
}
