"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  get,
  listAnimaisByCicloContext,
  type Animal,
  type CicloContext,
} from "@/services/animais";

export function animaisCicloQueryKey(fazendaId: number, context: CicloContext) {
  return ["animais", "fazenda", fazendaId, "ciclo", context] as const;
}

type Options = {
  preserveAnimalId?: number;
};

/**
 * Lista animais elegíveis por marco do ciclo reprodutivo.
 * Em edição, inclui o animal selecionado mesmo fora do filtro (RF07).
 */
export function useAnimaisCicloContext(
  fazendaId: number | undefined,
  context: CicloContext,
  options?: Options,
) {
  const preserveAnimalId = options?.preserveAnimalId ?? 0;

  const {
    data: contextAnimais = [],
    isLoading: loadingContext,
    isFetching,
  } = useQuery<Animal[]>({
    queryKey: animaisCicloQueryKey(fazendaId ?? 0, context),
    queryFn: () => listAnimaisByCicloContext(fazendaId!, context),
    enabled: !!fazendaId && fazendaId > 0,
  });

  const needsPreserveFetch =
    preserveAnimalId > 0 &&
    !contextAnimais.some((a) => a.id === preserveAnimalId);

  const { data: preservedAnimal, isLoading: loadingPreserved } = useQuery({
    queryKey: ["animais", preserveAnimalId],
    queryFn: () => get(preserveAnimalId),
    enabled: needsPreserveFetch,
  });

  const animais = useMemo(() => {
    if (!preservedAnimal) return contextAnimais;
    if (contextAnimais.some((a) => a.id === preservedAnimal.id)) {
      return contextAnimais;
    }
    return [preservedAnimal, ...contextAnimais];
  }, [contextAnimais, preservedAnimal]);

  const isLoading =
    loadingContext ||
    isFetching ||
    (needsPreserveFetch && loadingPreserved);

  return { animais, isLoading };
}
