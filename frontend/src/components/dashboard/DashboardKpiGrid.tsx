"use client";

import { useQuery } from "@tanstack/react-query";
import { Baby, Droplets, Bell, Heart } from "lucide-react";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { getResumoPecuario } from "@/services/resumoPecuario";
import { alertasListQueryKey, listAlertas } from "@/services/alertas";
import { getApiErrorMessage } from "@/lib/errors";
import {
  formatKpiCount,
  formatKpiLitros,
  kpiCountAriaLabel,
  kpiLitrosAriaLabel,
} from "@/lib/kpiFormat";
import {
  buildAlertasCriticosHref,
  buildAnimaisEmLactacaoHref,
  buildGestacoesPartos7dHref,
  buildProducaoListHref,
  getResumoProducaoHojeRange,
} from "@/lib/resumoPecuarioLinks";
import { ResumoKpiTile } from "@/components/dashboard/ResumoKpiTile";
import { DashboardKpiSkeleton } from "@/components/dashboard/DashboardKpiSkeleton";

export function DashboardKpiGrid() {
  const { fazendaAtiva } = useFazendaAtiva();
  const fazendaId = fazendaAtiva?.id ?? 0;

  const resumoQuery = useQuery({
    queryKey: ["resumo-pecuario", fazendaId, 30],
    queryFn: () => getResumoPecuario(fazendaId, 30),
    enabled: fazendaId > 0,
  });

  const alertasQuery = useQuery({
    queryKey: alertasListQueryKey(fazendaId, {
      status: "ABERTO",
      severidade: "CRITICA",
      limit: 1,
      offset: 0,
    }),
    queryFn: () =>
      listAlertas(fazendaId, {
        status: "ABERTO",
        severidade: "CRITICA",
        limit: 1,
        offset: 0,
      }),
    enabled: fazendaId > 0,
  });

  if (!fazendaAtiva) return null;

  const isLoading = resumoQuery.isLoading || alertasQuery.isLoading;

  const error = resumoQuery.error ?? alertasQuery.error;

  const partos7d = resumoQuery.data?.partos_proximos_7d_total ?? 0;
  const lactacao = resumoQuery.data?.lactacao_ativa_total ?? 0;
  const alertasCriticos = alertasQuery.data?.total ?? 0;
  const producaoHoje = resumoQuery.data?.producao_hoje_litros ?? 0;
  const hojeRange = getResumoProducaoHojeRange();

  return (
    <section aria-labelledby="dashboard-kpis-heading" className="mb-6">
      <h2 id="dashboard-kpis-heading" className="sr-only">
        Indicadores do dia
      </h2>
      {isLoading ? <DashboardKpiSkeleton /> : null}
      {error && !isLoading ? (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(error, "Erro ao carregar indicadores.")}
        </p>
      ) : null}
      {!isLoading && !error ? (
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
          role="list"
          aria-label="Indicadores operacionais"
        >
          <ResumoKpiTile
            label="Partos 7 dias"
            icon={Baby}
            value={formatKpiCount(partos7d)}
            href={buildGestacoesPartos7dHref()}
            ariaLabel={kpiCountAriaLabel(
              "parto previsto nos próximos 7 dias",
              "partos previstos nos próximos 7 dias",
              partos7d,
            )}
          />
          <ResumoKpiTile
            label="Em lactação"
            icon={Heart}
            value={formatKpiCount(lactacao)}
            href={buildAnimaisEmLactacaoHref()}
            ariaLabel={kpiCountAriaLabel(
              "animal em lactação",
              "animais em lactação",
              lactacao,
            )}
          />
          <ResumoKpiTile
            label="Alertas críticos"
            icon={Bell}
            value={formatKpiCount(alertasCriticos)}
            href={buildAlertasCriticosHref()}
            ariaLabel={kpiCountAriaLabel(
              "alerta crítico aberto",
              "alertas críticos abertos",
              alertasCriticos,
            )}
          />
          <ResumoKpiTile
            label="Leite hoje"
            icon={Droplets}
            value={formatKpiLitros(producaoHoje)}
            href={buildProducaoListHref(hojeRange.start, hojeRange.end)}
            ariaLabel={kpiLitrosAriaLabel(
              producaoHoje,
              "produção de leite de hoje",
            )}
          />
        </div>
      ) : null}
    </section>
  );
}
