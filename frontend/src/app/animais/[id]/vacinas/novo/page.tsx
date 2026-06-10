"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { AnimalVacinaForm } from "@/components/animais/AnimalVacinaForm";
import { animalFichaVacinasTabHref } from "@/components/animais/ficha/animalFichaTabs";
import { get as getAnimal, isAnimalForaDoRebanho } from "@/services/animais";

function NovoContent() {
  const params = useParams();
  const animalId = Number(params.id);

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
        <BackLink href={animalFichaVacinasTabHref(animalId)}>Voltar</BackLink>
        <p className="text-muted-foreground mt-4">
          Não é possível registrar vacinas para animal fora do rebanho.
        </p>
      </PageContainer>
    );
  }

  return <AnimalVacinaForm animalId={animalId} mode="create" />;
}

export default function NovaVacinaPage() {
  return (
    <ProtectedRoute>
      <NovoContent />
    </ProtectedRoute>
  );
}
