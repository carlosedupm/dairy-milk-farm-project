"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
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
  isAnimalFichaTourDone,
  isOnboardingTourDone,
  markAnimalFichaTourCompleted,
  markAnimalFichaTourSkipped,
  markOnboardingTourDone,
} from "@/lib/onboardingStorage";
import { cn } from "@/lib/utils";

export const TOUR_STEP_BUSCA = "tour-step-busca";
export const TOUR_STEP_KPIS = "tour-step-kpis";
export const TOUR_STEP_ACESSO_RAPIDO = "tour-step-acesso-rapido";

export const TOUR_STEP_FICHA_SIDEBAR = "tour-step-ficha-sidebar";
export const TOUR_STEP_FICHA_CICLO_MINI = "tour-step-ficha-ciclo-mini";
export const TOUR_STEP_FICHA_TAB_CICLO = "tour-step-ficha-tab-ciclo";
export const TOUR_STEP_FICHA_PROXIMAS_ACOES = "tour-step-ficha-proximas-acoes";
export const TOUR_STEP_FICHA_PROXIMAS_ACOES_MOBILE =
  "tour-step-ficha-proximas-acoes-mobile";
export const TOUR_STEP_FICHA_OUTRAS_TABS = "tour-step-ficha-outras-tabs";

export type TourStepDef = {
  targetId?: string;
  targetIds?: string[];
  title: string;
  description: string;
};

export type ResolvedTourStep = TourStepDef & {
  resolvedTargetId: string;
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

function getStepTargetIds(step: TourStepDef): string[] {
  if (step.targetIds?.length) return step.targetIds;
  if (step.targetId) return [step.targetId];
  return [];
}

function resolveStep(step: TourStepDef): ResolvedTourStep | null {
  for (const targetId of getStepTargetIds(step)) {
    if (getAnchorRect(targetId) != null) {
      return { ...step, resolvedTargetId: targetId };
    }
  }
  return null;
}

function resolveSteps(steps: TourStepDef[]): ResolvedTourStep[] {
  const resolved: ResolvedTourStep[] = [];
  for (const step of steps) {
    const match = resolveStep(step);
    if (match) resolved.push(match);
  }
  return resolved;
}

export type UseTourOptions = {
  steps: TourStepDef[];
  autoStartDelayMs?: number;
  enabled?: boolean;
  isDone?: () => boolean;
  markDone?: () => void;
  markSkipped?: () => void;
};

export function useTour({
  steps,
  autoStartDelayMs = 1000,
  enabled = true,
  isDone = isOnboardingTourDone,
  markDone = markOnboardingTourDone,
  markSkipped,
}: UseTourOptions) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [resolvedSteps, setResolvedSteps] = useState<ResolvedTourStep[]>([]);

  const skipTour = markSkipped ?? markDone;

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
        markDone();
        setIsActive(false);
        return i;
      }
      return i + 1;
    });
  }, [resolvedSteps.length, markDone]);

  const skip = useCallback(() => {
    skipTour();
    setIsActive(false);
  }, [skipTour]);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setIsActive(false);
    setResolvedSteps([]);
  }, []);

  const finish = useCallback(() => {
    markDone();
    setIsActive(false);
  }, [markDone]);

  useEffect(() => {
    if (!enabled || isDone()) return;
    const t = window.setTimeout(() => {
      const available = resolveSteps(steps);
      if (available.length === 0) {
        markDone();
        return;
      }
      setResolvedSteps(available);
      setIsActive(true);
    }, autoStartDelayMs);
    return () => window.clearTimeout(t);
  }, [enabled, steps, autoStartDelayMs, isDone, markDone]);

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
    setAnchor(getAnchorRect(step.resolvedTargetId));
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

const ANIMAL_FICHA_TOUR_STEPS: TourStepDef[] = [
  {
    targetId: TOUR_STEP_FICHA_SIDEBAR,
    title: "Resumo do animal",
    description:
      "Aqui vês identificação, estado de saúde, reprodução e um resumo rápido do animal.",
  },
  {
    targetId: TOUR_STEP_FICHA_CICLO_MINI,
    title: "Visão Geral e ciclo",
    description:
      "Na aba Visão Geral, a mini-timeline mostra os últimos eventos e os próximos marcos do ciclo reprodutivo.",
  },
  {
    targetId: TOUR_STEP_FICHA_TAB_CICLO,
    title: "Tab Ciclo",
    description:
      "Abre a aba Ciclo para o hub completo: estado atual, histórico paginado e timeline visual.",
  },
  {
    targetIds: [
      TOUR_STEP_FICHA_PROXIMAS_ACOES,
      TOUR_STEP_FICHA_PROXIMAS_ACOES_MOBILE,
    ],
    title: "Próximas ações",
    description:
      "Atalhos para a próxima tarefa recomendada — cio, cobertura, toque ou outro evento do ciclo.",
  },
  {
    targetId: TOUR_STEP_FICHA_OUTRAS_TABS,
    title: "Outras secções",
    description:
      "Saúde, Produção e Histórico reúnem casos clínicos, ordenhas e o registo completo do animal.",
  },
];

export type AnimalFichaTourHostProps = {
  userId: number;
  enabled?: boolean;
};

/** Tour de onboarding na ficha do animal (primeira visita por utilizador). */
export function AnimalFichaTourHost({
  userId,
  enabled = true,
}: AnimalFichaTourHostProps) {
  const isDone = useCallback(
    () => isAnimalFichaTourDone(userId),
    [userId],
  );
  const markDone = useCallback(
    () => markAnimalFichaTourCompleted(userId),
    [userId],
  );
  const markSkipped = useCallback(
    () => markAnimalFichaTourSkipped(userId),
    [userId],
  );

  const steps = useMemo(() => ANIMAL_FICHA_TOUR_STEPS, []);

  const tour = useTour({
    steps,
    enabled,
    isDone,
    markDone,
    markSkipped,
    autoStartDelayMs: 1200,
  });

  return <TourOverlay tour={tour} />;
}
