"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getResultadoFazendaAno } from "@/services/agricultura";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackLink } from "@/components/layout/BackLink";
import { BarChart3 } from "lucide-react";
import { getApiErrorMessage } from "@/lib/errors";

function ResultadoContent() {
  const params = useParams();
  const fazendaId = Number(params.fazendaId);
  const ano = Number(params.ano);

  const { data, isLoading, error } = useQuery({
    queryKey: ["resultado-agricola", fazendaId, ano],
    queryFn: () => getResultadoFazendaAno(fazendaId, ano),
    enabled: !Number.isNaN(fazendaId) && !Number.isNaN(ano),
  });

  if (Number.isNaN(fazendaId) || Number.isNaN(ano)) {
    return (
      <PageContainer variant="default">
        <BackLink href="/agricultura">Voltar</BackLink>
        <p className="mt-4 text-destructive">Parâmetros inválidos.</p>
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
            Resultado agrícola – Safra {ano}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Carregando…</p>}
          {error && (
            <p className="text-destructive">
              {getApiErrorMessage(error, "Erro ao carregar resultado.")}
            </p>
          )}
          {data && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Total custos</p>
                  <p className="text-xl font-semibold">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.total_custos)}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Total receitas</p>
                  <p className="text-xl font-semibold">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.total_receitas)}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Resultado</p>
                  <p className={`text-xl font-semibold ${data.resultado >= 0 ? "text-green-600" : "text-destructive"}`}>
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.resultado)}
                  </p>
                </div>
              </div>
              {data.por_area && data.por_area.length > 0 && (
                <div>
                  <h3 className="mb-2 font-medium">Por área</h3>
                  <ul className="space-y-2">
                    {data.por_area.map((r) => (
                      <li key={r.area_id} className="flex justify-between border-b pb-2 text-sm">
                        <span>Área ID {r.area_id}</span>
                        <span className={r.resultado >= 0 ? "text-green-600" : "text-destructive"}>
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(r.resultado)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default function ResultadoPage() {
  return (
    <ProtectedRoute>
      <ResultadoContent />
    </ProtectedRoute>
  );
}
