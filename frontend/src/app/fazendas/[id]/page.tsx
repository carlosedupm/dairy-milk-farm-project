"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { get as getFazenda } from "@/services/fazendas";
import { RequireAdminRoute } from "@/components/layout/RequireAdminRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Edit, List, Droplets } from "lucide-react";

function FazendaDetailContent() {
  const params = useParams();
  const id = Number(params.id);

  const {
    data: fazenda,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["fazendas", id],
    queryFn: () => getFazenda(id),
    enabled: !Number.isNaN(id),
  });

  const formatDate = (date?: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  if (Number.isNaN(id)) {
    return (
      <PageContainer variant="narrow">
        <p className="text-destructive">ID inválido.</p>
        <BackLink href="/fazendas">Voltar</BackLink>
      </PageContainer>
    );
  }

  if (isLoading || (!error && !fazenda)) {
    return (
      <PageContainer variant="narrow">
        <p className="text-muted-foreground">Carregando…</p>
      </PageContainer>
    );
  }

  if (error || !fazenda) {
    return (
      <PageContainer variant="narrow">
        <p className="text-destructive">Fazenda não encontrada.</p>
        <BackLink href="/fazendas">Voltar</BackLink>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="narrow">
      <div className="mb-4">
        <BackLink href="/fazendas">Voltar às fazendas</BackLink>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-xl">{fazenda.nome}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Localização
                </dt>
                <dd className="mt-0.5">{fazenda.localizacao ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Fundação
                </dt>
                <dd className="mt-0.5">{formatDate(fazenda.fundacao)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Quantidade de animais
                </dt>
                <dd className="mt-0.5">{fazenda.quantidade_vacas}</dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" size="default" asChild>
                <Link href={`/fazendas/${id}/editar`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </Button>
              <Button variant="outline" size="default" asChild>
                <Link href={`/fazendas/${id}/animais`}>
                  <List className="mr-2 h-4 w-4" />
                  Ver animais
                </Link>
              </Button>
              <Button variant="outline" size="default" asChild>
                <Link href={`/fazendas/${id}/producao`}>
                  <Droplets className="mr-2 h-4 w-4" />
                  Ver produção
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

export default function FazendaDetailPage() {
  return (
    <RequireAdminRoute>
      <FazendaDetailContent />
    </RequireAdminRoute>
  );
}
