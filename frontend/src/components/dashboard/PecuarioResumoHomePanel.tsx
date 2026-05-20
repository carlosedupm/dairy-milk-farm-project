"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { getResumoPecuario } from "@/services/resumoPecuario";
import { formatDatePtBr } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Baby, Droplets, AlertTriangle, Heart } from "lucide-react";

export function PecuarioResumoHomePanel() {
  const { fazendaAtiva } = useFazendaAtiva();
  const fazendaId = fazendaAtiva?.id ?? 0;

  const { data, isLoading, error } = useQuery({
    queryKey: ["resumo-pecuario", fazendaId],
    queryFn: () => getResumoPecuario(fazendaId, 30),
    enabled: fazendaId > 0,
  });

  if (!fazendaAtiva) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Rebanho — {fazendaAtiva.nome}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 min-w-0">
        {isLoading && (
          <p className="text-sm text-muted-foreground">Carregando resumo…</p>
        )}
        {error && (
          <p className="text-sm text-destructive">
            {getApiErrorMessage(error, "Erro ao carregar resumo pecuário.")}
          </p>
        )}
        {data && (
          <>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="rounded-lg border p-3 min-w-0">
                <dt className="flex items-center gap-1 text-muted-foreground">
                  <Heart className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Prenhes
                </dt>
                <dd className="text-xl font-semibold mt-1">{data.prenhes_total}</dd>
              </div>
              <div className="rounded-lg border p-3 min-w-0">
                <dt className="flex items-center gap-1 text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Restrições leite
                </dt>
                <dd className="text-xl font-semibold mt-1">
                  {data.restricoes_ativas_total}
                </dd>
              </div>
              <div className="rounded-lg border p-3 min-w-0">
                <dt className="flex items-center gap-1 text-muted-foreground">
                  <Droplets className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Leite hoje
                </dt>
                <dd className="text-xl font-semibold mt-1">
                  {data.producao_hoje_litros.toFixed(1)} L
                </dd>
              </div>
              <div className="rounded-lg border p-3 min-w-0">
                <dt className="text-muted-foreground">7 dias</dt>
                <dd className="text-xl font-semibold mt-1">
                  {data.producao_semana_litros.toFixed(1)} L
                </dd>
              </div>
            </dl>

            {data.partos_previstos.length > 0 ? (
              <div className="min-w-0">
                <h3 className="text-sm font-medium flex items-center gap-1 mb-2">
                  <Baby className="h-4 w-4 shrink-0" aria-hidden />
                  Partos previstos (30 dias)
                </h3>
                <ul className="space-y-1 text-sm max-h-40 overflow-y-auto">
                  {data.partos_previstos.map((p) => (
                    <li key={p.gestacao_id} className="min-w-0">
                      <Link
                        href={`/animais/${p.animal_id}`}
                        className="text-primary hover:underline break-words"
                      >
                        {p.identificacao}
                      </Link>
                      {p.data_prevista_parto ? (
                        <span className="text-muted-foreground">
                          {" "}
                          — {formatDatePtBr(p.data_prevista_parto)}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum parto previsto nos próximos 30 dias.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
