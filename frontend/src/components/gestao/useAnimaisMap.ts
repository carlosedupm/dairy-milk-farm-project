"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listByFazenda, type Animal } from "@/services/animais";

function useAnimaisFazendaQuery(fazendaId: number | undefined) {
  return useQuery({
    queryKey: ["animais", "by-fazenda", fazendaId],
    queryFn: () => listByFazenda(fazendaId!),
    enabled: !!fazendaId && fazendaId > 0,
  });
}

/**
 * Hook que busca animais da fazenda e retorna um mapa animal_id -> identificacao.
 * Usado nas tabelas de Gestão Pecuária para exibir o nome do animal em vez do ID.
 */
export function useAnimaisMap(fazendaId: number | undefined) {
  const { data } = useAnimaisFazendaQuery(fazendaId);

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

/** Mapa animal_id → registro completo (mesmo cache de `useAnimaisMap`). */
export function useAnimaisByIdMap(fazendaId: number | undefined) {
  const { data } = useAnimaisFazendaQuery(fazendaId);

  return useMemo(() => {
    const m = new Map<number, Animal>();
    const animais = Array.isArray(data) ? data : [];
    for (const a of animais) {
      m.set(a.id, a);
    }
    return m;
  }, [data]);
}
