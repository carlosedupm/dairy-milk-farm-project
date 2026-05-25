"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { RegistrarBaixaForm } from "@/components/animais/RegistrarBaixaForm";
import { useFazendaAtiva } from "@/contexts/FazendaContext";

function BaixaContent() {
  const searchParams = useSearchParams();
  const animalId = searchParams.get("animal_id") ?? "";
  const { fazendaAtiva } = useFazendaAtiva();

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="narrow">
        <p className="text-muted-foreground mt-4">
          Selecione uma fazenda no menu para registrar a baixa.
        </p>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="narrow">
      <RegistrarBaixaForm defaultAnimalId={animalId} />
    </PageContainer>
  );
}

export default function RegistrarBaixaPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <PageContainer variant="narrow">
            <p className="text-muted-foreground">A carregar…</p>
          </PageContainer>
        }
      >
        <BaixaContent />
      </Suspense>
    </ProtectedRoute>
  );
}
