"use client";

import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useQuery } from "@tanstack/react-query";
import { listByFazenda } from "@/services/gestacoes";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

function Content() {
  const { fazendaAtiva } = useFazendaAtiva();
  const fazendaId = fazendaAtiva?.id ?? 0;

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["gestacoes", fazendaId],
    queryFn: () => listByFazenda(fazendaId),
    enabled: fazendaId > 0,
  });

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="default">
        <BackLink href="/gestao">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Selecione uma fazenda.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="default">
      <BackLink href="/gestao">Voltar à Gestão</BackLink>
      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Gestações – {fazendaAtiva.nome}</CardTitle>
  
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Carregando…</p>}
          {error && <p className="text-destructive">Erro ao carregar.</p>}
          {!isLoading && !error && items.length === 0 && (
            <p className="text-muted-foreground">Nenhum registro.</p>
          )}
          {!isLoading && !error && items.length > 0 && (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between border-b pb-2">
                  Animal {item.animal_id} • {item.status} • {item.data_confirmacao?.slice(0,10) ?? "-"}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <Content />
    </ProtectedRoute>
  );
}
