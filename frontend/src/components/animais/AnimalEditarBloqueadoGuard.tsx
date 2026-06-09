"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Animal } from "@/services/animais";
import { isAnimalForaDoRebanho } from "@/services/animais";
import { AnimalBaixadoBadge } from "@/components/animais/AnimalBaixadoBadge";
import { ANIMAL_BAIXADO_EDITAR_BLOQUEADO_MSG } from "@/components/animais/animalRebanhoUtils";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";

type Props = {
  animal: Animal;
  backHref: string;
  children: ReactNode;
};

/** Impede edição de cadastro quando o animal está baixado (BR-BAIXA-011). */
export function AnimalEditarBloqueadoGuard({
  animal,
  backHref,
  children,
}: Props) {
  if (!isAnimalForaDoRebanho(animal)) {
    return <>{children}</>;
  }

  return (
    <PageContainer variant="narrow">
      <BackLink href={backHref}>Voltar</BackLink>
      <div
        role="status"
        className="mt-4 rounded-md border border-feedback-warning/50 bg-feedback-warning/10 px-4 py-3 text-sm text-feedback-warning-foreground space-y-3"
      >
        <p className="font-medium text-base text-foreground inline-flex flex-wrap items-center gap-2">
          <span>{animal.identificacao}</span>
          <AnimalBaixadoBadge variant="prominent" />
        </p>
        <p>{ANIMAL_BAIXADO_EDITAR_BLOQUEADO_MSG}</p>
        <Link
          href={`/animais/${animal.id}`}
          className="font-medium text-primary underline-offset-4 hover:underline inline-flex min-h-[44px] items-center"
        >
          Abrir ficha do animal
        </Link>
      </div>
    </PageContainer>
  );
}
