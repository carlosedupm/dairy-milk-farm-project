"use client";

import { useEffect, useMemo } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { get, isAnimalForaDoRebanho, listByFazenda, type Animal } from "@/services/animais";

export type AnimaisFazendaScope = "operacional" | "todos";

export function animaisFazendaQueryKey(
  fazendaId: number | undefined,
  scope: AnimaisFazendaScope,
) {
  return ["animais", "by-fazenda", fazendaId, scope] as const;
}

/** Lista de animais da fazenda: operacional = só no rebanho; todos = inclui baixados (rótulos). */
export function useAnimaisFazendaQuery(
  fazendaId: number | undefined,
  scope: AnimaisFazendaScope,
) {
  return useQuery({
    queryKey: animaisFazendaQueryKey(fazendaId, scope),
    queryFn: () =>
      listByFazenda(fazendaId!, {
        no_rebanho: scope === "operacional",
      }),
    enabled: !!fazendaId && fazendaId > 0,
    refetchOnWindowFocus: true,
  });
}

/** Animais no rebanho ativo — formulários e filtros operacionais. */
export function useAnimaisOperacionalList(fazendaId: number | undefined) {
  return useAnimaisFazendaQuery(fazendaId, "operacional");
}

/**
 * Mapa animal_id → identificação (inclui baixados).
 * @deprecated Preferir useAnimaisByIdMap + AnimalGestaoLabel para badge Baixado.
 */
export function useAnimaisMap(fazendaId: number | undefined) {
  const { data } = useAnimaisFazendaQuery(fazendaId, "todos");

  return useMemo(() => {
    const m = new Map<number, string>();
    const animais = Array.isArray(data) ? data : [];
    for (const a of animais) {
      m.set(a.id, a.identificacao);
    }
    return m;
  }, [data]);
}

/** Mapa animal_id → Animal (todos, para rótulos nas listagens de Gestão). */
export function useAnimaisByIdMap(fazendaId: number | undefined) {
  const { data } = useAnimaisFazendaQuery(fazendaId, "todos");

  return useMemo(() => buildAnimaisByIdMap(data), [data]);
}

function buildAnimaisByIdMap(data: Animal[] | undefined): Map<number, Animal> {
  const m = new Map<number, Animal>();
  const animais = Array.isArray(data) ? data : [];
  for (const a of animais) {
    m.set(a.id, a);
  }
  return m;
}

/** Atualiza caches da fazenda após baixa/reversão (evita UI stale em Gestão). */
export function patchAnimalInFazendaCaches(
  queryClient: QueryClient,
  animal: Animal,
) {
  const fid = animal.fazenda_id;
  if (!fid) return;

  queryClient.setQueryData(["animais", animal.id], animal);

  queryClient.setQueryData<Animal[]>(
    animaisFazendaQueryKey(fid, "todos"),
    (old) => {
      if (!Array.isArray(old)) return old;
      const idx = old.findIndex((a) => a.id === animal.id);
      if (idx >= 0) {
        const next = [...old];
        next[idx] = animal;
        return next;
      }
      return [...old, animal];
    },
  );

  queryClient.setQueryData<Animal[]>(
    animaisFazendaQueryKey(fid, "operacional"),
    (old) => {
      if (!Array.isArray(old)) return old;
      if (isAnimalForaDoRebanho(animal)) {
        return old.filter((a) => a.id !== animal.id);
      }
      const idx = old.findIndex((a) => a.id === animal.id);
      if (idx >= 0) {
        const next = [...old];
        next[idx] = animal;
        return next;
      }
      return [...old, animal];
    },
  );
}

function uniquePositiveAnimalIds(animalIds: number[]): number[] {
  const seen = new Set<number>();
  const ids: number[] = [];
  for (const id of animalIds) {
    if (id <= 0 || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

/**
 * Mapa para tabelas de Gestão: lista `todos` + GET por ID (autoritativo para `data_saida`).
 * O detalhe sobrescreve entradas stale da lista (BR-BAIXA-009).
 */
export function useGestaoAnimaisByIdMap(
  fazendaId: number | undefined,
  animalIds: number[],
) {
  const {
    data: list,
    isLoading: listLoading,
    isFetched: listFetched,
  } = useAnimaisFazendaQuery(fazendaId, "todos");

  const baseMap = useMemo(() => buildAnimaisByIdMap(list), [list]);

  const uniqueIds = useMemo(
    () => uniquePositiveAnimalIds(animalIds),
    [animalIds],
  );

  const detailQueries = useQueries({
    queries: uniqueIds.map((id) => ({
      queryKey: ["animais", id] as const,
      queryFn: () => get(id),
      enabled: !!fazendaId && fazendaId > 0 && listFetched,
      staleTime: 0,
      refetchOnMount: "always" as const,
    })),
  });

  const animaisById = useMemo(() => {
    const m = new Map(baseMap);
    for (const q of detailQueries) {
      if (q.data) m.set(q.data.id, q.data);
    }
    return m;
  }, [baseMap, detailQueries]);

  const detailsLoading =
    uniqueIds.length > 0 && detailQueries.some((q) => q.isLoading);
  const isResolved =
    listFetched && !listLoading && (!uniqueIds.length || !detailsLoading);

  return { animaisById, isResolved };
}

/** Invalida lista `todos` ao entrar em listagens de Gestão (complementa GET por ID). */
export function useGestaoAnimaisCacheRefresh(fazendaId: number | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!fazendaId || fazendaId <= 0) return;
    void queryClient.invalidateQueries({
      queryKey: animaisFazendaQueryKey(fazendaId, "todos"),
    });
  }, [fazendaId, queryClient]);
}
