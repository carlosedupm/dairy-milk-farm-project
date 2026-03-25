"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  getSafraCultura,
  listCustosBySafraCultura,
  listProducoesBySafraCultura,
  listReceitasBySafraCultura,
} from "@/services/agricultura";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackLink } from "@/components/layout/BackLink";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wheat, DollarSign, Package, TrendingUp } from "lucide-react";

function SafraCulturaDetailContent() {
  const params = useParams();
  const id = Number(params.id);

  const { data: sc, isLoading: scLoading, error: scError } = useQuery({
    queryKey: ["safras-culturas", id],
    queryFn: () => getSafraCultura(id),
    enabled: !Number.isNaN(id),
  });

  const { data: custos = [] } = useQuery({
    queryKey: ["custos", id],
    queryFn: () => listCustosBySafraCultura(id),
    enabled: !Number.isNaN(id) && !!sc,
  });

  const { data: producoes = [] } = useQuery({
    queryKey: ["producoes", id],
    queryFn: () => listProducoesBySafraCultura(id),
    enabled: !Number.isNaN(id) && !!sc,
  });

  const { data: receitas = [] } = useQuery({
    queryKey: ["receitas", id],
    queryFn: () => listReceitasBySafraCultura(id),
    enabled: !Number.isNaN(id) && !!sc,
  });

  const totalCustos = custos.reduce((s, c) => s + c.valor, 0);
  const totalReceitas = receitas.reduce((s, r) => s + r.valor, 0);
  const resultado = totalReceitas - totalCustos;
  const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  if (Number.isNaN(id)) {
    return (
      <PageContainer variant="default">
        <BackLink href="/agricultura/areas">Voltar</BackLink>
        <p className="mt-4 text-destructive">ID inválido.</p>
      </PageContainer>
    );
  }

  if (scLoading || (!scError && !sc)) {
    return (
      <PageContainer variant="default">
        <BackLink href="/agricultura/areas">Voltar</BackLink>
        <p className="mt-4 text-muted-foreground">Carregando…</p>
      </PageContainer>
    );
  }

  if (scError || !sc) {
    return (
      <PageContainer variant="default">
        <BackLink href="/agricultura/areas">Voltar</BackLink>
        <p className="mt-4 text-destructive">Safra/cultura não encontrada.</p>
      </PageContainer>
    );
  }

  const plantioDate = sc.data_plantio ? new Date(sc.data_plantio).toLocaleDateString("pt-BR") : "—";
  const colheitaDate = sc.data_colheita ? new Date(sc.data_colheita).toLocaleDateString("pt-BR") : "—";

  return (
    <PageContainer variant="default">
      <div className="mb-4">
        <BackLink href={`/agricultura/areas/${sc.area_id}/safras/${sc.ano}`}>Voltar à safra {sc.ano}</BackLink>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wheat className="h-5 w-5" />
            {sc.cultura} – Safra {sc.ano}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Status</dt>
              <dd>{sc.status}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Data plantio</dt>
              <dd>{plantioDate}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Data colheita</dt>
              <dd>{colheitaDate}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total custos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{formatCurrency(totalCustos)}</p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href={`/agricultura/safras-culturas/${id}/custos/novo`}>Registrar custo</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total receitas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{formatCurrency(totalReceitas)}</p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href={`/agricultura/safras-culturas/${id}/receitas/nova`}>Registrar receita</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-xl font-semibold ${resultado >= 0 ? "text-green-600" : "text-destructive"}`}>
              {formatCurrency(resultado)}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href={`/agricultura/safras-culturas/${id}/producoes/nova`}>Registrar produção</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custos ({custos.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {custos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum custo registrado.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {custos.map((c) => (
                  <li key={c.id} className="flex justify-between border-b pb-2">
                    <span>{formatDate(c.data)} {c.tipo} {c.subcategoria ?? ""}</span>
                    <span>{formatCurrency(c.valor)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Produções ({producoes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {producoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma produção registrada.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {producoes.map((p) => (
                  <li key={p.id} className="flex justify-between border-b pb-2">
                    <span>{formatDate(p.data)} {p.destino}</span>
                    <span>{p.quantidade_kg} kg</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receitas ({receitas.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {receitas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma receita registrada.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {receitas.map((r) => (
                  <li key={r.id} className="flex justify-between border-b pb-2">
                    <span>{formatDate(r.data)}</span>
                    <span>{formatCurrency(r.valor)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

export default function SafraCulturaDetailPage() {
  return (
    <ProtectedRoute>
      <SafraCulturaDetailContent />
    </ProtectedRoute>
  );
}
