"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ButtonProps = ComponentProps<typeof Button>;

type Props = ButtonProps & {
  tooltip?: string;
};

/**
 * Botão com tooltip opcional. Quando disabled, envolve em span para o Radix
 * conseguir activar o tooltip (botões disabled não recebem pointer events).
 */
export function ButtonWithTooltip({
  tooltip,
  disabled,
  className,
  children,
  ...buttonProps
}: Props) {
  const button = (
    <Button disabled={disabled} className={className} {...buttonProps}>
      {children}
    </Button>
  );

  if (!tooltip) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex", disabled && "cursor-not-allowed")}>
          {button}
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
