"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimalProducaoPorLactacao } from "@/components/animais/AnimalProducaoPorLactacao";
import { buildProducaoGruposPorLactacao } from "@/components/animais/producaoPorLactacaoUtils";
import { QueryListContent } from "@/components/layout/QueryListContent";
import { ANIMAL_BAIXADO_ACAO_BLOQUEADA_MSG } from "@/components/animais/animalRebanhoUtils";
import { Button } from "@/components/ui/button";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import { TooltipProvider } from "@/components/ui/tooltip";
import { listByAnimal } from "@/services/producao";
import { listByFazenda } from "@/services/lactacoes";
import { Plus } from "lucide-react";

type Props = {
  animalId: number;
  fazendaId: number | undefined;
  canRegistrarProducao: boolean;
  showRegistrarProducaoBloqueado: boolean;
  animalLabel: string;
  enabled: boolean;
};

export function AnimalFichaTabProducao({
  animalId,
  fazendaId,
  canRegistrarProducao,
  showRegistrarProducaoBloqueado,
  animalLabel,
  enabled,
}: Props) {
  const {
    data: registros = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["producao", "animal", animalId],
    queryFn: () => listByAnimal(animalId),
    enabled: enabled && animalId > 0,
  });

  const { data: lactacoesFazenda = [] } = useQuery({
    queryKey: ["lactacoes", fazendaId],
    queryFn: () => listByFazenda(fazendaId!),
    enabled: enabled && !!fazendaId,
  });

  const lactacoesAnimal = useMemo(
    () => lactacoesFazenda.filter((l) => l.animal_id === animalId),
    [lactacoesFazenda, animalId]
  );

  const grupos = useMemo(
    () => buildProducaoGruposPorLactacao(registros, lactacoesAnimal),
    [registros, lactacoesAnimal]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Produção por lactação
          </h2>
          <p className="text-sm text-muted-foreground">{animalLabel}</p>
        </div>
        {canRegistrarProducao ? (
          <Button asChild className="min-h-[44px] shrink-0">
            <Link href={`/producao/novo?animal_id=${animalId}`}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar produção
            </Link>
          </Button>
        ) : showRegistrarProducaoBloqueado ? (
          <TooltipProvider delayDuration={300}>
            <ButtonWithTooltip
              className="min-h-[44px] shrink-0"
              disabled
              tooltip={ANIMAL_BAIXADO_ACAO_BLOQUEADA_MSG}
            >
              <Plus className="mr-2 h-4 w-4" />
              Registrar produção
            </ButtonWithTooltip>
          </TooltipProvider>
        ) : null}
      </div>

      <QueryListContent
        isLoading={isLoading}
        error={error}
        errorFallback="Erro ao carregar produção do animal."
      >
        <AnimalProducaoPorLactacao grupos={grupos} fazendaId={fazendaId} />
      </QueryListContent>
    </div>
  );
}
