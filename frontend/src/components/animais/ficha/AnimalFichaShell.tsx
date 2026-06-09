"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { PageContainer } from "@/components/layout/PageContainer";
import { AnimalFichaSidebar } from "@/components/animais/ficha/AnimalFichaSidebar";
import { AnimalFichaTabs } from "@/components/animais/ficha/AnimalFichaTabs";
import {
  ANIMAL_FICHA_TAB_LABELS,
  animalFichaTabHref,
  type AnimalFichaTab,
} from "@/components/animais/ficha/animalFichaTabs";
import { AnimalFichaTourHost } from "@/components/ui/tour";
import { getAreasMode } from "@/config/appAccess";
import { useAuth } from "@/contexts/AuthContext";
import {
  ANIMAL_FICHA_TOUR_RESET_EVENT,
  isAnimalFichaTourDone,
} from "@/lib/onboardingStorage";
import type { UseAnimalFichaPageResult } from "@/hooks/useAnimalFichaPage";

function buildBreadcrumbItems(
  animalId: number,
  identificacao: string,
  activeTab: AnimalFichaTab
) {
  const items: { label: string; href?: string }[] = [
    { label: "Animais", href: "/animais" },
    {
      label: identificacao,
      ...(activeTab !== "geral"
        ? { href: animalFichaTabHref(animalId, "geral") }
        : {}),
    },
  ];

  if (activeTab !== "geral") {
    items.push({ label: ANIMAL_FICHA_TAB_LABELS[activeTab] });
  }

  return items;
}

type Props = UseAnimalFichaPageResult & {
  animal: NonNullable<UseAnimalFichaPageResult["animal"]>;
};

export function AnimalFichaShell(props: Props) {
  const { user } = useAuth();
  const { animal, activeTab, contexto, contextoLoading, setTab } = props;
  const [tourSession, setTourSession] = useState(0);

  const showAnimalFichaTour =
    !!user?.id &&
    getAreasMode(user.perfil) !== "pending" &&
    !isAnimalFichaTourDone(user.id) &&
    !!contexto &&
    !contextoLoading;

  useEffect(() => {
    const onTourReset = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: number }>).detail;
      if (user?.id != null && detail?.userId === user.id) {
        setTourSession((session) => session + 1);
      }
    };
    window.addEventListener(ANIMAL_FICHA_TOUR_RESET_EVENT, onTourReset);
    return () => {
      window.removeEventListener(ANIMAL_FICHA_TOUR_RESET_EVENT, onTourReset);
    };
  }, [user?.id]);

  useEffect(() => {
    if (showAnimalFichaTour && activeTab !== "geral") {
      setTab("geral");
    }
  }, [showAnimalFichaTour, activeTab, setTab]);

  return (
    <PageContainer variant="wide">
      {showAnimalFichaTour && user?.id ? (
        <AnimalFichaTourHost
          key={tourSession}
          userId={user.id}
          enabled={showAnimalFichaTour}
        />
      ) : null}
      <PageBreadcrumb
        items={buildBreadcrumbItems(
          props.id,
          animal.identificacao,
          activeTab
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)] gap-6 items-start">
        <aside className="min-w-0 lg:sticky lg:top-[calc(3.5rem+1rem)] lg:self-start">
          <AnimalFichaSidebar
            animal={animal}
            contexto={props.contexto}
            fazenda={props.fazenda}
            foraDoRebanho={props.foraDoRebanho}
            canManageAnimal={props.canManageAnimal}
          />
        </aside>

        <main className="min-w-0">
          <AnimalFichaTabs {...props} animal={animal} />
        </main>
      </div>
    </PageContainer>
  );
}

export function AnimalFichaErrorState({
  message,
  backHref = "/animais",
  backLabel = "Voltar aos animais",
}: {
  message: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <PageContainer variant="wide">
      <p className="text-destructive">{message}</p>
      <Link
        href={backHref}
        className="inline-flex min-h-[44px] items-center text-sm text-primary hover:underline mt-2"
      >
        ← {backLabel}
      </Link>
    </PageContainer>
  );
}
