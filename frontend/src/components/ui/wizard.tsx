"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WizardContextValue = {
  currentStep: number;
  totalSteps: number;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  isFirst: boolean;
  isLast: boolean;
};

const WizardContext = createContext<WizardContextValue | null>(null);

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) {
    throw new Error("useWizard must be used within WizardProvider");
  }
  return ctx;
}

type WizardProviderProps = {
  totalSteps: number;
  initialStep?: number;
  onFinish?: () => void;
  children: ReactNode;
};

export function WizardProvider({
  totalSteps,
  initialStep = 0,
  onFinish,
  children,
}: WizardProviderProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);

  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  const goToStep = useCallback(
    (step: number) => {
      setCurrentStep(Math.max(0, Math.min(totalSteps - 1, step)));
    },
    [totalSteps],
  );

  const nextStep = useCallback(() => {
    setCurrentStep((s) => Math.min(totalSteps - 1, s + 1));
  }, [totalSteps]);

  const prevStep = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  const value = useMemo(
    () => ({
      currentStep,
      totalSteps,
      goToStep,
      nextStep,
      prevStep,
      isFirst,
      isLast,
    }),
    [currentStep, totalSteps, goToStep, nextStep, prevStep, isFirst, isLast],
  );

  return (
    <WizardContext.Provider value={value}>
      <div aria-live="polite" aria-atomic="true">
        {children}
      </div>
    </WizardContext.Provider>
  );
}

type WizardStepProps = {
  step: number;
  children: ReactNode;
  className?: string;
};

export function WizardStep({ step, children, className }: WizardStepProps) {
  const { currentStep } = useWizard();

  if (currentStep !== step) {
    return null;
  }

  return (
    <div key={step} className={cn("animate-in fade-in duration-200", className)}>
      {children}
    </div>
  );
}

export function WizardProgress({ className }: { className?: string }) {
  const { currentStep, totalSteps } = useWizard();

  return (
    <div
      className={cn("flex items-center justify-center gap-2", className)}
      role="group"
      aria-label={`Passo ${currentStep + 1} de ${totalSteps}`}
    >
      {Array.from({ length: totalSteps }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-2.5 w-2.5 rounded-full transition-colors",
            i === currentStep
              ? "bg-primary scale-110"
              : "bg-muted-foreground/30",
          )}
          aria-current={i === currentStep ? "step" : undefined}
        />
      ))}
    </div>
  );
}

export type WizardNavigationLabels = {
  back?: string;
  next?: string;
  finish?: string;
};

type WizardNavigationProps = {
  labels?: WizardNavigationLabels;
  className?: string;
  onFinish?: () => void;
};

export function WizardNavigation({
  labels,
  className,
  onFinish,
}: WizardNavigationProps) {
  const { currentStep, nextStep, prevStep, isFirst, isLast } = useWizard();
  const nextRef = useRef<HTMLButtonElement>(null);

  const backLabel = labels?.back ?? "Voltar";
  const nextLabel = labels?.next ?? "Próximo";
  const finishLabel = labels?.finish ?? "Concluir";

  useEffect(() => {
    nextRef.current?.focus();
  }, [currentStep]);

  const handlePrimary = () => {
    if (isLast) {
      onFinish?.();
    } else {
      nextStep();
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:items-center",
        className,
      )}
    >
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="min-h-[44px] w-full sm:w-auto"
        disabled={isFirst}
        onClick={prevStep}
      >
        {backLabel}
      </Button>
      <Button
        ref={nextRef}
        type="button"
        size="lg"
        className="min-h-[44px] w-full sm:w-auto"
        onClick={handlePrimary}
      >
        {isLast ? finishLabel : nextLabel}
      </Button>
    </div>
  );
}
