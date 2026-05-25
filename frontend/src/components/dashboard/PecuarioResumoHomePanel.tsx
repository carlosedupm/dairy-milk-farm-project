"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { getResumoPecuario } from "@/services/resumoPecuario";
import { formatDatePtBr } from "@/lib/format";
import {
  buildProducaoListHref,
  getResumoProducaoHojeRange,
  getResumoProducaoSemanaRange,
} from "@/lib/resumoPecuarioLinks";
import { getApiErrorMessage } from "@/lib/errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResumoKpiTile } from "@/components/dashboard/ResumoKpiTile";
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

  const hojeRange = getResumoProducaoHojeRange();
  const semanaRange = getResumoProducaoSemanaRange();

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
            <div
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm"
              role="list"
              aria-label="Indicadores do rebanho"
            >
              <ResumoKpiTile
                label="Prenhes"
                icon={Heart}
                value={data.prenhes_total}
                href="/gestao/gestacoes?status=CONFIRMADA"
                ariaLabel={
                  data.prenhes_total === 1
                    ? "Ver 1 gestação confirmada"
                    : `Ver ${data.prenhes_total} gestações confirmadas`
                }
              />
              <ResumoKpiTile
                label="Restrições leite"
                icon={AlertTriangle}
                value={data.restricoes_ativas_total}
                href="/#restricoes-leite"
                ariaLabel={
                  data.restricoes_ativas_total === 1
                    ? "Ver 1 restrição de leite ativa"
                    : `Ver ${data.restricoes_ativas_total} restrições de leite ativas`
                }
              />
              <ResumoKpiTile
                label="Leite hoje"
                icon={Droplets}
                value={`${data.producao_hoje_litros.toFixed(1)} L`}
                href={buildProducaoListHref(hojeRange.start, hojeRange.end)}
                ariaLabel={`Ver produção de leite de hoje, ${data.producao_hoje_litros.toFixed(1)} litros`}
              />
              <ResumoKpiTile
                label="7 dias"
                value={`${data.producao_semana_litros.toFixed(1)} L`}
                href={buildProducaoListHref(semanaRange.start, semanaRange.end)}
                ariaLabel={`Ver produção dos últimos 7 dias, ${data.producao_semana_litros.toFixed(1)} litros`}
              />
            </div>

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
