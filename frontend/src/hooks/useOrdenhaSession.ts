"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listEmLactacaoByFazenda,
  type Animal,
} from "@/services/animais";
import {
  create as createProducao,
  listByDateRange,
  type ProducaoCreate,
  type Qualidade,
} from "@/services/producao";
import { listAtivas as listRestricoesAtivas } from "@/services/restricoesLeite";
import { formatLocalDateYmd } from "@/lib/resumoPecuarioLinks";
import {
  ORDENHA_TURNO_LABELS,
  animalIdsComProducaoNoTurno,
  sessionStorageKey,
  turnoFromDateTime,
  type OrdenhaTurno,
} from "@/lib/ordenha-turno";

type PersistedSession = {
  skippedAnimalIds: number[];
  focusedAnimalId?: number;
};

function readPersisted(key: string): PersistedSession {
  if (typeof window === "undefined") return { skippedAnimalIds: [] };
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return { skippedAnimalIds: [] };
    const parsed = JSON.parse(raw) as PersistedSession;
    return {
      skippedAnimalIds: Array.isArray(parsed.skippedAnimalIds)
        ? parsed.skippedAnimalIds.filter((n) => Number.isFinite(n))
        : [],
      focusedAnimalId:
        typeof parsed.focusedAnimalId === "number"
          ? parsed.focusedAnimalId
          : undefined,
    };
  } catch {
    return { skippedAnimalIds: [] };
  }
}

function writePersisted(key: string, data: PersistedSession) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

export type OrdenhaAnimalRow = {
  animal: Animal;
  jaNoTurno: boolean;
  pulada: boolean;
  temRestricao: boolean;
};

