"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { getResumoPecuario } from "@/services/resumoPecuario";
import { formatDatePtBr } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/errors";
import { animalFichaCicloHref } from "@/lib/animalFichaLinks";
import {
  buildGestacoesPartos7dHref,
} from "@/lib/resumoPecuarioLinks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Baby, ClipboardList, Search, Stethoscope } from "lucide-react";

export function GestaoPendenciasCicloPanel() {
  const { fazendaAtiva } = useFazendaAtiva();
  const fazendaId = fazendaAtiva?.id ?? 0;

  const { data, isLoading, error } = useQuery({
    queryKey: ["resumo-pecuario", fazendaId, 7],
    queryFn: () => getResumoPecuario(fazendaId, 7),
    enabled: fazendaId > 0,
  });

  if (!fazendaAtiva) {
    return null;
  }

  const partos7d = data?.partos_previstos ?? [];
  const prenhes = data?.prenhes_total ?? 0;
  const lactacao = data?.lactacao_ativa_total ?? 0;

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-5 w-5 shrink-0" aria-hidden />
          Pendências do ciclo — {fazendaAtiva.nome}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 min-w-0 text-sm">
        {isLoading ? (
          <div className="space-y-2" aria-hidden>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-4 w-full max-w-xs rounded bg-muted animate-pulse" />
            ))}
          </div>
        ) : null}
        {error ? (
          <p className="text-destructive">
            {getApiErrorMessage(error, "Erro ao carregar pendências.")}
          </p>
        ) : null}
        {data ? (
          <>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              <span>
                <strong className="text-foreground font-medium">{prenhes}</strong>{" "}
                prenhes
              </span>
              <span>
                <strong className="text-foreground font-medium">{lactacao}</strong>{" "}
                em lactação
              </span>
              <span>
                <strong className="text-foreground font-medium">
                  {data.partos_proximos_7d_total}
                </strong>{" "}
                partos em 7 dias
              </span>
            </div>

            {partos7d.length > 0 ? (
              <div>
                <h3 className="font-medium flex items-center gap-1 mb-2">
                  <Baby className="h-4 w-4 shrink-0" aria-hidden />
                  Partos previstos (7 dias)
                </h3>
                <ul className="space-y-1 max-h-36 overflow-y-auto">
                  {partos7d.map((p) => (
                    <li key={p.gestacao_id} className="min-w-0">
                      <Link
                        href={animalFichaCicloHref(p.animal_id)}
                        className="text-primary hover:underline break-words font-medium"
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
              <p className="text-muted-foreground">
                Nenhum parto previsto nos próximos 7 dias.
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href={buildGestacoesPartos7dHref()}
                className="inline-flex min-h-11 items-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
              >
                Ver gestações
              </Link>
              <Link
                href="/gestao/toques"
                className="inline-flex min-h-11 items-center gap-1 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
              >
                <Stethoscope className="h-4 w-4" aria-hidden />
                Toques pendentes
              </Link>
              <Link
                href="/gestao/coberturas"
                className="inline-flex min-h-11 items-center gap-1 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
              >
                <Search className="h-4 w-4" aria-hidden />
                Coberturas
              </Link>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
