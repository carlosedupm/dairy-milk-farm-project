"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { getConformidadeFazenda } from "@/services/auditoria";
import { getApiErrorMessage } from "@/lib/errors";
import { HomeCollapsiblePanel } from "@/components/dashboard/HomeCollapsiblePanel";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SEVERIDADE_VARIANT: Record<string, "destructive" | "secondary"> = {
  ALTA: "destructive",
  MEDIA: "secondary",
};

export function ConformidadeHomePanel() {
  const { fazendaAtiva } = useFazendaAtiva();
  const fazendaId = fazendaAtiva?.id ?? 0;

  const { data, isLoading, error } = useQuery({
    queryKey: ["auditoria-conformidade", fazendaId],
    queryFn: () => getConformidadeFazenda(fazendaId),
    enabled: fazendaId > 0,
  });

  if (!fazendaAtiva) return null;

  const total = data?.total ?? 0;

  return (
    <HomeCollapsiblePanel
      title="Conformidade dos dados"
      icon={ShieldAlert}
      badgeCount={total}
      defaultOpen={total > 0}
    >
      <div className="space-y-3 min-w-0">
        <p className="text-xs text-muted-foreground">
          Auditoria do <span className="font-medium">rebanho ativo</span> (INT-001 a
          INT-006) e pós-baixa (INT-007). Novos registos são validados na hora; este
          painel destaca dados legados ou exceções a corrigir.
        </p>
        {isLoading && (
          <div className="space-y-2" aria-hidden>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-14 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive">
            {getApiErrorMessage(error, "Erro ao carregar conformidade.")}
          </p>
        )}
        {data && total === 0 && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <CheckCircle2
              className="h-4 w-4 shrink-0 text-green-600 dark:text-green-500"
              aria-hidden
            />
            <p>
              Nenhuma anomalia no rebanho ativo (lactação, gestação, produção e
              restrições de leite).
            </p>
          </div>
        )}
        {data && total > 0 && (
          <>
            <p className="text-sm">
              <span className="font-medium text-foreground">{total}</span>
              {total === 1 ? " anomalia encontrada" : " anomalias encontradas"} na
              fazenda. Revise e corrija no cadastro ou na gestão reprodutiva.
            </p>
            <ul
              className={cn(
                "space-y-2 text-sm max-h-[min(20rem,45dvh)] overflow-y-auto min-w-0 pr-1",
              )}
            >
              {data.anomalias.map((a, idx) => (
                <li
                  key={`${a.codigo}-${a.animal_id}-${idx}`}
                  className="rounded-md border p-3 min-w-0"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge
                      variant={SEVERIDADE_VARIANT[a.severidade] ?? "secondary"}
                      className="shrink-0"
                    >
                      {a.codigo}
                    </Badge>
                    <Badge variant="outline" className="shrink-0">
                      {a.severidade}
                    </Badge>
                    <Link
                      href={`/animais/${a.animal_id}`}
                      className="font-medium text-primary hover:underline break-words"
                    >
                      {a.identificacao}
                    </Link>
                  </div>
                  <p className="text-muted-foreground break-words">{a.descricao}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </HomeCollapsiblePanel>
  );
}
