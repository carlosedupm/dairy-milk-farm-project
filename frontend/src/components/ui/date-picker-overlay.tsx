"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type DatePickerOverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Botão que abre o modal (DialogTrigger asChild) */
  trigger: React.ReactNode;
  title: string;
  /** Valor atual formatado para o utilizador (cabeçalho do modal) */
  summary?: string;
  children: React.ReactNode;
};

const dialogContentClassName = cn(
  /* !grid do DialogContent base → coluna flex para header + calendário + atalhos */
  "!flex !grid-cols-none w-[calc(100%-2rem)] max-w-md !flex-col gap-0 overflow-hidden !p-0",
  "max-h-[min(92dvh,calc(100dvh-2rem))]",
  "top-[50%] translate-x-[-50%] translate-y-[-50%]",
  "sm:rounded-lg"
);

/**
 * Modal de picker (Dialog em todos os breakpoints) — visibilidade consistente mobile/desktop.
 */
export function DatePickerOverlay({
  open,
  onOpenChange,
  trigger,
  title,
  summary,
  children,
}: DatePickerOverlayProps) {
  const summaryId = React.useId();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className={dialogContentClassName}
        aria-describedby={summary ? summaryId : undefined}
      >
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-4 py-3 pr-12 text-left">
          <DialogTitle>{title}</DialogTitle>
          {summary ? (
            <DialogDescription
              id={summaryId}
              className="text-base font-medium text-foreground"
            >
              {summary}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
