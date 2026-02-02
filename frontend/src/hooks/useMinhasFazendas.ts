"use client";

import { useQuery } from "@tanstack/react-query";
import { getMinhasFazendas } from "@/services/fazendas";
import type { Fazenda } from "@/services/fazendas";

export function useMinhasFazendas() {
  const { data: fazendas = [], isLoading } = useQuery<Fazenda[]>({
    queryKey: ["me", "fazendas"],
    queryFn: getMinhasFazendas,
  });

  const fazendaUnica = fazendas.length === 1 ? fazendas[0] : null;
  const isSingleFazenda = fazendas.length === 1;

  return { fazendas, fazendaUnica, isSingleFazenda, isLoading };
}