export function useOrdenhaSession(fazendaId: number | undefined) {
  const queryClient = useQueryClient();
  const [dia] = useState(() => formatLocalDateYmd());
  const [turno, setTurno] = useState<OrdenhaTurno>(() => turnoFromDateTime());
  const [sessionLitros, setSessionLitros] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);

  const storageKey =
    fazendaId && fazendaId > 0
      ? sessionStorageKey(fazendaId, dia, turno)
      : null;

  const [sessionLocal, setSessionLocal] = useState(() => {
    const key = storageKey;
    const p = key ? readPersisted(key) : { skippedAnimalIds: [] as number[] };
    return {
      key,
      skippedIds: p.skippedAnimalIds,
      focusedAnimalId: (p.focusedAnimalId ?? null) as number | null,
    };
  });

  // Ajustar estado quando a chave de sessão muda (padrão React: sync durante render)
  if (sessionLocal.key !== storageKey) {
    const p = storageKey
      ? readPersisted(storageKey)
      : { skippedAnimalIds: [] as number[] };
    setSessionLocal({
      key: storageKey,
      skippedIds: p.skippedAnimalIds,
      focusedAnimalId: p.focusedAnimalId ?? null,
    });
  }

  const skippedIds = sessionLocal.skippedIds;
  const focusedAnimalId = sessionLocal.focusedAnimalId;

  useEffect(() => {
    if (!storageKey) return;
    writePersisted(storageKey, {
      skippedAnimalIds: skippedIds,
      focusedAnimalId: focusedAnimalId ?? undefined,
    });
  }, [storageKey, skippedIds, focusedAnimalId]);

  const { data: animais = [], isLoading: loadingAnimais } = useQuery({
    queryKey: ["animais", "fazenda", fazendaId, "em-lactacao"],
    queryFn: () => listEmLactacaoByFazenda(fazendaId!),
    enabled: !!fazendaId && fazendaId > 0,
  });

  const { data: producoesHoje = [], isLoading: loadingProducoes } = useQuery({
    queryKey: ["producao", "ordenha", fazendaId, dia],
    queryFn: () => listByDateRange(dia, dia, fazendaId!),
    enabled: !!fazendaId && fazendaId > 0,
  });

  const { data: restricoes = [], isLoading: loadingRestricoes } = useQuery({
    queryKey: ["restricoes-leite", "ativas", fazendaId],
    queryFn: () => listRestricoesAtivas(fazendaId!),
    enabled: !!fazendaId && fazendaId > 0,
  });

  const blockedIds = useMemo(
    () => animalIdsComProducaoNoTurno(producoesHoje, turno),
    [producoesHoje, turno],
  );

  const restricaoIds = useMemo(() => {
    const s = new Set<number>();
    for (const r of restricoes) s.add(r.animal_id);
    return s;
  }, [restricoes]);

  const skippedSet = useMemo(() => new Set(skippedIds), [skippedIds]);

  const rows: OrdenhaAnimalRow[] = useMemo(
    () =>
      animais.map((animal) => ({
        animal,
        jaNoTurno: blockedIds.has(animal.id),
        pulada: skippedSet.has(animal.id),
        temRestricao: restricaoIds.has(animal.id),
      })),
    [animais, blockedIds, skippedSet, restricaoIds],
  );

  const pendentes = useMemo(
    () => rows.filter((r) => !r.jaNoTurno && !r.pulada),
    [rows],
  );

  const turnoInferidoAgora = turnoFromDateTime();
  const turnoDesalinhado = turno !== turnoInferidoAgora;

  const activeAnimalId = useMemo(() => {
    if (
      focusedAnimalId != null &&
      pendentes.some((r) => r.animal.id === focusedAnimalId)
    ) {
      return focusedAnimalId;
    }
    return pendentes[0]?.animal.id ?? null;
  }, [focusedAnimalId, pendentes]);

  const activeRow = useMemo(
    () => rows.find((r) => r.animal.id === activeAnimalId) ?? null,
    [rows, activeAnimalId],
  );

  const selectAnimal = useCallback((id: number) => {
    setSessionLocal((prev) => ({ ...prev, focusedAnimalId: id }));
  }, []);

  const skipAnimal = useCallback((id: number) => {
    setSessionLocal((prev) => ({
      ...prev,
      skippedIds: prev.skippedIds.includes(id)
        ? prev.skippedIds
        : [...prev.skippedIds, id],
      focusedAnimalId:
        prev.focusedAnimalId === id ? null : prev.focusedAnimalId,
    }));
  }, []);

  const unskipAnimal = useCallback((id: number) => {
    setSessionLocal((prev) => ({
      ...prev,
      skippedIds: prev.skippedIds.filter((x) => x !== id),
    }));
  }, []);

  const registerProducao = useCallback(
    async (animalId: number, quantidade: number, qualidade?: Qualidade) => {
      if (blockedIds.has(animalId)) {
        throw new Error("Este animal já tem produção neste turno.");
      }
      const payload: ProducaoCreate = {
        animal_id: animalId,
        quantidade,
        qualidade,
      };
      const created = await createProducao(payload);
      setSessionLitros((n) => n + quantidade);
      setSessionCount((n) => n + 1);
      await queryClient.invalidateQueries({
        queryKey: ["producao", "ordenha", fazendaId, dia],
      });
      await queryClient.invalidateQueries({ queryKey: ["producao"] });
      await queryClient.invalidateQueries({ queryKey: ["resumo-pecuario"] });
      setSessionLocal((prev) => ({ ...prev, focusedAnimalId: null }));
      return created;
    },
    [blockedIds, queryClient, fazendaId, dia],
  );

  const changeTurno = useCallback((next: OrdenhaTurno) => {
    setTurno(next);
  }, []);

  return {
    dia,
    turno,
    turnoLabel: ORDENHA_TURNO_LABELS[turno],
    changeTurno,
    turnoDesalinhado,
    turnoInferidoLabel: ORDENHA_TURNO_LABELS[turnoInferidoAgora],
    rows,
    pendentes,
    activeRow,
    selectAnimal,
    skipAnimal,
    unskipAnimal,
    registerProducao,
    sessionLitros,
    sessionCount,
    blockedCount: blockedIds.size,
    pendenteCount: pendentes.length,
    totalAnimais: animais.length,
    isLoading: loadingAnimais || loadingProducoes || loadingRestricoes,
  };
}
