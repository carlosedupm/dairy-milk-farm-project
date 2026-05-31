"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  isOnboardingTourDone,
  markOnboardingTourDone,
} from "@/lib/onboardingStorage";
import { cn } from "@/lib/utils";

export const TOUR_STEP_BUSCA = "tour-step-busca";
export const TOUR_STEP_KPIS = "tour-step-kpis";
export const TOUR_STEP_ACESSO_RAPIDO = "tour-step-acesso-rapido";

export type TourStepDef = {
  targetId: string;
  title: string;
  description: string;
};

type AnchorRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function getAnchorRect(targetId: string): AnchorRect | null {
  const el = document.getElementById(targetId);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return {
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
  };
}

function resolveSteps(steps: TourStepDef[]): TourStepDef[] {
  return steps.filter((s) => getAnchorRect(s.targetId) != null);
}

export type UseTourOptions = {
  steps: TourStepDef[];
  autoStartDelayMs?: number;
  enabled?: boolean;
};

export function useTour({
  steps,
  autoStartDelayMs = 1000,
  enabled = true,
}: UseTourOptions) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [resolvedSteps, setResolvedSteps] = useState<TourStepDef[]>([]);

  const activate = useCallback(() => {
    const available = resolveSteps(steps);
    if (available.length === 0) return;
    setResolvedSteps(available);
    setCurrentStep(0);
    setIsActive(true);
  }, [steps]);

  const next = useCallback(() => {
    setCurrentStep((i) => {
      if (i >= resolvedSteps.length - 1) {
        markOnboardingTourDone();
        setIsActive(false);
        return i;
      }
      return i + 1;
    });
  }, [resolvedSteps.length]);

  const skip = useCallback(() => {
    markOnboardingTourDone();
    setIsActive(false);
  }, []);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setIsActive(false);
    setResolvedSteps([]);
  }, []);

  const finish = useCallback(() => {
    markOnboardingTourDone();
    setIsActive(false);
  }, []);

  useEffect(() => {
    if (!enabled || isOnboardingTourDone()) return;
    const t = window.setTimeout(() => {
      const available = resolveSteps(steps);
      if (available.length === 0) {
        markOnboardingTourDone();
        return;
      }
      setResolvedSteps(available);
      setIsActive(true);
    }, autoStartDelayMs);
    return () => window.clearTimeout(t);
  }, [enabled, steps, autoStartDelayMs]);

  const step = resolvedSteps[currentStep];
  const isLast = currentStep >= resolvedSteps.length - 1;

  return {
    currentStep,
    isActive,
    steps: resolvedSteps,
    step,
    isLast,
    activate,
    next,
    skip,
    reset,
    finish,
  };
}

type TourOverlayProps = {
  tour: ReturnType<typeof useTour>;
};

export function TourOverlay({ tour }: TourOverlayProps) {
  const titleId = useId();
  const descId = useId();
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);

  const { isActive, step, currentStep, steps, isLast, next, skip, finish } =
    tour;

  const updateAnchor = useCallback(() => {
    if (!step) {
      setAnchor(null);
      return;
    }
    setAnchor(getAnchorRect(step.targetId));
  }, [step]);

  useEffect(() => {
    if (!isActive || !step) return;
    const raf = window.requestAnimationFrame(() => updateAnchor());
    window.addEventListener("resize", updateAnchor);
    window.addEventListener("scroll", updateAnchor, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateAnchor);
      window.removeEventListener("scroll", updateAnchor, true);
    };
  }, [isActive, step, updateAnchor, currentStep]);

  if (!isActive || !step || steps.length === 0) {
    return null;
  }

  const handlePrimary = () => {
    if (isLast) {
      finish();
    } else {
      next();
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="fixed inset-0 z-[60] bg-background/60" aria-hidden />
      {anchor ? (
        <Tooltip open>
          <TooltipTrigger asChild>
            <span
              className="pointer-events-none fixed z-[61] block rounded-md ring-2 ring-primary ring-offset-2 ring-offset-background"
              style={{
                top: anchor.top,
                left: anchor.left,
                width: anchor.width,
                height: anchor.height,
              }}
              aria-hidden
            />
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            align="center"
            className="z-[62] sr-only max-w-[min(20rem,calc(100vw-2rem))]"
          >
            {step.title}
          </TooltipContent>
        </Tooltip>
      ) : null}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={cn(
          "fixed z-[63] left-4 right-4 bottom-[max(1rem,env(safe-area-inset-bottom,0px))]",
          "mx-auto max-w-md rounded-xl border bg-card p-4 shadow-elevation3",
          "animate-in fade-in duration-200",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            {currentStep + 1}/{steps.length}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            aria-label="Pular tour"
            onClick={skip}
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <p id={titleId} className="mt-1 text-base font-semibold text-foreground">
          {step.title}
        </p>
        <p id={descId} className="mt-2 text-sm text-muted-foreground">
          {step.description}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-[44px] justify-center"
            onClick={skip}
          >
            Pular tour
          </Button>
          <Button
            type="button"
            size="lg"
            className="min-h-[44px]"
            onClick={handlePrimary}
          >
            {isLast ? "Entendi" : "Próximo"}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}

export type DashboardTourHostProps = {
  steps: TourStepDef[];
  enabled?: boolean;
};

/** Monta tour com auto-start (useTour + TourOverlay). */
export function DashboardTourHost({
  steps,
  enabled = true,
}: DashboardTourHostProps) {
  const tour = useTour({ steps, enabled });
  return <TourOverlay tour={tour} />;
}
