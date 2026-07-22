"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { OrdenhaSessionView } from "@/components/producao/OrdenhaSessionView";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useMinhasFazendas } from "@/hooks/useMinhasFazendas";
import { FazendaSelector } from "@/components/fazendas/FazendaSelector";
import { EmptyState } from "@/components/ui/empty-state";
import { Building2 } from "lucide-react";

function OrdenhaContent() {
  const { fazendaAtiva, isReady } = useFazendaAtiva();
  const { fazendas, isLoading: loadingFazendas } = useMinhasFazendas();

  if (!isReady || loadingFazendas) {
    return (
      <p className="text-muted-foreground" aria-live="polite">
        Carregando…
      </p>
    );
  }

  if (!fazendaAtiva) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={Building2}
          title="Selecione uma fazenda"
          description="Escolha a exploração no seletor para iniciar a ordenha."
        />
        {(fazendas?.length ?? 0) > 1 ? (
          <div className="max-w-sm">
            <FazendaSelector density="drawer" stayOnPage />
          </div>
        ) : null}
      </div>
    );
  }

  return <OrdenhaSessionView fazendaId={fazendaAtiva.id} />;
}

export default function OrdenhaPage() {
  return (
    <ProtectedRoute>
      <PageContainer variant="narrow">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <BackLink href="/producao" />
          <Link
            href="/producao/novo"
            className="text-sm text-content-secondary underline-offset-4 hover:underline min-h-[44px] inline-flex items-center"
          >
            Registo avulso
          </Link>
        </div>
        <h1 className="mb-4 text-xl font-semibold text-content-primary">
          Modo ordenha
        </h1>
        <OrdenhaContent />
      </PageContainer>
    </ProtectedRoute>
  );
}
