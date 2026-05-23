"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ListRowActionItem = {
  label: string;
  href?: string;
  onSelect?: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
};

type Props = {
  items: ListRowActionItem[];
  /** Rótulo acessível do gatilho */
  triggerLabel?: string;
};

export function ListRowActionsMenu({
  items,
  triggerLabel = "Ações",
}: Props) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="min-h-[44px] min-w-[44px] shrink-0"
          aria-label={triggerLabel}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-5 w-5" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-auto min-w-[10rem] p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ul className="flex flex-col gap-0.5" role="menu">
          {items.map((item) => {
            const className = cn(
              "flex w-full min-h-[44px] items-center rounded-sm px-3 text-base",
              item.variant === "destructive"
                ? "text-destructive hover:bg-destructive/10"
                : "hover:bg-accent"
            );
            if (item.href) {
              return (
                <li key={item.label} role="none">
                  <Link
                    href={item.href}
                    role="menuitem"
                    className={className}
                    aria-disabled={item.disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen(false);
                    }}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            }
            return (
              <li key={item.label} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className={className}
                  disabled={item.disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    item.onSelect?.();
                  }}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
