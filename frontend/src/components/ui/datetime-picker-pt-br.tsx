"use client";

import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DatetimeParts = {
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

function defaultParts(): DatetimeParts {
  const n = new Date();
  return {
    year: n.getFullYear(),
    month: n.getMonth() + 1,
    day: n.getDate(),
    hour: n.getHours(),
    minute: n.getMinutes(),
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

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

/**
 * Data e hora em pt-BR: calendário (`react-day-picker` locale pt-BR) + selects Hora / Minutos.
 * Valor controlado no formato `YYYY-MM-DDTHH:mm` (interpretação local), compatível com `new Date(value).toISOString()` no envio à API.
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

  const parts = React.useMemo(() => parseValueToDatetimeParts(value) ?? defaultParts(), [value]);
  const hasValue = Boolean(value.trim() && parseValueToDatetimeParts(value));

  const calendarSelected = React.useMemo(
    () => new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0),
    [parts.year, parts.month, parts.day]
  );

  const labelDisplay = React.useMemo(() => {
    const d = new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  }, [parts]);

  const commit = React.useCallback(
    (next: DatetimeParts) => {
      onChange(composeLocalDatetimeString(next));
    },
    [onChange]
  );

  const handleCalendarSelect = (d: Date | undefined) => {
    if (!d) return;
    commit({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hour: parts.hour,
      minute: parts.minute,
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
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
          <span className="truncate">{hasValue ? labelDisplay : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        collisionPadding={16}
        className={cn(
          "p-0 shadow-md",
          /* Largura mínima maior que w-72 do Popover padrão: evita caption/dropdowns quebrados */
          "min-w-[min(100vw-1.5rem,22rem)] w-[min(100vw-1.5rem,22rem)] max-w-none",
          /* Selects nativos do DayPicker precisam de overflow visível */
          "overflow-visible"
        )}
      >
        {/* Sem overflow:hidden no wrapper: selects nativos do DayPicker quebram dentro do popover */}
        <div className="flex flex-col gap-4 p-3 sm:p-4">
          <Calendar
            mode="single"
            selected={calendarSelected}
            onSelect={(d) => {
              handleCalendarSelect(d);
            }}
            captionLayout="dropdown-years"
            startMonth={new Date(minYear, 0)}
            endMonth={new Date(maxYear, 11)}
            initialFocus
            className="mx-auto w-full max-w-full min-w-[260px]"
            classNames={{
              month_caption:
                "relative flex min-h-10 w-full flex-nowrap items-center justify-center gap-2 px-10 pt-1 text-center",
              dropdowns:
                "inline-flex shrink-0 flex-nowrap items-center justify-center gap-2",
            }}
          />
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Hora</Label>
              <Select
                value={String(parts.hour)}
                onValueChange={(v) =>
                  commit({ ...parts, hour: Number(v) })
                }
              >
                <SelectTrigger className="text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[min(280px,50vh)]">
                  {HOURS.map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {pad2(h)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Minutos</Label>
              <Select
                value={String(parts.minute)}
                onValueChange={(v) =>
                  commit({ ...parts, minute: Number(v) })
                }
              >
                <SelectTrigger className="text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[min(280px,50vh)]">
                  {MINUTES.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {pad2(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => setOpen(false)}
          >
            Concluir
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
