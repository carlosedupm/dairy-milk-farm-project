"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getArea, listAnalisesSoloByArea } from "@/services/agricultura";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackLink } from "@/components/layout/BackLink";
import Link from "next/link";
import { Plus, TestTube } from "lucide-react";
import { getApiErrorMessage } from "@/lib/errors";
import { formatDatePtBr } from "@/lib/format";

function AnalisesSoloContent() {
  const params = useParams<{ id?: string }>();
  const areaId = params?.id ? parseInt(String(params.id), 10) : NaN;

  const { data: area, isLoading: areaLoading } = useQuery({
    queryKey: ["areas", areaId],
    queryFn: () => getArea(areaId),
    enabled: !Number.isNaN(areaId),
  });

  const { data: items = [], isLoading: listLoading, error } = useQuery({
    queryKey: ["analises-solo", areaId],
    queryFn: () => listAnalisesSoloByArea(areaId),
    enabled: !Number.isNaN(areaId),
  });

  const isLoading = areaLoading || listLoading;

  if (!params?.id) {
    return (
      <PageContainer variant="default">
        <BackLink href="/agricultura/areas">Voltar</BackLink>
        <p className="mt-4 text-muted-foreground">Carregando…</p>
      </PageContainer>
    );
  }

  if (Number.isNaN(areaId) || areaId <= 0) {
    return (
      <PageContainer variant="default">
        <BackLink href="/agricultura/areas">Voltar</BackLink>
        <p className="mt-4 text-destructive">ID inválido.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="default">
      <div className="mb-4">
        <BackLink href={`/agricultura/areas/${areaId}`}>Voltar à área</BackLink>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Análises de solo – {area?.nome ?? "Área"}
          </CardTitle>
          <Button asChild>
            <Link href={`/agricultura/areas/${areaId}/analises-solo/nova`}>
              <Plus className="mr-2 h-4 w-4" />
              Nova análise
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Carregando…</p>}
          {error && (
            <p className="text-destructive">
              {getApiErrorMessage(error, "Erro ao carregar análises.")}
            </p>
          )}
          {!isLoading && !error && items.length === 0 && (
            <p className="text-muted-foreground">Nenhuma análise de solo cadastrada.</p>
          )}
          {!isLoading && !error && items.length > 0 && (
            <ul className="space-y-3">
              {items.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                  <span className="font-medium">{formatDatePtBr(a.data_coleta)}</span>
                  <span className="text-sm text-muted-foreground">
                    pH {a.ph ?? "—"} | P {a.fosforo_p ?? "—"} | K {a.potassio_k ?? "—"} | MO {a.materia_organica ?? "—"}
                  </span>
                  {a.laboratorio && (
                    <span className="text-sm text-muted-foreground">{a.laboratorio}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default function AnalisesSoloPage() {
  return (
    <ProtectedRoute>
      <AnalisesSoloContent />
    </ProtectedRoute>
  );
}
