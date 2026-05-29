"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import {
  alertasListQueryKey,
  listAlertas,
  SEVERIDADE_ALERTA_LABELS,
  STATUS_ALERTA_LABELS,
  TIPO_ALERTA_LABELS,
  type Alerta,
  type SeveridadeAlerta,
  type TipoAlerta,
} from "@/services/alertas";
import { getApiErrorMessage } from "@/lib/errors";
import { formatDatePtBr } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SEVERIDADE_VARIANT: Record<
  string,
  "destructive" | "secondary" | "outline" | "default"
> = {
  CRITICA: "destructive",
  ALTA: "destructive",
  MEDIA: "secondary",
  BAIXA: "outline",
};

function tipoLabel(t: string): string {
  return TIPO_ALERTA_LABELS[t as TipoAlerta] ?? t;
}

function severidadeLabel(s: string): string {
  return SEVERIDADE_ALERTA_LABELS[s as SeveridadeAlerta] ?? s;
}

function statusLabel(s: string): string {
  return STATUS_ALERTA_LABELS[s as keyof typeof STATUS_ALERTA_LABELS] ?? s;
}

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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 min-w-0">
          <Bell className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">Alertas críticos</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 min-w-0">
        <p className="text-xs text-muted-foreground">
          Até 3 alertas abertos com severidade crítica na fazenda ativa.
        </p>
        {isLoading && (
          <p className="text-sm text-muted-foreground">A carregar alertas…</p>
        )}
        {error && (
          <p className="text-sm text-destructive">
            {getApiErrorMessage(error, "Erro ao carregar alertas.")}
          </p>
        )}
        {!isLoading && !error && total === 0 && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <CheckCircle2
              className="h-4 w-4 shrink-0 text-green-600 dark:text-green-500"
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
                  href="/alertas"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Ver todos
                </Link>
              </p>
            )}
            <ul
              className={cn(
                "space-y-2 text-sm max-h-[min(20rem,45dvh)] overflow-y-auto min-w-0 pr-1"
              )}
            >
              {alertas.map((a: Alerta) => (
                <li
                  key={a.id}
                  className="rounded-lg border bg-muted/30 px-3 py-2 min-w-0"
                >
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <Badge variant={SEVERIDADE_VARIANT[a.severidade] ?? "outline"}>
                      {severidadeLabel(a.severidade)}
                    </Badge>
                    <span className="font-medium truncate">{a.titulo}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tipoLabel(a.tipo)}
                    {a.animal_identificacao
                      ? ` · ${a.animal_identificacao}`
                      : null}
                    {a.data_prevista
                      ? ` · previsto ${formatDatePtBr(a.data_prevista)}`
                      : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {statusLabel(a.status)}
                  </p>
                </li>
              ))}
            </ul>
            {total <= alertas.length && total > 0 && (
              <Link
                href="/alertas"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline inline-block"
              >
                Ver todos os alertas
              </Link>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
