"use client";

import * as React from "react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  composeLocalDatetimeString,
  defaultDatetimeParts,
  parseValueToDatetimeParts,
  type DatetimeParts,
} from "@/lib/datetime-input";
import { parseISODateLocal, todayISODate } from "@/lib/date-limits";

export type DatePickerPanelMode = "date" | "datetime";

export type DatePickerPanelProps = {
  mode: DatePickerPanelMode;
  /** `YYYY-MM-DD` (date) ou `YYYY-MM-DDTHH:mm` (datetime) */
  value: string;
  onChange: (value: string) => void;
  minYear?: number;
  maxYear?: number;
  /** Limite inferior/superior civil (YYYY-MM-DD) */
  minDate?: string;
  maxDate?: string;
  /** Fecha o modal */
  onDone?: () => void;
  /** Modo date: fecha ao selecionar um dia */
  closeOnSelect?: boolean;
  className?: string;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const nativeSelectClassName = cn(
  "flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2",
  "text-base text-foreground shadow-sm",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
);

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Corpo do picker: calendário + hora/min (sem portal Radix aninhado). */
export function DatePickerPanel({
  mode,
  value,
  onChange,
  minYear = 1950,
  maxYear = new Date().getFullYear() + 2,
  minDate,
  maxDate,
  onDone,
  closeOnSelect = mode === "date",
  className,
}: DatePickerPanelProps) {
  const minD = React.useMemo(
    () => (minDate ? parseISODateLocal(minDate) : undefined),
    [minDate]
  );
  const maxD = React.useMemo(
    () => (maxDate ? parseISODateLocal(maxDate) : undefined),
    [maxDate]
  );

  const isDayDisabled = React.useCallback(
    (day: Date) => {
      const civil = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      if (minD && civil < minD) return true;
      if (maxD && civil > maxD) return true;
      return false;
    },
    [minD, maxD]
  );

  const nowParts = React.useMemo(() => {
    const n = new Date();
    return {
      hour: n.getHours(),
      minute: n.getMinutes(),
      today: todayISODate(),
    };
  }, []);
  const dateValue = React.useMemo(() => {
    if (mode === "date") return value.trim();
    const parts = parseValueToDatetimeParts(value);
    if (!parts) return "";
    return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
  }, [mode, value]);

  const parts = React.useMemo(
    () =>
      mode === "datetime"
        ? (parseValueToDatetimeParts(value) ?? defaultDatetimeParts())
        : null,
    [mode, value]
  );

  const calendarSelected = React.useMemo(() => {
    if (mode === "date" && dateValue) {
      return new Date(`${dateValue}T12:00:00`);
    }
    if (mode === "datetime" && parts) {
      return new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0);
    }
    return undefined;
  }, [dateValue, mode, parts]);

  const handleDateSelect = (d: Date | undefined) => {
    if (!d) return;
    const iso = format(d, "yyyy-MM-dd");
    if (mode === "date") {
      onChange(iso);
      if (closeOnSelect) onDone?.();
      return;
    }
    if (parts) {
      onChange(
        composeLocalDatetimeString({
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          day: d.getDate(),
          hour: parts.hour,
          minute: parts.minute,
        })
      );
    }
  };

  const commitDatetime = React.useCallback(
    (next: DatetimeParts) => {
      let hour = next.hour;
      let minute = next.minute;
      const dayIso = `${next.year}-${pad2(next.month)}-${pad2(next.day)}`;
      if (maxDate && dayIso === nowParts.today) {
        if (hour > nowParts.hour) hour = nowParts.hour;
        if (hour === nowParts.hour && minute > nowParts.minute) {
          minute = nowParts.minute;
        }
      }
      onChange(
        composeLocalDatetimeString({
          ...next,
          hour,
          minute,
        })
      );
    },
    [maxDate, nowParts, onChange]
  );

  const calendarBlock = (
    <div className="min-w-[20rem]">
      <Calendar
        mode="single"
        selected={calendarSelected}
        onSelect={handleDateSelect}
        disabled={isDayDisabled}
        captionLayout="dropdown-years"
        startMonth={new Date(minYear, 0)}
        endMonth={new Date(maxYear, 11)}
        initialFocus
        className="mx-auto w-full max-w-full min-w-[20rem] p-0"
        classNames={{
          dropdowns:
            "inline-flex shrink-0 flex-nowrap items-center justify-center gap-2",
        }}
      />
    </div>
  );

  const timeBlock =
    mode === "datetime" && parts ? (
      <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
        <div className="space-y-2">
          <Label htmlFor="picker-hour" className="text-muted-foreground">
            Hora
          </Label>
          <select
            id="picker-hour"
            className={nativeSelectClassName}
            value={parts.hour}
            onChange={(e) =>
              commitDatetime({ ...parts, hour: Number(e.target.value) })
            }
            aria-label="Hora"
          >
            {HOURS.filter((h) => {
              if (!parts || !maxDate) return true;
              const dayIso = `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
              if (dayIso !== nowParts.today) return true;
              return h <= nowParts.hour;
            }).map((h) => (
              <option key={h} value={h}>
                {pad2(h)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="picker-minute" className="text-muted-foreground">
            Minutos
          </Label>
          <select
            id="picker-minute"
            className={nativeSelectClassName}
            value={parts.minute}
            onChange={(e) =>
              commitDatetime({ ...parts, minute: Number(e.target.value) })
            }
            aria-label="Minutos"
          >
            {MINUTES.filter((m) => {
              if (!parts || !maxDate) return true;
              const dayIso = `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
              if (dayIso !== nowParts.today) return true;
              if (parts.hour < nowParts.hour) return true;
              if (parts.hour > nowParts.hour) return false;
              return m <= nowParts.minute;
            }).map((m) => (
              <option key={m} value={m}>
                {pad2(m)}
              </option>
            ))}
          </select>
        </div>
      </div>
    ) : null;

  if (mode === "datetime") {
    return (
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden",
          className
        )}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
          <div className="flex flex-col gap-4">
            {calendarBlock}
            {timeBlock}
          </div>
        </div>
        <div className="shrink-0 border-t border-border bg-background p-3 sm:px-4 sm:pb-4">
          <Button
            type="button"
            variant="secondary"
            className="min-h-[44px] w-full"
            onClick={() => onDone?.()}
          >
            Concluir
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4",
        className
      )}
    >
      {calendarBlock}
    </div>
  );
}
