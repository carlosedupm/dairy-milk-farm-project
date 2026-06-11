"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { AnimalHormonioLactacaoForm } from "@/components/animais/AnimalHormonioLactacaoForm";
import { animalFichaHormonioLactacaoTabHref } from "@/components/animais/ficha/animalFichaTabs";
import { get as getAnimal, isAnimalForaDoRebanho } from "@/services/animais";
import { getById } from "@/services/animalHormoniosLactacao";

function EditarContent() {
  const params = useParams();
  const animalId = Number(params.id);
  const aplicacaoId = Number(params.aplicacaoId);

  const { data: animal, isLoading: loadingAnimal } = useQuery({
    queryKey: ["animais", animalId],
    queryFn: () => getAnimal(animalId),
    enabled: !Number.isNaN(animalId) && animalId > 0,
  });

  const { data: aplicacao, isLoading: loadingApp, error } = useQuery({
    queryKey: ["hormonios-lactacao", animalId, aplicacaoId],
    queryFn: () => getById(animalId, aplicacaoId),
    enabled:
      !Number.isNaN(animalId) &&
      animalId > 0 &&
      !Number.isNaN(aplicacaoId) &&
      aplicacaoId > 0,
  });

  if (
    Number.isNaN(animalId) ||
    animalId <= 0 ||
    Number.isNaN(aplicacaoId) ||
    aplicacaoId <= 0
  ) {
    return (
      <PageContainer variant="narrow">
        <p className="text-destructive">Parâmetros inválidos.</p>
        <BackLink href="/animais">Voltar</BackLink>
      </PageContainer>
    );
  }

  if (loadingAnimal || loadingApp) {
    return (
      <PageContainer variant="narrow">
        <p className="text-muted-foreground">Carregando…</p>
      </PageContainer>
    );
  }

  if (!animal || error || !aplicacao) {
    return (
      <PageContainer variant="narrow">
        <p className="text-destructive">Registro não encontrado.</p>
        <BackLink href={animalFichaHormonioLactacaoTabHref(animalId)}>
          Voltar
        </BackLink>
      </PageContainer>
    );
  }

  if (isAnimalForaDoRebanho(animal)) {
    return (
      <PageContainer variant="narrow">
        <BackLink href={animalFichaHormonioLactacaoTabHref(animalId)}>
          Voltar
        </BackLink>
        <p className="text-muted-foreground mt-4">
          Animal fora do rebanho.
        </p>
      </PageContainer>
    );
  }

  return (
    <AnimalHormonioLactacaoForm
      animalId={animalId}
      fazendaId={animal.fazenda_id}
      mode="edit"
      initial={aplicacao}
      aplicacaoId={aplicacaoId}
    />
  );
}

export default function EditarHormonioPage() {
  return (
    <ProtectedRoute>
      <EditarContent />
    </ProtectedRoute>
  );
}
