"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import {
  alertaSeveridadeLabel,
  alertaStatusLabel,
  alertaTipoLabel,
  SEVERIDADE_BADGE_VARIANT,
} from "@/components/alertas/alertas-utils";
import {
  alertasListQueryKey,
  listAlertas,
  type Alerta,
} from "@/services/alertas";
import { getApiErrorMessage } from "@/lib/errors";
import { formatDatePtBr } from "@/lib/format";
import { HomeCollapsiblePanel } from "@/components/dashboard/HomeCollapsiblePanel";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function AlertasHomePanel() {
  const { fazendaAtiva } = useFazendaAtiva();
  const fazendaId = fazendaAtiva?.id ?? 0;

  const { data, isLoading, error } = useQuery({
    queryKey: alertasListQueryKey(fazendaId, {
      status: "ABERTO",
      severidade: "CRITICA",
      limit: 3,
      offset: 0,
    }),
    queryFn: () =>
      listAlertas(fazendaId, {
        status: "ABERTO",
        severidade: "CRITICA",
        limit: 3,
        offset: 0,
      }),
    enabled: fazendaId > 0,
  });

  if (!fazendaAtiva) return null;

  const alertas = data?.alertas ?? [];
  const total = data?.total ?? 0;

  return (
    <HomeCollapsiblePanel
      title="Alertas críticos"
      icon={Bell}
      badgeCount={total}
      defaultOpen={total > 0}
    >
      <div className="space-y-3 min-w-0">
        <p className="text-xs text-muted-foreground">
          Até 3 alertas abertos com severidade crítica na fazenda ativa.
        </p>
        {isLoading && (
          <div className="space-y-2" aria-hidden>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive">
            {getApiErrorMessage(error, "Erro ao carregar alertas.")}
          </p>
        )}
        {!isLoading && !error && total === 0 && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <CheckCircle2
              className="h-4 w-4 shrink-0 text-feedback-success"
              aria-hidden
            />
            <p>Nenhum alerta crítico aberto nesta fazenda.</p>
          </div>
        )}
        {!isLoading && !error && alertas.length > 0 && (
          <>
            {total > alertas.length && (
              <p className="text-sm text-muted-foreground">
                {total === 1
                  ? "1 alerta crítico aberto"
                  : `${total} alertas críticos abertos`}
                {" — "}
                <Link
                  href="/alertas?status=ABERTO&severidade=CRITICA"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Ver todos
                </Link>
              </p>
            )}
            <ul
              className={cn(
                "space-y-2 text-sm max-h-[min(20rem,45dvh)] overflow-y-auto min-w-0 pr-1",
              )}
            >
              {alertas.map((a: Alerta) => (
                <li
                  key={a.id}
                  className="rounded-lg border bg-muted/30 px-3 py-2 min-w-0"
                >
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <Badge
                      variant={
                        SEVERIDADE_BADGE_VARIANT[a.severidade] ?? "outline"
                      }
                    >
                      {alertaSeveridadeLabel(a.severidade)}
                    </Badge>
                    <span className="font-medium truncate">{a.titulo}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {alertaTipoLabel(a.tipo)}
                    {a.animal_identificacao
                      ? ` · ${a.animal_identificacao}`
                      : null}
                    {a.data_prevista
                      ? ` · previsto ${formatDatePtBr(a.data_prevista)}`
                      : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {alertaStatusLabel(a.status)}
                  </p>
                </li>
              ))}
            </ul>
            {total <= alertas.length && total > 0 && (
              <Link
                href="/alertas?status=ABERTO&severidade=CRITICA"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline inline-block"
              >
                Ver todos os alertas
              </Link>
            )}
          </>
        )}
      </div>
    </HomeCollapsiblePanel>
  );
}
