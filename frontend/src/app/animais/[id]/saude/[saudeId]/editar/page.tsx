"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { AnimalSaudeForm } from "@/components/animais/AnimalSaudeForm";
import { canEditarRegistroSaude } from "@/config/appAccess";
import { useAuth } from "@/contexts/AuthContext";
import { get as getAnimal, isAnimalForaDoRebanho } from "@/services/animais";
import {
  animalSaudeDetailQueryKey,
  getById,
} from "@/services/animalSaude";
import { getApiErrorMessage } from "@/lib/errors";

function EditarContent() {
  const params = useParams();
  const animalId = Number(params.id);
  const saudeId = Number(params.saudeId);
  const { user } = useAuth();

  const { data: animal, isLoading: loadingAnimal } = useQuery({
    queryKey: ["animais", animalId],
    queryFn: () => getAnimal(animalId),
    enabled: !Number.isNaN(animalId) && animalId > 0,
  });

  const {
    data: registro,
    isLoading: loadingRegistro,
    error: registroError,
  } = useQuery({
    queryKey: animalSaudeDetailQueryKey(animalId, saudeId),
    queryFn: () => getById(animalId, saudeId),
    enabled:
      !Number.isNaN(animalId) &&
      animalId > 0 &&
      !Number.isNaN(saudeId) &&
      saudeId > 0,
  });

  if (Number.isNaN(animalId) || Number.isNaN(saudeId)) {
    return (
      <PageContainer variant="narrow">
        <p className="text-destructive">ID inválido.</p>
        <BackLink href="/animais">Voltar</BackLink>
      </PageContainer>
    );
  }

  if (!canEditarRegistroSaude(user?.perfil)) {
    return (
      <PageContainer variant="narrow">
        <BackLink href={`/animais/${animalId}/saude`}>Voltar</BackLink>
        <p className="text-muted-foreground mt-4">
          O seu perfil não pode editar registos de saúde.
        </p>
      </PageContainer>
    );
  }

  if (loadingAnimal || loadingRegistro) {
    return (
      <PageContainer variant="narrow">
        <p className="text-muted-foreground">Carregando…</p>
      </PageContainer>
    );
  }

  if (!animal) {
    return (
      <PageContainer variant="narrow">
        <p className="text-destructive">Animal não encontrado.</p>
        <BackLink href="/animais">Voltar</BackLink>
      </PageContainer>
    );
  }

  if (registroError || !registro) {
    return (
      <PageContainer variant="narrow">
        <BackLink href={`/animais/${animalId}/saude`}>Voltar</BackLink>
        <p className="text-destructive mt-4">
          {getApiErrorMessage(registroError, "Registo não encontrado.")}
        </p>
      </PageContainer>
    );
  }

  if (isAnimalForaDoRebanho(animal)) {
    return (
      <PageContainer variant="narrow">
        <BackLink href={`/animais/${animalId}/saude`}>Voltar</BackLink>
        <p className="text-muted-foreground mt-4">
          Animal fora do rebanho — edição de saúde indisponível.
        </p>
      </PageContainer>
    );
  }

  return (
    <AnimalSaudeForm
      key={registro.id}
      animalId={animalId}
      mode="edit"
      initial={registro}
      saudeId={saudeId}
    />
  );
}

export default function EditarSaudePage() {
  return (
    <ProtectedRoute>
      <EditarContent />
    </ProtectedRoute>
  );
}
