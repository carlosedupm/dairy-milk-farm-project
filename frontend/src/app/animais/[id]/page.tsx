"use client";

import { Suspense } from "react";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  AnimalFichaErrorState,
  AnimalFichaShell,
} from "@/components/animais/ficha/AnimalFichaShell";
import { useAnimalFichaPage } from "@/hooks/useAnimalFichaPage";

function AnimalDetailContent() {
  const ficha = useAnimalFichaPage();

  if (ficha.idInvalid) {
    return (
      <AnimalFichaErrorState message="ID inválido." backLabel="Voltar" />
    );
  }

  if (ficha.isLoading || (!ficha.error && !ficha.animal)) {
    return (
      <PageContainer variant="wide">
        <p className="text-muted-foreground">Carregando…</p>
      </PageContainer>
    );
  }

  if (ficha.error || !ficha.animal) {
    return (
      <AnimalFichaErrorState message="Animal não encontrado." backLabel="Voltar" />
    );
  }

  return <AnimalFichaShell {...ficha} animal={ficha.animal} />;
}

export default function AnimalDetailPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <PageContainer variant="wide">
            <p className="text-muted-foreground">Carregando…</p>
          </PageContainer>
        }
      >
        <AnimalDetailContent />
      </Suspense>
    </ProtectedRoute>
  );
}
