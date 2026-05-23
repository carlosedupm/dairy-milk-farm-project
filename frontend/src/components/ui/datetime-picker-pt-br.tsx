"use client";

import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DatePickerOverlay } from "@/components/ui/date-picker-overlay";
import { DatePickerPanel } from "@/components/ui/date-picker-panel";

export type DatetimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** String no formato local usado nos formulários (`YYYY-MM-DDTHH:mm`). */
export function composeLocalDatetimeString(parts: DatetimeParts): string {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

export function parseValueToDatetimeParts(value: string): DatetimeParts | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
  };
}

export type DateTimePickerPtBrProps = {
  value: string;
  onChange: (localDatetime: string) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  placeholder?: string;
  minYear?: number;
  maxYear?: number;
};

/**
 * Data e hora em pt-BR: calendário + selects nativos de hora/minuto em Dialog.
 * Valor: `YYYY-MM-DDTHH:mm` (local), compatível com `new Date(value).toISOString()`.
 */
export function DateTimePickerPtBr({
  value,
  onChange,
  disabled = false,
  id,
  className,
  placeholder = "Selecione data e hora",
  minYear = 1950,
  maxYear = new Date().getFullYear() + 2,
}: DateTimePickerPtBrProps) {
  const [open, setOpen] = React.useState(false);

  const parts = React.useMemo(
    () => parseValueToDatetimeParts(value),
    [value]
  );
  const hasValue = Boolean(parts);

  const labelDisplay = React.useMemo(() => {
    if (!parts) return "";
    const d = new Date(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute
    );
    return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  }, [parts]);

  const summary = hasValue
    ? labelDisplay
    : "Nenhuma data e hora selecionadas";

  const trigger = (
    <Button
      id={id}
      type="button"
      variant="outline"
      disabled={disabled}
      className={cn(
        "w-full min-h-[44px] justify-start text-left font-normal text-foreground",
        !hasValue && "text-muted-foreground",
        className
      )}
    >
      <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
      <span className="truncate">
        {hasValue ? labelDisplay : placeholder}
      </span>
    </Button>
  );

  return (
    <DatePickerOverlay
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title="Selecionar data e hora"
      summary={summary}
    >
      <DatePickerPanel
        mode="datetime"
        value={value}
        onChange={onChange}
        minYear={minYear}
        maxYear={maxYear}
        onDone={() => setOpen(false)}
      />
    </DatePickerOverlay>
  );
}
