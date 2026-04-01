"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { parseApiDate, toYMD } from "@/components/folgas/folgas-utils";
import {
  labelRodizioPrevisto,
  substituirDivergeDoRodizio,
} from "@/components/folgas/folgas-rodizio-utils";
import {
  podeGerenciarFolgas,
  getFolgasConfig,
  putFolgasConfig,
  getFolgasEscala,
  getFolgasAlertas,
  getFolgasResumoEquidade,
  postFolgasGerar,
  postFolgasAlteracao,
  postFolgasJustificativa,
  getFolgasAlteracoes,
  listUsuariosVinculados,
  type EscalaFolga,
  type FolgasRodizioDia,
} from "@/services/folgas";
import { getApiErrorMessage } from "@/lib/errors";
import { useMinhasFazendas } from "@/hooks/useMinhasFazendas";
import { getDefaultLandingPath } from "@/config/appAccess";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState } from "react";

const ESCALA_VAZIA: EscalaFolga[] = [];

export function useFolgasPage() {
  const { user } = useAuth();
  const { fazendaAtiva, setFazendaAtiva } = useFazendaAtiva();
  const queryClient = useQueryClient();
  const canManage = podeGerenciarFolgas(user?.perfil);
  const isFuncionario = user?.perfil === "FUNCIONARIO";
  const hasAlternativeLanding = getDefaultLandingPath(user?.perfil) !== "/folgas";
  const isAdminLike =
    user?.perfil === "ADMIN" ||
    user?.perfil === "DEVELOPER" ||
    user?.perfil === "GERENTE";

  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const { fazendas: minhasFazendas, isLoading: loadingMinhasFazendas } =
    useMinhasFazendas({ enabled: isAdminLike });

  const fazendaId = useMemo(() => {
    if (isAdminLike) {
      if (minhasFazendas.length === 0) return null;
      if (minhasFazendas.length === 1) return minhasFazendas[0].id;
      const id = fazendaAtiva?.id;
      if (id != null && minhasFazendas.some((f) => f.id === id)) return id;
      return null;
    }
    return fazendaAtiva?.id ?? null;
  }, [isAdminLike, minhasFazendas, fazendaAtiva?.id]);

  const inicioMes = useMemo(() => toYMD(startOfMonth(month)), [month]);
  const fimMes = useMemo(() => toYMD(endOfMonth(month)), [month]);

  /** Mesmas datas da grade (inclui dias do mês anterior/seguinte que completam semanas). */
  const { inicioGrade, fimGrade, calendarioDias } = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return {
      inicioGrade: toYMD(start),
      fimGrade: toYMD(end),
      calendarioDias: eachDayOfInterval({ start, end }),
    };
  }, [month]);

  const { data: config } = useQuery({
    queryKey: ["folgas", "config", fazendaId],
    queryFn: () => getFolgasConfig(fazendaId!),
    enabled: !!fazendaId,
  });

  const { data: escalaPayload, isLoading: loadingEscala } = useQuery({
    queryKey: ["folgas", "escala", fazendaId, inicioGrade, fimGrade],
    queryFn: () => getFolgasEscala(fazendaId!, inicioGrade, fimGrade),
    enabled: !!fazendaId,
  });

  const escala = useMemo(
    () => escalaPayload?.linhas ?? ESCALA_VAZIA,
    [escalaPayload]
  );

  const rodizioPorDiaMap = useMemo(() => {
    const m = new Map<string, FolgasRodizioDia>();
    for (const r of escalaPayload?.rodizio_por_dia ?? []) {
      m.set(parseApiDate(r.data), r);
    }
    return m;
  }, [escalaPayload?.rodizio_por_dia]);

  const { data: alertas = [] } = useQuery({
    queryKey: ["folgas", "alertas", fazendaId, inicioGrade, fimGrade],
    queryFn: () => getFolgasAlertas(fazendaId!, inicioGrade, fimGrade),
    enabled: !!fazendaId,
  });

  const { data: usuariosVinc = [] } = useQuery({
    queryKey: ["folgas", "usuarios", fazendaId],
    queryFn: () => listUsuariosVinculados(fazendaId!),
    enabled: !!fazendaId && canManage,
  });

  const usuariosFolgasPermitidos = useMemo(
    () =>
      usuariosVinc.filter(
        (u) =>
          u.perfil === "FUNCIONARIO" ||
          u.perfil === "GERENTE" ||
          u.perfil === "GESTAO"
      ),
    [usuariosVinc]
  );

  const { data: historico = [] } = useQuery({
    queryKey: ["folgas", "historico", fazendaId],
    queryFn: () => getFolgasAlteracoes(fazendaId!, 30),
    enabled: !!fazendaId && canManage,
  });

  const { data: resumoEquidade = [] } = useQuery({
    queryKey: ["folgas", "resumo-equidade", fazendaId, inicioMes, fimMes],
    queryFn: () => getFolgasResumoEquidade(fazendaId!, inicioMes, fimMes),
    enabled: !!fazendaId && canManage && !!config,
  });

  const porDia = useMemo(() => {
    const m = new Map<string, EscalaFolga[]>();
    for (const e of escala) {
      const k = parseApiDate(e.data);
      m.set(k, [...(m.get(k) ?? []), e]);
    }
    return m;
  }, [escala]);

  const alertaPorDia = useMemo(() => {
    const s = new Set<string>();
    for (const a of alertas) {
      s.add(parseApiDate(a.data));
    }
    return s;
  }, [alertas]);

  /** Lista do card de alertas: só o mês navegado (a API cobre a grade inteira para as células). */
  const alertasNoMesCorrente = useMemo(
    () =>
      alertas.filter((a) => {
        const d = parseApiDate(a.data);
        return d >= inicioMes && d <= fimMes;
      }),
    [alertas, inicioMes, fimMes]
  );

  const equidadeComDesvio = useMemo(
    () => resumoEquidade.some((r) => r.delta !== 0),
    [resumoEquidade]
  );

  const equidadeDestaqueForte = useMemo(
    () => resumoEquidade.some((r) => Math.abs(r.delta) >= 1),
    [resumoEquidade]
  );

  const [cfgOpen, setCfgOpen] = useState(false);
  const [gerarOpen, setGerarOpen] = useState(false);
  const [alterOpen, setAlterOpen] = useState(false);
  const [justOpen, setJustOpen] = useState(false);
  const [diaAlter, setDiaAlter] = useState<string | null>(null);
  const [diaJust, setDiaJust] = useState<string | null>(null);
  const [diaDetalhes, setDiaDetalhes] = useState<string | null>(null);
  const [diaDetalhesOpen, setDiaDetalhesOpen] = useState(false);

  const [cfgAnchor, setCfgAnchor] = useState(toYMD(new Date()));
  const [cfgS0, setCfgS0] = useState<string>("");
  const [cfgS1, setCfgS1] = useState<string>("");
  const [cfgS2, setCfgS2] = useState<string>("");

  const [altUsuario, setAltUsuario] = useState<string>("");
  const [altMotivo, setAltMotivo] = useState("");
  const [altModo, setAltModo] = useState<"substituir" | "adicionar">("substituir");
  const [altExcecao, setAltExcecao] = useState("");
  /** Confirmação extra ao substituir divergindo do 5x1 previsto (só front). */
  const [alterRodizioStep, setAlterRodizioStep] = useState<"form" | "confirm">(
    "form"
  );

  const [justMotivo, setJustMotivo] = useState("");
  const [formError, setFormError] = useState("");
  /** Visualização por fazenda: ao mudar fazenda, o filtro deixa de aplicar sem effect. */
  const [filtroFuncPorFazenda, setFiltroFuncPorFazenda] = useState<{
    fazendaId: number;
    usuarioId: number;
  } | null>(null);

  const filtroFuncionarioId =
    filtroFuncPorFazenda?.fazendaId === fazendaId
      ? filtroFuncPorFazenda.usuarioId
      : null;

  // Se o funcionário selecionado anteriormente não estiver mais entre os
  // perfis permitidos, desconsidera o filtro para não “mascarar” dias.
  const filtroFuncionarioIdEfetivo = useMemo(() => {
    if (filtroFuncionarioId == null) return null;
    return usuariosFolgasPermitidos.some((u) => u.id === filtroFuncionarioId)
      ? filtroFuncionarioId
      : null;
  }, [filtroFuncionarioId, usuariosFolgasPermitidos]);

  const setFiltroFuncionarioSelection = (usuarioId: number | null) => {
    if (usuarioId == null || !fazendaId) {
      setFiltroFuncPorFazenda(null);
      return;
    }
    setFiltroFuncPorFazenda({ fazendaId, usuarioId });
  };

  const filtroVisualAtivo = canManage && filtroFuncionarioIdEfetivo != null;

  const contagemFolgasMesFiltrado = useMemo(() => {
    if (!filtroFuncionarioIdEfetivo) return 0;
    return escala.filter(
      (e) =>
        e.usuario_id === filtroFuncionarioIdEfetivo &&
        parseApiDate(e.data) >= inicioMes &&
        parseApiDate(e.data) <= fimMes
    ).length;
  }, [escala, filtroFuncionarioIdEfetivo, inicioMes, fimMes]);

  const invalidateFolgas = () => {
    queryClient.invalidateQueries({ queryKey: ["folgas"] });
  };

  const saveCfgMutation = useMutation({
    mutationFn: () =>
      putFolgasConfig(fazendaId!, {
        data_anchor: cfgAnchor,
        usuario_slot_0: Number(cfgS0),
        usuario_slot_1: Number(cfgS1),
        usuario_slot_2: Number(cfgS2),
      }),
    onSuccess: () => {
      invalidateFolgas();
      setCfgOpen(false);
      setFormError("");
    },
    onError: (e) => setFormError(getApiErrorMessage(e, "Erro ao salvar.")),
  });

  const gerarMutation = useMutation({
    mutationFn: () => postFolgasGerar(fazendaId!, inicioMes, fimMes),
    onSuccess: () => {
      invalidateFolgas();
      setGerarOpen(false);
      setFormError("");
    },
    onError: (e) => setFormError(getApiErrorMessage(e, "Erro ao gerar.")),
  });

  const alterMutation = useMutation({
    mutationFn: () =>
      postFolgasAlteracao(fazendaId!, {
        data: diaAlter!,
        usuario_id: Number(altUsuario),
        motivo: altMotivo,
        modo: altModo,
        excecao_dia_motivo: altModo === "adicionar" ? altExcecao : undefined,
      }),
    onSuccess: () => {
      invalidateFolgas();
      setAlterOpen(false);
      setAlterRodizioStep("form");
      setAltMotivo("");
      setAltExcecao("");
      setFormError("");
    },
    onError: (e) => {
      const msg = getApiErrorMessage(e, "Erro ao alterar.");
      // Fallback defensivo: alguns unique_violation podem chegar como string genérica ("duplicate key").
      // Neste contexto, isso normalmente indica que o usuário já tem folga registrada na data.
      if (/duplicate key/i.test(msg)) {
        setFormError(
          altModo === "adicionar"
            ? "Já existe folga registrada para este usuário nesta data. Para trocar a folga principal, use modo 'Substituir o dia inteiro'. Para adicionar segunda folga, selecione outro usuário."
            : "Já existe folga registrada para este usuário nesta data. Para trocar a folga principal, selecione outro usuário no modo 'Substituir o dia inteiro'."
        );
        return;
      }
      setFormError(msg);
    },
  });

  const justMutation = useMutation({
    mutationFn: () =>
      postFolgasJustificativa(fazendaId!, {
        data: diaJust!,
        motivo: justMotivo,
      }),
    onSuccess: () => {
      invalidateFolgas();
      setJustOpen(false);
      setJustMotivo("");
      setFormError("");
    },
    onError: (e) => setFormError(getApiErrorMessage(e, "Erro ao justificar.")),
  });

  const abrirAlterar = (ymd: string) => {
    setDiaAlter(ymd);
    const listaDia = porDia.get(ymd) ?? [];
    const rod = rodizioPorDiaMap.get(ymd);
    let inicial = "";
    if (listaDia.length === 1) inicial = String(listaDia[0].usuario_id);
    else if (rod?.tem_folga && rod.usuario_id != null)
      inicial = String(rod.usuario_id);
    setAltUsuario(inicial);
    setAltMotivo("");
    setAltModo("substituir");
    setAltExcecao("");
    setAlterRodizioStep("form");
    setFormError("");
    setAlterOpen(true);
  };

  const executarAlteracao = () => {
    alterMutation.mutate();
  };

  const tentarSalvarAlteracao = () => {
    const rod = diaAlter ? rodizioPorDiaMap.get(diaAlter) : undefined;
    if (
      substituirDivergeDoRodizio(Number(altUsuario), altModo, rod) &&
      !alterMutation.isPending
    ) {
      setAlterRodizioStep("confirm");
      return;
    }
    executarAlteracao();
  };

  const abrirJustificar = (ymd: string) => {
    setDiaJust(ymd);
    setJustMotivo("");
    setFormError("");
    setJustOpen(true);
  };

  const abrirDetalhesDia = (ymd: string) => {
    setDiaDetalhes(ymd);
    setDiaDetalhesOpen(true);
  };

  const fecharDetalhesDia = (open: boolean) => {
    setDiaDetalhesOpen(open);
    if (!open) setDiaDetalhes(null);
  };

  const detalhesData = useMemo(
    () => (diaDetalhes ? new Date(`${diaDetalhes}T00:00:00`) : null),
    [diaDetalhes]
  );
  const detalhesLista = useMemo(
    () => (diaDetalhes ? porDia.get(diaDetalhes) ?? [] : []),
    [diaDetalhes, porDia]
  );
  const detalhesRodizio = useMemo(
    () => (diaDetalhes ? rodizioPorDiaMap.get(diaDetalhes) ?? null : null),
    [diaDetalhes, rodizioPorDiaMap]
  );
  const detalhesMeuDia =
    !!diaDetalhes &&
    isFuncionario &&
    !!user?.id &&
    detalhesLista.some((x) => x.usuario_id === user.id);
  const detalhesExcecaoDia = detalhesLista[0]?.excecao_motivo_dia ?? null;

  const fazendaNomeVisivel =
    fazendaAtiva?.id === fazendaId
      ? fazendaAtiva.nome
      : minhasFazendas.find((f) => f.id === fazendaId)?.nome;

  return {
    user,
    fazendaAtiva,
    setFazendaAtiva,
    canManage,
    isFuncionario,
    hasAlternativeLanding,
    isAdminLike,
    month,
    setMonth,
    minhasFazendas,
    loadingMinhasFazendas,
    fazendaId,
    inicioMes,
    fimMes,
    inicioGrade,
    fimGrade,
    calendarioDias,
    config,
    loadingEscala,
    rodizioPorDiaMap,
    historico,
    resumoEquidade,
    porDia,
    alertaPorDia,
    alertasNoMesCorrente,
    equidadeComDesvio,
    equidadeDestaqueForte,
    cfgOpen,
    setCfgOpen,
    gerarOpen,
    setGerarOpen,
    alterOpen,
    setAlterOpen,
    justOpen,
    setJustOpen,
    diaAlter,
    diaJust,
    diaDetalhes,
    setDiaDetalhes,
    diaDetalhesOpen,
    setDiaDetalhesOpen,
    cfgAnchor,
    setCfgAnchor,
    cfgS0,
    setCfgS0,
    cfgS1,
    setCfgS1,
    cfgS2,
    setCfgS2,
    altUsuario,
    setAltUsuario,
    altMotivo,
    setAltMotivo,
    altModo,
    setAltModo,
    altExcecao,
    setAltExcecao,
    alterRodizioStep,
    setAlterRodizioStep,
    justMotivo,
    setJustMotivo,
    formError,
    setFormError,
    filtroFuncionarioIdEfetivo,
    setFiltroFuncionarioSelection,
    filtroVisualAtivo,
    contagemFolgasMesFiltrado,
    saveCfgMutation,
    gerarMutation,
    alterMutation,
    justMutation,
    abrirAlterar,
    executarAlteracao,
    tentarSalvarAlteracao,
    abrirJustificar,
    abrirDetalhesDia,
    fecharDetalhesDia,
    detalhesData,
    detalhesLista,
    detalhesRodizio,
    detalhesMeuDia,
    detalhesExcecaoDia,
    fazendaNomeVisivel,
    usuariosFolgasPermitidos,
    parseApiDate,
    toYMD,
    addMonths,
    format,
    ptBR,
    labelRodizioPrevisto,
  };
}
