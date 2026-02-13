"use client";

import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useQuery } from "@tanstack/react-query";
import { listByFazenda } from "@/services/lotes";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

function LotesContent() {
  const { fazendaAtiva } = useFazendaAtiva();
  const fazendaId = fazendaAtiva?.id ?? 0;

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["lotes", fazendaId],
    queryFn: () => listByFazenda(fazendaId),
    enabled: fazendaId > 0,
  });

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="default">
        <p className="text-muted-foreground">Selecione uma fazenda para ver os lotes.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="default">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Lotes – {fazendaAtiva.nome}</CardTitle>
          <Button asChild>
            <Link href="/lotes/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo Lote
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Carregando…</p>}
          {error && <p className="text-destructive">Erro ao carregar lotes.</p>}
          {!isLoading && !error && items.length === 0 && (
            <p className="text-muted-foreground">Nenhum lote cadastrado.</p>
          )}
          {!isLoading && !error && items.length > 0 && (
            <ul className="space-y-2">
              {items.map((l) => (
                <li key={l.id} className="flex items-center justify-between border-b pb-2">
                  <span className="font-medium">{l.nome}</span>
                  <span className="text-muted-foreground text-sm">{l.tipo ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default function LotesPage() {
  return (
    <ProtectedRoute>
      <LotesContent />
    </ProtectedRoute>
  );
}
