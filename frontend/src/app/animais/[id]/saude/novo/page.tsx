"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { AnimalSaudeForm } from "@/components/animais/AnimalSaudeForm";
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
        <BackLink href={`/animais/${animalId}/saude`}>Voltar</BackLink>
        <p className="text-muted-foreground mt-4">
          Não é possível registar saúde para animal fora do rebanho.
        </p>
      </PageContainer>
    );
  }

  return <AnimalSaudeForm animalId={animalId} mode="create" />;
}

export default function NovoSaudePage() {
  return (
    <ProtectedRoute>
      <NovoContent />
    </ProtectedRoute>
  );
}
