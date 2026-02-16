"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listByFazenda } from "@/services/animais";

/**
 * Hook que busca animais da fazenda e retorna um mapa animal_id -> identificacao.
 * Usado nas tabelas de Gestão Pecuária para exibir o nome do animal em vez do ID.
 */
export function useAnimaisMap(fazendaId: number | undefined) {
  const { data } = useQuery({
    queryKey: ["animais", fazendaId],
    queryFn: () => listByFazenda(fazendaId!),
    enabled: !!fazendaId && fazendaId > 0,
  });

  const map = useMemo(() => {
    const m = new Map<number, string>();
    const animais = Array.isArray(data) ? data : [];
    for (const a of animais) {
      m.set(a.id, a.identificacao);
    }
    return m;
  }, [data]);

  return map;
}
