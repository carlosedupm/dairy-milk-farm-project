"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { parsePositiveIntQueryParam } from "@/lib/gestaoNovoUrl";

export function useGestaoNovoUrlParams() {
  const searchParams = useSearchParams();
  return useMemo(() => {
    const animalId = parsePositiveIntQueryParam(searchParams, "animal_id");
    const gestacaoId = parsePositiveIntQueryParam(searchParams, "gestacao_id");
    return {
      animalId,
      gestacaoId,
      hasPreselectedAnimal: animalId.length > 0,
    };
  }, [searchParams]);
}
