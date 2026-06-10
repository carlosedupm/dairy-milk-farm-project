"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimalVacinaList } from "@/components/animais/AnimalVacinaList";
import { QueryListContent } from "@/components/layout/QueryListContent";
import { ANIMAL_BAIXADO_ACAO_BLOQUEADA_MSG } from "@/components/animais/animalRebanhoUtils";
import { Button } from "@/components/ui/button";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ListPaginationBar } from "@/components/ui/pagination";
import { canCriarVacina } from "@/config/appAccess";
import { useAuth } from "@/contexts/AuthContext";
import {
  animalVacinasListQueryKey,
  listByAnimal,
} from "@/services/animalVacinas";
import { Plus } from "lucide-react";

const PAGE_SIZE = 20;

type Props = {
  animalId: number;
  foraDoRebanho: boolean;
  enabled: boolean;
};

export function AnimalFichaTabVacinas({
  animalId,
  foraDoRebanho,
  enabled,
}: Props) {
  const { user } = useAuth();
  const [offset, setOffset] = useState(0);

  const {
    data: allItems = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: animalVacinasListQueryKey(animalId),
    queryFn: () => listByAnimal(animalId),
    enabled: enabled && animalId > 0,
  });

  const pageItems = useMemo(
    () => allItems.slice(offset, offset + PAGE_SIZE),
    [allItems, offset]
  );

  const canCriar = canCriarVacina(user?.perfil);
  const showNova = canCriar && !foraDoRebanho;
  const showNovaBloqueada = canCriar && foraDoRebanho;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Vacinas / calendário preventivo
          </h2>
          {foraDoRebanho ? (
            <p className="text-muted-foreground text-sm mt-1">
              Animal fora do rebanho — não é possível registrar novas vacinas.
            </p>
          ) : null}
        </div>
        {showNova ? (
          <Button asChild className="min-h-[44px] shrink-0">
            <Link href={`/animais/${animalId}/vacinas/novo`}>
              <Plus className="mr-2 h-4 w-4" />
              Nova vacina
            </Link>
          </Button>
        ) : showNovaBloqueada ? (
          <TooltipProvider delayDuration={300}>
            <ButtonWithTooltip
              className="min-h-[44px] shrink-0"
              disabled
              tooltip={ANIMAL_BAIXADO_ACAO_BLOQUEADA_MSG}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova vacina
            </ButtonWithTooltip>
          </TooltipProvider>
        ) : null}
      </div>

      <QueryListContent
        isLoading={isLoading}
        error={error}
        errorFallback="Erro ao carregar vacinas."
      >
        <div className="space-y-4">
          <AnimalVacinaList
            animalId={animalId}
            items={pageItems}
            perfil={user?.perfil}
            foraDoRebanho={foraDoRebanho}
          />
          {allItems.length > 0 ? (
            <ListPaginationBar
              total={allItems.length}
              pageSize={PAGE_SIZE}
              offset={offset}
              onOffsetChange={setOffset}
            />
          ) : null}
        </div>
      </QueryListContent>
    </div>
  );
}
