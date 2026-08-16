"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { AnimalHormonioLactacaoForm } from "@/components/animais/AnimalHormonioLactacaoForm";
import { animalFichaHormonioLactacaoTabHref } from "@/components/animais/ficha/animalFichaTabs";
import { get as getAnimal, isAnimalForaDoRebanho } from "@/services/animais";
import { hormonioLactacaoReturnHrefFromQuery } from "@/services/animalHormoniosLactacao";

function NovoContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const animalId = Number(params.id);
  const returnHref = hormonioLactacaoReturnHrefFromQuery(
    searchParams.get("from"),
  );

  const { data: animal, isLoading, error } = useQuery({
    queryKey: ["animais", animalId],
    queryFn: () => getAnimal(animalId),
    enabled: !Number.isNaN(animalId) && animalId > 0,
  });

  if (Number.isNaN(animalId) || animalId <= 0) {
    return (
      <PageContainer variant="narrow">
        <p className="text-destructive">ID inválido.</p>
        <BackLink href="/animais">Voltar</BackLink>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer variant="narrow">
        <p className="text-muted-foreground">Carregando…</p>
      </PageContainer>
    );
  }

  if (error || !animal) {
    return (
      <PageContainer variant="narrow">
        <p className="text-destructive">Animal não encontrado.</p>
        <BackLink href="/animais">Voltar</BackLink>
      </PageContainer>
    );
  }

  if (isAnimalForaDoRebanho(animal)) {
    return (
      <PageContainer variant="narrow">
        <BackLink
          href={returnHref ?? animalFichaHormonioLactacaoTabHref(animalId)}
        >
          Voltar
        </BackLink>
        <p className="text-muted-foreground mt-4">
          Não é possível registrar hormônio para animal fora do rebanho.
        </p>
      </PageContainer>
    );
  }

  return (
    <AnimalHormonioLactacaoForm
      animalId={animalId}
      fazendaId={animal.fazenda_id}
      mode="create"
      returnHref={returnHref}
    />
  );
}

export default function NovaHormonioPage() {
  return (
    <ProtectedRoute>
      <NovoContent />
    </ProtectedRoute>
  );
}
