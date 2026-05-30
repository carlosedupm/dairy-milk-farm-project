"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { getResumoPecuario } from "@/services/resumoPecuario";
import { formatDatePtBr } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/errors";
import { HomeCollapsiblePanel } from "@/components/dashboard/HomeCollapsiblePanel";
import { Baby, ClipboardList } from "lucide-react";

export function PecuarioResumoHomePanel() {
  const { fazendaAtiva } = useFazendaAtiva();
  const fazendaId = fazendaAtiva?.id ?? 0;

  const { data, isLoading, error } = useQuery({
    queryKey: ["resumo-pecuario", fazendaId, 30],
    queryFn: () => getResumoPecuario(fazendaId, 30),
    enabled: fazendaId > 0,
  });

  if (!fazendaAtiva) return null;

  const partos = data?.partos_previstos ?? [];
  const partosCount = partos.length;

  return (
    <HomeCollapsiblePanel
      title={`Rebanho — ${fazendaAtiva.nome}`}
      icon={ClipboardList}
      badgeCount={partosCount}
      defaultOpen={partosCount > 0}
    >
      <div className="space-y-4 min-w-0">
        {isLoading && (
          <div className="space-y-2" aria-hidden>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-4 w-full max-w-xs rounded bg-muted animate-pulse" />
            ))}
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive">
            {getApiErrorMessage(error, "Erro ao carregar resumo pecuário.")}
          </p>
        )}
        {data && partosCount > 0 ? (
          <div className="min-w-0">
            <h3 className="text-sm font-medium flex items-center gap-1 mb-2">
              <Baby className="h-4 w-4 shrink-0" aria-hidden />
              Partos previstos (30 dias)
            </h3>
            <ul className="space-y-1 text-sm max-h-40 overflow-y-auto">
              {partos.map((p) => (
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
        ) : null}
        {data && partosCount === 0 && !isLoading ? (
          <p className="text-sm text-muted-foreground">
            Nenhum parto previsto nos próximos 30 dias.
          </p>
        ) : null}
      </div>
    </HomeCollapsiblePanel>
  );
}
