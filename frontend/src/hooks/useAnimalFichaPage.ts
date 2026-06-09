"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  get as getAnimal,
  getContexto,
  remove,
  reverterBaixa,
  invalidateAnimalTimeline,
  isAnimalForaDoRebanho,
  type Animal,
  type AnimalContexto,
  type TimelineFilterTipo,
} from "@/services/animais";
import { get as getFazenda, type Fazenda } from "@/services/fazendas";
import {
  canRegistrarBaixa,
  canReverterBaixa,
  isPathAllowedForPerfil,
} from "@/config/appAccess";
import { useAuth } from "@/contexts/AuthContext";
import {
  animaisFazendaQueryKey,
  patchAnimalInFazendaCaches,
} from "@/components/gestao/useAnimaisMap";
import {
  animalFichaTabHref,
  parseAnimalFichaTab,
  parseTimelineFilterTipo,
  type AnimalFichaTab,
} from "@/components/animais/ficha/animalFichaTabs";
import { animalFichaTabHrefWithParams } from "@/lib/animalFichaLinks";

export type UseAnimalFichaPageResult = {
  id: number;
  idInvalid: boolean;
  animal: Animal | undefined;
  contexto: AnimalContexto | undefined;
  fazenda: Fazenda | undefined;
  isLoading: boolean;
  contextoLoading: boolean;
  error: Error | null;
  activeTab: AnimalFichaTab;
  historicoTipo: TimelineFilterTipo;
  setTab: (tab: AnimalFichaTab) => void;
  setHistoricoTipo: (tipo: TimelineFilterTipo) => void;
  foraDoRebanho: boolean;
  canManageAnimal: boolean;
  edicaoCadastroBloqueada: boolean;
  canEditarCadastroAnimal: boolean;
  canExcluirCadastroAnimal: boolean;
  showEditarCadastroAnimal: boolean;
  canRegistrarProducao: boolean;
  canRegistrarProducaoPerfil: boolean;
  showRegistrarProducaoBloqueado: boolean;
  showRegistrarBaixa: boolean;
  showReverterBaixa: boolean;
  revertMutation: ReturnType<
    typeof useMutation<Animal, Error, void, unknown>
  >;
  deleteMutation: ReturnType<
    typeof useMutation<void, Error, void, unknown>
  >;
};

export function useAnimalFichaPage(): UseAnimalFichaPageResult {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const id = Number(params.id);
  const idInvalid = Number.isNaN(id) || id <= 0;

  const tabParam = searchParams.get("tab");
  const tipoParam = searchParams.get("tipo");

  const activeTab = useMemo(
    () => parseAnimalFichaTab(tabParam, tipoParam),
    [tabParam, tipoParam],
  );

  const historicoTipo = useMemo(() => {
    if (activeTab !== "historico") {
      return "todos" as TimelineFilterTipo;
    }
    return parseTimelineFilterTipo(tipoParam);
  }, [activeTab, tipoParam]);

  useEffect(() => {
    if (tabParam === "historico" && tipoParam === "ciclo") {
      router.replace(animalFichaTabHref(id, "ciclo"), { scroll: false });
    }
  }, [tabParam, tipoParam, id, router]);

  const setTab = useCallback(
    (tab: AnimalFichaTab) => {
      router.push(animalFichaTabHref(id, tab), { scroll: false });
    },
    [id, router],
  );

  const setHistoricoTipo = useCallback(
    (tipo: TimelineFilterTipo) => {
      if (tipo === "ciclo") {
        router.push(animalFichaTabHref(id, "ciclo"), { scroll: false });
        return;
      }
      router.push(
        animalFichaTabHrefWithParams(id, "historico", { tipo }),
        { scroll: false },
      );
    },
    [id, router],
  );

  const {
    data: animal,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["animais", id],
    queryFn: () => getAnimal(id),
    enabled: !idInvalid,
  });

  const { data: fazenda } = useQuery({
    queryKey: ["fazendas", animal?.fazenda_id],
    queryFn: () => getFazenda(animal!.fazenda_id),
    enabled: !!animal?.fazenda_id,
  });

  const { data: contexto, isLoading: contextoLoading } = useQuery({
    queryKey: ["animais", id, "contexto"],
    queryFn: () => getContexto(id),
    enabled: !idInvalid && !!animal,
  });

  const foraDoRebanho =
    contexto?.fora_do_rebanho ?? (animal ? isAnimalForaDoRebanho(animal) : false);

  const canManageAnimal = user?.perfil !== "FUNCIONARIO";
  const edicaoCadastroBloqueada = foraDoRebanho;
  const canEditarCadastroAnimal = canManageAnimal && !foraDoRebanho;
  const canExcluirCadastroAnimal = canManageAnimal && !foraDoRebanho;
  const showEditarCadastroAnimal = canManageAnimal;
  const canRegistrarProducaoPerfil =
    !!user?.perfil &&
    isPathAllowedForPerfil(user.perfil, "/producao/novo");
  const canRegistrarProducao =
    canRegistrarProducaoPerfil && !foraDoRebanho;
  const showRegistrarProducaoBloqueado =
    canRegistrarProducaoPerfil && foraDoRebanho;
  const showRegistrarBaixa =
    canRegistrarBaixa(user?.perfil) && !foraDoRebanho;
  const showReverterBaixa =
    canReverterBaixa(user?.perfil) && foraDoRebanho;

  const revertMutation = useMutation({
    mutationFn: () => reverterBaixa(id),
    onSuccess: (animalAtualizado) => {
      patchAnimalInFazendaCaches(queryClient, animalAtualizado);
      const fid = animalAtualizado.fazenda_id ?? animal?.fazenda_id;
      queryClient.invalidateQueries({ queryKey: ["animais"] });
      if (fid) {
        queryClient.invalidateQueries({
          queryKey: animaisFazendaQueryKey(fid, "operacional"),
        });
        queryClient.invalidateQueries({
          queryKey: animaisFazendaQueryKey(fid, "todos"),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["animais", id] });
      queryClient.invalidateQueries({ queryKey: ["animais", id, "contexto"] });
      invalidateAnimalTimeline(queryClient, id);
      queryClient.invalidateQueries({ queryKey: ["conformidade"] });
      queryClient.invalidateQueries({ queryKey: ["resumo-pecuario"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animais"] });
      if (animal?.fazenda_id) {
        queryClient.invalidateQueries({
          queryKey: ["fazendas", animal.fazenda_id, "animais"],
        });
      }
      router.push("/animais");
    },
  });

  return {
    id,
    idInvalid,
    animal: animal ?? undefined,
    contexto: contexto ?? undefined,
    fazenda: fazenda ?? undefined,
    isLoading,
    contextoLoading,
    error: error as Error | null,
    activeTab,
    historicoTipo,
    setTab,
    setHistoricoTipo,
    foraDoRebanho,
    canManageAnimal,
    edicaoCadastroBloqueada,
    canEditarCadastroAnimal,
    canExcluirCadastroAnimal,
    showEditarCadastroAnimal,
    canRegistrarProducao,
    canRegistrarProducaoPerfil,
    showRegistrarProducaoBloqueado,
    showRegistrarBaixa,
    showReverterBaixa,
    revertMutation,
    deleteMutation,
  };
}
