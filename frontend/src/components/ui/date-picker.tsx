"use client";

import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DatePickerOverlay } from "@/components/ui/date-picker-overlay";
import { DatePickerPanel } from "@/components/ui/date-picker-panel";
import { Input } from "@/components/ui/input";

type DatePickerProps = {
  value?: string; // YYYY-MM-DD
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  /** Permite digitação manual no formato DD/MM/AAAA */
  manualInput?: boolean;
  minYear?: number;
  maxYear?: number;
  minDate?: string;
  maxDate?: string;
};

/** Seleção de data com calendário em Dialog (todos os breakpoints). */
export function DatePicker({
  value,
  onChange,
  placeholder = "Selecione a data",
  disabled = false,
  className,
  id,
  manualInput = false,
  minYear = 1950,
  maxYear = new Date().getFullYear() + 1,
  minDate,
  maxDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const date = value ? new Date(value + "T12:00:00") : undefined;
  const [inputValue, setInputValue] = React.useState("");
  const [inputError, setInputError] = React.useState("");

  const digitsOnly = React.useCallback((rawValue: string) => {
    return rawValue.replace(/\D/g, "").slice(0, 8);
  }, []);

  const formatDigitsToDisplay = React.useCallback((digits: string) => {
    if (!digits) return "";
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }, []);

  const formatIsoToDisplay = React.useCallback((isoDate?: string) => {
    if (!isoDate) return "";
    const parsed = new Date(`${isoDate}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return "";
    return format(parsed, "dd/MM/yyyy", { locale: ptBR });
  }, []);

  const parseDisplayToIso = React.useCallback(
    (displayDate: string) => {
      const digits = digitsOnly(displayDate);
      if (!digits) {
        return { iso: "", isValid: true };
      }

      if (digits.length !== 8) {
        return { iso: "", isValid: false };
      }

      const day = Number(digits.slice(0, 2));
      const month = Number(digits.slice(2, 4));
      const year = Number(digits.slice(4, 8));

      if (year < minYear || year > maxYear) {
        return { iso: "", isValid: false };
      }

      const candidate = new Date(year, month - 1, day, 12, 0, 0);
      const isExactDate =
        candidate.getFullYear() === year &&
        candidate.getMonth() === month - 1 &&
        candidate.getDate() === day;

      if (!isExactDate) {
        return { iso: "", isValid: false };
      }

      const iso = format(candidate, "yyyy-MM-dd");
      if (maxDate && iso > maxDate) {
        return { iso: "", isValid: false };
      }
      if (minDate && iso < minDate) {
        return { iso: "", isValid: false };
      }
      return { iso, isValid: true };
    },
    [digitsOnly, maxDate, minDate, maxYear, minYear]
  );

  React.useEffect(() => {
    setInputValue(formatIsoToDisplay(value));
    setInputError("");
  }, [formatIsoToDisplay, value]);

  const handleChange = (isoValue: string) => {
    onChange?.(isoValue);
    if (isoValue) {
      setInputValue(formatIsoToDisplay(isoValue));
    }
    setInputError("");
  };

  const applyManualValue = () => {
    const parsed = parseDisplayToIso(inputValue);
    if (!parsed.isValid) {
      setInputError("Data inválida. Use DD/MM/AAAA.");
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

  const triggerButton = (
    <Button
      id={id}
      type="button"
      variant="outline"
      disabled={disabled}
      className={cn(
        "w-full min-h-[44px] justify-start text-left font-normal",
        !date && "text-muted-foreground",
        className
      )}
    >
      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
      {date ? (
        format(date, "dd/MM/yyyy", { locale: ptBR })
      ) : (
        <span>{placeholder}</span>
      )}
    </Button>
  );

  if (manualInput) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex gap-2">
          <Input
            id={id}
            value={inputValue}
            disabled={disabled}
            placeholder="DD/MM/AAAA"
            maxLength={10}
            className="min-h-[44px]"
            onChange={(e) => {
              const digits = digitsOnly(e.target.value);
              const masked = formatDigitsToDisplay(digits);
              setInputValue(masked);
              if (inputError) setInputError("");
              if (!digits) onChange?.("");
              if (digits.length === 8) {
                const parsed = parseDisplayToIso(masked);
                if (parsed.isValid) {
                  onChange?.(parsed.iso);
                  setInputError("");
                }
              }
            }}
            onBlur={handleManualBlur}
            onKeyDown={handleManualKeyDown}
            aria-invalid={inputError ? true : undefined}
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
        {inputError && (
          <p className="text-sm text-destructive">{inputError}</p>
        )}
      </div>
    );
  }

  return (
    <DatePickerOverlay
      open={open}
      onOpenChange={setOpen}
      trigger={triggerButton}
      title="Selecionar data"
      summary={summary}
    >
      {panel}
    </DatePickerOverlay>
  );
}
