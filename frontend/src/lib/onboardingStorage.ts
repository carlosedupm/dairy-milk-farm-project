const WIZARD_KEY_PREFIX = "ceialmilk:onboarding:wizard:v1:";
const TOUR_KEY_PREFIX = "ceialmilk:dashboard-tour:v1:";
const ANIMAL_FICHA_TOUR_KEY_PREFIX = "ceialmilk:animal-ficha-tour:v1:";

/** Disparado após `resetAnimalFichaTour` para remontar o tour na ficha aberta. */
export const ANIMAL_FICHA_TOUR_RESET_EVENT = "ceialmilk:animal-ficha-tour-reset";
/** Chave do spec RF02 (tour concluído ou pulado). */
export const ONBOARDING_TOUR_DONE_KEY = "onboarding-tour-done";

export type DashboardTourStatus = "completed" | "skipped";
export type AnimalFichaTourStatus = "completed" | "skipped";

function wizardKey(userId: number): string {
  return `${WIZARD_KEY_PREFIX}${userId}`;
}

function tourKey(userId: number): string {
  return `${TOUR_KEY_PREFIX}${userId}`;
}

function animalFichaTourKey(userId: number): string {
  return `${ANIMAL_FICHA_TOUR_KEY_PREFIX}${userId}`;
}

function safeGetItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota / private mode */
  }
}

function safeRemoveItem(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function isOnboardingWizardCompleted(userId: number): boolean {
  return safeGetItem(wizardKey(userId)) === "completed";
}

export function markOnboardingWizardCompleted(userId: number): void {
  safeSetItem(wizardKey(userId), "completed");
}

export function isOnboardingTourDone(): boolean {
  return safeGetItem(ONBOARDING_TOUR_DONE_KEY) === "true";
}

export function markOnboardingTourDone(): void {
  safeSetItem(ONBOARDING_TOUR_DONE_KEY, "true");
}

export function isDashboardTourDone(userId: number): boolean {
  if (isOnboardingTourDone()) return true;
  const v = safeGetItem(tourKey(userId));
  return v === "completed" || v === "skipped";
}

export function markDashboardTourCompleted(userId: number): void {
  markOnboardingTourDone();
  safeSetItem(tourKey(userId), "completed");
}

export function markDashboardTourSkipped(userId: number): void {
  markOnboardingTourDone();
  safeSetItem(tourKey(userId), "skipped");
}

export function resetDashboardTour(userId: number): void {
  safeRemoveItem(ONBOARDING_TOUR_DONE_KEY);
  safeRemoveItem(tourKey(userId));
}

export function getDashboardTourStatus(
  userId: number,
): DashboardTourStatus | null {
  const v = safeGetItem(tourKey(userId));
  if (v === "completed" || v === "skipped") return v;
  return null;
}

export function isAnimalFichaTourDone(userId: number): boolean {
  const v = safeGetItem(animalFichaTourKey(userId));
  return v === "completed" || v === "skipped";
}

export function markAnimalFichaTourCompleted(userId: number): void {
  safeSetItem(animalFichaTourKey(userId), "completed");
}

export function markAnimalFichaTourSkipped(userId: number): void {
  safeSetItem(animalFichaTourKey(userId), "skipped");
}

export function resetAnimalFichaTour(userId: number): void {
  safeRemoveItem(animalFichaTourKey(userId));
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(ANIMAL_FICHA_TOUR_RESET_EVENT, {
        detail: { userId },
      }),
    );
  }
}

export function getAnimalFichaTourStatus(
  userId: number,
): AnimalFichaTourStatus | null {
  const v = safeGetItem(animalFichaTourKey(userId));
  if (v === "completed" || v === "skipped") return v;
  return null;
}
