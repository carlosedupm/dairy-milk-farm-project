"use client";

import "react-day-picker/style.css";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  showOutsideDays = true,
  locale = ptBR,
  classNames: userClassNames,
  ...props
}: CalendarProps) {
  const baseClassNames: NonNullable<CalendarProps["classNames"]> = {
    root: "rdp-root",
    months: "flex flex-col sm:flex-row gap-4",
    month: "flex flex-col gap-4",
    /** Dropdowns nativos: dependem de `react-day-picker/style.css` + classes `rdp-*`; Tailwind reforça overlay invisível. */
    dropdowns: "rdp-dropdowns relative inline-flex items-center gap-2",
    dropdown_root: "rdp-dropdown_root relative inline-flex items-center",
    dropdown:
      "rdp-dropdown absolute inset-y-0 left-0 z-[2] m-0 w-full cursor-inherit appearance-none border-0 p-0 opacity-0 leading-[inherit]",
    caption_label:
      "rdp-caption_label relative z-[1] inline-flex items-center whitespace-nowrap border-0",
    months_dropdown: "rdp-months_dropdown",
    years_dropdown: "rdp-years_dropdown",
    month_caption:
      "relative flex min-h-10 w-full flex-wrap items-center justify-center gap-2 px-11 pt-1 text-center",
    nav: "flex items-center gap-1",
    button_previous:
      "absolute left-0 min-h-[44px] min-w-[44px] rounded-md border border-input bg-background p-0 opacity-50 hover:opacity-100",
    button_next:
      "absolute right-0 min-h-[44px] min-w-[44px] rounded-md border border-input bg-background p-0 opacity-50 hover:opacity-100",
    month_grid: "w-full min-w-0 border-collapse space-y-1",
    weekdays: "flex w-full",
    weekday:
      "flex-1 text-center text-muted-foreground rounded-md font-normal text-[0.8rem]",
    week: "flex w-full mt-2",
    day: "relative min-w-0 flex-1 max-w-[2.75rem] p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
    day_button:
      "mx-auto flex aspect-square min-h-[44px] w-full max-w-[2.75rem] items-center justify-center p-0 font-normal rounded-md hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring aria-selected:opacity-100",
    range_start: "day-range-start rounded-l-md bg-primary text-primary-foreground",
    range_end: "day-range-end rounded-r-md bg-primary text-primary-foreground",
    selected:
      "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
    today: "bg-accent text-accent-foreground",
    outside:
      "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
    disabled: "text-muted-foreground opacity-50",
    range_middle:
      "aria-selected:bg-accent aria-selected:text-accent-foreground rounded-none",
    hidden: "invisible",
  };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={locale}
      className={cn("min-w-[20rem] p-3 rdp", className)}
      classNames={{ ...baseClassNames, ...userClassNames }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
