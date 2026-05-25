"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { getConformidadeFazenda } from "@/services/auditoria";
import { getApiErrorMessage } from "@/lib/errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 min-w-0">
          <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">Conformidade dos dados</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 min-w-0">
        <p className="text-xs text-muted-foreground">
          Verificação do <span className="font-medium">rebanho ativo</span> (INT-001 a
          INT-006). Animais com baixa e ciclo incompleto aparecem como{" "}
          <span className="font-medium">INT-007</span>.
        </p>
        {isLoading && (
          <p className="text-sm text-muted-foreground">A verificar integridade…</p>
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
                "space-y-2 text-sm max-h-[min(20rem,45dvh)] overflow-y-auto min-w-0 pr-1"
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
      </CardContent>
    </Card>
  );
}
