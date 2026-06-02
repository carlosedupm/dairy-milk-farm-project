"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimalSaudeList } from "@/components/animais/AnimalSaudeList";
import { QueryListContent } from "@/components/layout/QueryListContent";
import { Button } from "@/components/ui/button";
import { ListPaginationBar } from "@/components/ui/pagination";
import { canCriarRegistroSaude } from "@/config/appAccess";
import { useAuth } from "@/contexts/AuthContext";
import {
  animalSaudeListQueryKey,
  listByAnimal,
} from "@/services/animalSaude";
import { Plus } from "lucide-react";

const PAGE_SIZE = 20;

type Props = {
  animalId: number;
  foraDoRebanho: boolean;
  enabled: boolean;
};

export function AnimalFichaTabSaude({
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
    queryKey: animalSaudeListQueryKey(animalId),
    queryFn: () => listByAnimal(animalId),
    enabled: enabled && animalId > 0,
  });

  const pageItems = useMemo(
    () => allItems.slice(offset, offset + PAGE_SIZE),
    [allItems, offset]
  );

  const showNovo = canCriarRegistroSaude(user?.perfil) && !foraDoRebanho;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Casos de saúde
          </h2>
          {foraDoRebanho ? (
            <p className="text-muted-foreground text-sm mt-1">
              Animal fora do rebanho — não é possível registar novos casos.
            </p>
          ) : null}
        </div>
        {showNovo ? (
          <Button asChild className="min-h-[44px] shrink-0">
            <Link href={`/animais/${animalId}/saude/novo`}>
              <Plus className="mr-2 h-4 w-4" />
              Novo registro
            </Link>
          </Button>
        ) : null}
      </div>

      <QueryListContent
        isLoading={isLoading}
        error={error}
        errorFallback="Erro ao carregar registos."
      >
        <div className="space-y-4">
          <AnimalSaudeList
            animalId={animalId}
            items={pageItems}
            perfil={user?.perfil}
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
