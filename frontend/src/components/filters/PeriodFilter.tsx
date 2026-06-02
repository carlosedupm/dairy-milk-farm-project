"use client";

import { DatePickerUnificado } from "@/components/ui/date-picker-unificado";
import { FormFieldError } from "@/components/ui/form-field-error";
import { Label } from "@/components/ui/label";
import { getPeriodRangeOrderError } from "@/lib/period-filter";
import { cn } from "@/lib/utils";

export type PeriodFilterProps = {
  start: string;
  end: string;
  onChange: (next: { start: string; end: string }) => void;
  idPrefix: string;
  startLabel?: string;
  endLabel?: string;
  startPlaceholder?: string;
  endPlaceholder?: string;
  className?: string;
  pickerClassName?: string;
};

export function PeriodFilter({
  start,
  end,
  onChange,
  idPrefix,
  startLabel = "Data inicial",
  endLabel = "Data final",
  startPlaceholder = "Selecione a data inicial",
  endPlaceholder = "Selecione a data final",
  className,
  pickerClassName,
}: PeriodFilterProps) {
  const orderError = getPeriodRangeOrderError(start, end);

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 items-end",
        className,
      )}
    >
      <div className="space-y-2 min-w-0">
        <Label htmlFor={`${idPrefix}-start`}>{startLabel}</Label>
        <DatePickerUnificado
          id={`${idPrefix}-start`}
          value={start}
          onChange={(nextStart) => onChange({ start: nextStart, end })}
          placeholder={startPlaceholder}
          className={pickerClassName}
          showConfirmationMessage={false}
        />
      </div>
      <div className="space-y-2 min-w-0">
        <Label htmlFor={`${idPrefix}-end`}>{endLabel}</Label>
        <DatePickerUnificado
          id={`${idPrefix}-end`}
          value={end}
          onChange={(nextEnd) => onChange({ start, end: nextEnd })}
          placeholder={endPlaceholder}
          className={pickerClassName}
          showConfirmationMessage={false}
        />
        <FormFieldError message={orderError} />
      </div>
    </div>
  );
}
