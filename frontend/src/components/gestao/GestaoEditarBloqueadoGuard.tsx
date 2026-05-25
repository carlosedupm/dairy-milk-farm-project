"use client";

import type { ReactNode } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoRegistroBaixadoAlert } from "@/components/gestao/GestaoRegistroBaixadoAlert";
import { isGestaoRegistroAnimalBaixado } from "@/components/gestao/gestaoRebanhoUtils";
import { useGestaoAnimaisByIdMap } from "@/components/gestao/useAnimaisMap";

type Props = {
  animalId: number;
  fazendaId: number;
  backHref: string;
  children: ReactNode;
};

/** Impede edição de registos do ciclo quando a matriz/fêmea está baixada (BR-BAIXA-010). */
export function GestaoEditarBloqueadoGuard({
  animalId,
  fazendaId,
  backHref,
  children,
}: Props) {
  const { animaisById, isResolved } = useGestaoAnimaisByIdMap(fazendaId, [
    animalId,
  ]);

  if (!isResolved) {
    return (
      <PageContainer variant="narrow">
        <BackLink href={backHref}>Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Carregando…</p>
      </PageContainer>
    );
  }

  if (isGestaoRegistroAnimalBaixado(animalId, animaisById)) {
    return (
      <PageContainer variant="narrow">
        <BackLink href={backHref}>Voltar</BackLink>
        <div className="mt-4 space-y-4">
          <GestaoRegistroBaixadoAlert
            animalId={animalId}
            animaisById={animaisById}
          />
        </div>
      </PageContainer>
    );
  }

  return <>{children}</>;
}
