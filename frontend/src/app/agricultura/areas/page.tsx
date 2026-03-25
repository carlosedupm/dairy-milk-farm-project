"use client";

import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useQuery } from "@tanstack/react-query";
import { listAreasByFazenda } from "@/services/agricultura";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BackLink } from "@/components/layout/BackLink";
import { Plus, MapPin } from "lucide-react";

function AreasContent() {
  const { fazendaAtiva } = useFazendaAtiva();
  const fazendaId = fazendaAtiva?.id ?? 0;

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["areas", fazendaId],
    queryFn: () => listAreasByFazenda(fazendaId),
    enabled: fazendaId > 0,
  });

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="default">
        <BackLink href="/agricultura">Voltar</BackLink>
        <p className="mt-4 text-muted-foreground">Selecione uma fazenda para ver as áreas.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="default">
      <div className="mb-4">
        <BackLink href="/agricultura">Voltar</BackLink>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Áreas / Talhões – {fazendaAtiva.nome}
          </CardTitle>
          <Button asChild>
            <Link href="/agricultura/areas/nova">
              <Plus className="mr-2 h-4 w-4" />
              Nova Área
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Carregando…</p>}
          {error && <p className="text-destructive">Erro ao carregar áreas.</p>}
          {!isLoading && !error && items.length === 0 && (
            <p className="text-muted-foreground">Nenhuma área cadastrada.</p>
          )}
          {!isLoading && !error && items.length > 0 && (
            <ul className="space-y-2">
              {items.map((a) => {
                const areaId = a?.id != null ? Number(a.id) : NaN;
                const hasValidId = !Number.isNaN(areaId) && areaId > 0;
                return (
                  <li key={a.id} className="flex items-center justify-between border-b pb-2">
                    <span className="font-medium">{a.nome}</span>
                    <span className="text-muted-foreground text-sm">{a.hectares} ha</span>
                    {hasValidId ? (
                      <div className="flex gap-2">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/agricultura/areas/${areaId}`}>Ver</Link>
                        </Button>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/agricultura/areas/${areaId}/editar`}>Editar</Link>
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default function AreasPage() {
  return (
    <ProtectedRoute>
      <AreasContent />
    </ProtectedRoute>
  );
}
