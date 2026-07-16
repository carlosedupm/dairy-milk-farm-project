"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { AnimalVacinaForm } from "@/components/animais/AnimalVacinaForm";
import { get as getAnimal, isAnimalForaDoRebanho } from "@/services/animais";
import {
  animalVacinaDetailQueryKey,
  getById,
} from "@/services/animalVacinas";
import { getApiErrorMessage } from "@/lib/errors";
import { animalFichaVacinasTabHref } from "@/components/animais/ficha/animalFichaTabs";

function EditarContent() {
  const params = useParams();
  const animalId = Number(params.id);
  const vacinaId = Number(params.vacinaId);

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
    queryKey: animalVacinaDetailQueryKey(animalId, vacinaId),
    queryFn: () => getById(animalId, vacinaId),
    enabled:
      !Number.isNaN(animalId) &&
      animalId > 0 &&
      !Number.isNaN(vacinaId) &&
      vacinaId > 0,
  });

  if (Number.isNaN(animalId) || Number.isNaN(vacinaId)) {
    return (
      <PageContainer variant="narrow">
        <p className="text-destructive">ID inválido.</p>
        <BackLink href="/animais">Voltar</BackLink>
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
        <BackLink href={animalFichaVacinasTabHref(animalId)}>Voltar</BackLink>
        <p className="text-destructive mt-4">
          {getApiErrorMessage(registroError, "Registro não encontrado.")}
        </p>
      </PageContainer>
    );
  }

  return (
    <AnimalVacinaForm
      key={registro.id}
      animalId={animalId}
      mode="edit"
      initial={registro}
      vacinaId={vacinaId}
      forceReadOnly={isAnimalForaDoRebanho(animal)}
    />
  );
}

export default function EditarVacinaPage() {
  return (
    <ProtectedRoute>
      <EditarContent />
    </ProtectedRoute>
  );
}
