"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getArea } from "@/services/agricultura";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackLink } from "@/components/layout/BackLink";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MapPin, Pencil } from "lucide-react";

function AreaDetailContent() {
  const params = useParams<{ id?: string }>();
  const id = params?.id ? parseInt(String(params.id), 10) : NaN;

  const { data: area, isLoading, error } = useQuery({
    queryKey: ["areas", id],
    queryFn: () => getArea(id),
    enabled: !Number.isNaN(id),
  });

  if (!params?.id) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/agricultura/areas">Voltar</BackLink>
        <p className="mt-4 text-muted-foreground">Carregando…</p>
      </PageContainer>
    );
  }

  if (Number.isNaN(id) || id <= 0) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/agricultura/areas">Voltar</BackLink>
        <p className="mt-4 text-destructive">ID inválido.</p>
      </PageContainer>
    );
  }

  if (isLoading || (!error && !area)) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/agricultura/areas">Voltar</BackLink>
        <p className="mt-4 text-muted-foreground">Carregando…</p>
      </PageContainer>
    );
  }

  if (error || !area) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/agricultura/areas">Voltar</BackLink>
        <p className="mt-4 text-destructive">Área não encontrada.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="narrow">
      <div className="mb-4">
        <BackLink href="/agricultura/areas">Voltar às áreas</BackLink>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            {area.nome}
          </CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href={`/agricultura/areas/${area.id}/editar`}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-2">
            <div>
              <dt className="text-sm text-muted-foreground">Hectares</dt>
              <dd>{area.hectares} ha</dd>
            </div>
            {area.descricao && (
              <div>
                <dt className="text-sm text-muted-foreground">Descrição</dt>
                <dd>{area.descricao}</dd>
              </div>
            )}
          </dl>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/agricultura/areas/${area.id}/analises-solo`}>Análises de solo</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/agricultura/areas/${area.id}/safras/${new Date().getFullYear()}`}>Safras / Culturas</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default function AreaDetailPage() {
  return (
    <ProtectedRoute>
      <AreaDetailContent />
    </ProtectedRoute>
  );
}
