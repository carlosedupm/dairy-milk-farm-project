"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { listByFazenda } from "@/services/animais";
import { get as getFazenda } from "@/services/fazendas";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { AnimalTable } from "@/components/animais/AnimalTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

function FazendaAnimaisContent() {
  const params = useParams();
  const fazendaId = Number(params.id);

  const {
    data: fazenda,
    isLoading: loadingFazenda,
    error: errorFazenda,
  } = useQuery({
    queryKey: ["fazendas", fazendaId],
    queryFn: () => getFazenda(fazendaId),
    enabled: !Number.isNaN(fazendaId),
  });

  const {
    data: items = [],
    isLoading: loadingAnimais,
    error: errorAnimais,
  } = useQuery({
    queryKey: ["fazendas", fazendaId, "animais"],
    queryFn: () => listByFazenda(fazendaId),
    enabled: !Number.isNaN(fazendaId),
  });

  const isLoading = loadingFazenda || loadingAnimais;
  const error = errorFazenda || errorAnimais;

  if (Number.isNaN(fazendaId)) {
    return (
      <PageContainer variant="default">
        <p className="text-destructive">ID da fazenda inválido.</p>
        <BackLink href="/fazendas">Voltar</BackLink>
      </PageContainer>
    );
  }

  if (errorFazenda || !fazenda) {
    return (
      <PageContainer variant="default">
        <p className="text-destructive">Fazenda não encontrada.</p>
        <BackLink href="/fazendas">Voltar</BackLink>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="default">
      <div className="mb-4">
        <BackLink href="/fazendas">Voltar às fazendas</BackLink>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Animais da fazenda {fazenda.nome}</CardTitle>
          <Button asChild>
            <Link href={`/animais/novo?fazenda_id=${fazendaId}`}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Animal
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Carregando…</p>}
          {errorAnimais && (
            <p className="text-destructive">
              Erro ao carregar animais. Tente novamente.
            </p>
          )}
          {!isLoading && !errorAnimais && (
            <AnimalTable items={items} showFazenda={false} />
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default function FazendaAnimaisPage() {
  return (
    <ProtectedRoute>
      <FazendaAnimaisContent />
    </ProtectedRoute>
  );
}
