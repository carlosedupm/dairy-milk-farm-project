"use client";

import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
};

/** Componente de seleção de data com calendário popover */
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

  const parseDisplayToIso = React.useCallback((displayDate: string) => {
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
    return { iso, isValid: true };
  }, [digitsOnly, maxYear, minYear]);

  React.useEffect(() => {
    setInputValue(formatIsoToDisplay(value));
    setInputError("");
  }, [formatIsoToDisplay, value]);

  const handleSelect = (d: Date | undefined) => {
    if (!d) return;
    const isoValue = format(d, "yyyy-MM-dd");
    onChange?.(isoValue);
    setInputValue(format(d, "dd/MM/yyyy", { locale: ptBR }));
    setInputError("");
    setOpen(false);
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {manualInput ? (
        <div className={cn("space-y-2", className)}>
          <div className="flex gap-2">
            <Input
              id={id}
              value={inputValue}
              disabled={disabled}
              placeholder="DD/MM/AAAA"
              maxLength={10}
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
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                className="min-h-[44px] min-w-[44px]"
                aria-label="Abrir calendário"
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </div>
          {inputError && <p className="text-sm text-destructive">{inputError}</p>}
        </div>
      ) : (
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal min-h-[44px]",
              !date && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? (
              format(date, "dd/MM/yyyy", { locale: ptBR })
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
      )}
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          captionLayout="dropdown-years"
          startMonth={new Date(minYear, 0)}
          endMonth={new Date(maxYear, 11)}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
