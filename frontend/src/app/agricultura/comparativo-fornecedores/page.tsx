"use client";

import { useState } from "react";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useQuery } from "@tanstack/react-query";
import { getComparativoFornecedores } from "@/services/agricultura";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackLink } from "@/components/layout/BackLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, Truck } from "lucide-react";
import { getApiErrorMessage } from "@/lib/errors";

function ComparativoContent() {
  const { fazendaAtiva } = useFazendaAtiva();
  const [ano, setAno] = useState(String(new Date().getFullYear()));

  const anoNum = parseInt(ano, 10);
  const { data: list = [], isLoading, error } = useQuery({
    queryKey: ["comparativo-fornecedores", fazendaAtiva?.id, anoNum],
    queryFn: () => getComparativoFornecedores(fazendaAtiva!.id, anoNum),
    enabled: !!fazendaAtiva?.id && !isNaN(anoNum),
  });

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="default">
        <BackLink href="/agricultura">Voltar</BackLink>
        <p className="mt-4 text-muted-foreground">Selecione uma fazenda para ver o comparativo.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="default">
      <div className="mb-4">
        <BackLink href="/agricultura">Voltar</BackLink>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Comparativo de fornecedores – Safra {ano}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Compare custos (insumos comprados) e receitas (vendas/entregas) por fornecedor para decidir onde comprar insumos e onde entregar grãos na próxima safra.
          </p>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label htmlFor="ano">Ano da safra</Label>
              <Input
                id="ano"
                type="number"
                min="2020"
                max="2030"
                value={ano}
                onChange={(e) => setAno(e.target.value)}
                className="w-24"
              />
            </div>
          </div>
          {isLoading && <p className="text-muted-foreground">Carregando…</p>}
          {error && (
            <p className="text-destructive">
              {getApiErrorMessage(error, "Erro ao carregar comparativo.")}
            </p>
          )}
          {!isLoading && !error && list.length === 0 && (
            <p className="text-muted-foreground">Nenhum dado de custos ou receitas por fornecedor nesta safra.</p>
          )}
          {!isLoading && !error && list.length > 0 && (
            <div className="space-y-3">
              {list.map((f) => (
                <Card key={f.fornecedor_id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Truck className="h-4 w-4" />
                      {f.nome_fornecedor}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Custos (insumos comprados)</p>
                      <p className="text-lg font-semibold">{formatCurrency(f.total_custos)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Receitas (vendas/entregas)</p>
                      <p className="text-lg font-semibold text-green-600">{formatCurrency(f.total_receitas)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default function ComparativoPage() {
  return (
    <ProtectedRoute>
      <ComparativoContent />
    </ProtectedRoute>
  );
}
