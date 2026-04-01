"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getArea, listSafrasCulturasByAreaAndAno } from "@/services/agricultura";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackLink } from "@/components/layout/BackLink";
import Link from "next/link";
import { Plus, Wheat } from "lucide-react";
import { CreateSafraCulturaDialog } from "@/components/agricultura/CreateSafraCulturaDialog";
import { getApiErrorMessage } from "@/lib/errors";
import { formatDatePtBr } from "@/lib/format";

function SafrasContent() {
  const params = useParams<{ id?: string; ano?: string }>();
  const areaId = params?.id ? parseInt(String(params.id), 10) : NaN;
  const ano = params?.ano ? parseInt(String(params.ano), 10) : NaN;

  const { data: area } = useQuery({
    queryKey: ["areas", areaId],
    queryFn: () => getArea(areaId),
    enabled: !Number.isNaN(areaId),
  });

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["safras-culturas", areaId, ano],
    queryFn: () => listSafrasCulturasByAreaAndAno(areaId, ano),
    enabled: !Number.isNaN(areaId) && !Number.isNaN(ano),
  });

  const [createOpen, setCreateOpen] = useState(false);

  if (!params?.id || !params?.ano) {
    return (
      <PageContainer variant="default">
        <BackLink href="/agricultura/areas">Voltar</BackLink>
        <p className="mt-4 text-muted-foreground">Carregando…</p>
      </PageContainer>
    );
  }

  if (Number.isNaN(areaId) || areaId <= 0 || Number.isNaN(ano)) {
    return (
      <PageContainer variant="default">
        <BackLink href="/agricultura/areas">Voltar</BackLink>
        <p className="mt-4 text-destructive">Parâmetros inválidos.</p>
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
            <Wheat className="h-5 w-5" />
            Safra {ano} – {area?.nome ?? "Área"}
          </CardTitle>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova cultura
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Carregando…</p>}
          {error && (
            <p className="text-destructive">
              {getApiErrorMessage(error, "Erro ao carregar culturas.")}
            </p>
          )}
          {!isLoading && !error && items.length === 0 && (
            <p className="text-muted-foreground">Nenhuma cultura cadastrada nesta safra.</p>
          )}
          {!isLoading && !error && items.length > 0 && (
            <ul className="space-y-2">
              {items.map((sc) => (
                <li key={sc.id} className="flex items-center justify-between border-b pb-2">
                  <span className="font-medium">{sc.cultura}</span>
                  <span className="text-sm text-muted-foreground">{sc.status} | Plantio: {formatDatePtBr(sc.data_plantio)}</span>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/agricultura/safras-culturas/${sc.id}`}>Ver detalhes</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <CreateSafraCulturaDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        areaId={areaId}
        ano={ano}
        areaNome={area?.nome}
      />
    </PageContainer>
  );
}

export default function SafrasPage() {
  return (
    <ProtectedRoute>
      <SafrasContent />
    </ProtectedRoute>
  );
}
