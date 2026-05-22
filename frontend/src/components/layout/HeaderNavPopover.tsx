"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HeaderNavLink } from "@/components/layout/HeaderNavLink";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type HeaderNavPopoverItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
};

type HeaderNavPopoverProps = {
  triggerLabel: string;
  ariaLabel: string;
  items: HeaderNavPopoverItem[];
  triggerActive?: boolean;
  onNavigate?: () => void;
};

export function HeaderNavPopover({
  triggerLabel,
  ariaLabel,
  items,
  triggerActive = false,
  onNavigate,
}: HeaderNavPopoverProps) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  const handleNavigate = () => {
    setOpen(false);
    onNavigate?.();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-auto min-h-[44px] shrink-0 gap-1 px-2.5 py-2 text-sm font-normal",
            triggerActive
              ? "bg-accent text-foreground font-medium"
              : "text-muted-foreground"
          )}
          aria-label={ariaLabel}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          {triggerLabel}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="z-50 w-56 max-h-[min(24rem,72dvh)] overflow-y-auto p-1"
      >
        <ul className="flex flex-col gap-0.5" role="menu">
          {items.map((item) => (
            <li key={item.href} role="none">
              <HeaderNavLink
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={item.active}
                variant="drawer"
                onNavigate={handleNavigate}
              />
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
