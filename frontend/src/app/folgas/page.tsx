"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { FolgasCalendarioDia } from "@/components/folgas/FolgasCalendarioDia";
import { FolgasHistoricoTable } from "@/components/folgas/FolgasHistoricoTable";
import { parseApiDate, toYMD } from "@/components/folgas/folgas-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getApiErrorMessage } from "@/lib/errors";
import { useMinhasFazendas } from "@/hooks/useMinhasFazendas";
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
  type FolgasEscalaConfig,
  type FolgasRodizioDia,
} from "@/services/folgas";
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
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Info,
} from "lucide-react";

function FolgasContent() {
  const { user } = useAuth();
  const { fazendaAtiva, setFazendaAtiva } = useFazendaAtiva();
  const queryClient = useQueryClient();
  const canManage = podeGerenciarFolgas(user?.perfil);
  const isFuncionario = user?.perfil === "FUNCIONARIO";
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

  const fazendaNomeVisivel =
    fazendaAtiva?.id === fazendaId
      ? fazendaAtiva.nome
      : minhasFazendas.find((f) => f.id === fazendaId)?.nome;

  return (
    <PageContainer variant="default">
      <div className="mb-4">
        <BackLink href="/">Voltar</BackLink>
      </div>

      {!fazendaId && !(isAdminLike && loadingMinhasFazendas) && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-base text-muted-foreground">
              {isAdminLike && minhasFazendas.length === 0
                ? "Não há fazendas vinculadas à sua conta."
                : isAdminLike && minhasFazendas.length > 1
                  ? "Selecione uma fazenda abaixo ou no menu superior."
                  : "Não foi possível determinar a fazenda ativa. Verifique o vínculo da sua conta ou selecione uma fazenda no menu superior."}
            </p>
          </CardContent>
        </Card>
      )}

      {fazendaId && (
        <>
          {alertasNoMesCorrente.length > 0 && (
            <Card className="border-destructive/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
                  Alertas no mês
                </CardTitle>
              </CardHeader>
              <CardContent className="text-base space-y-2">
                {alertasNoMesCorrente.map((a) => (
                  <p key={a.data}>
                    <strong>{parseApiDate(a.data)}</strong>: {a.motivo_alerta} (
                    {a.quantidade_folga} folgas)
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          {canManage && config && resumoEquidade.length > 0 && (
            <Card
              className={`mt-6 ${equidadeDestaqueForte ? "border-amber-500/50 bg-amber-500/[0.06]" : "border-border"}`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
                  Equidade no mês (informativo)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-base">
                <p className="text-muted-foreground">
                  Comparativo entre folgas <strong>registradas</strong> no período e dias em que o
                  rodízio 5x1 <strong>prevê</strong> folga para cada slot. Não bloqueia alterações.
                </p>
                {equidadeComDesvio && (
                  <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-950 dark:text-amber-50">
                    Pode haver desequilíbrio em relação ao rodízio teórico neste período; confira as
                    trocas manuais e gere de novo o automático se fizer sentido.
                  </p>
                )}
                <ul className="space-y-1.5">
                  {resumoEquidade.map((r) => (
                    <li
                      key={r.usuario_id}
                      className={
                        r.delta !== 0
                          ? "font-medium text-amber-900 dark:text-amber-100"
                          : ""
                      }
                    >
                      <strong>{r.usuario_nome || `Usuário #${r.usuario_id}`}</strong>
                      {" — "}
                      {r.folgas_registradas} registrada(s) vs {r.folgas_teoricas_auto} prevista(s)
                      {r.delta !== 0 ? ` (Δ ${r.delta > 0 ? "+" : ""}${r.delta})` : ""}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card className={alertasNoMesCorrente.length > 0 || (canManage && config && resumoEquidade.length > 0) ? "mt-6" : ""}>
            <CardHeader className="flex flex-col gap-4 space-y-0 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                  <CalendarDays className="h-5 w-5 shrink-0" aria-hidden />
                  Escala de folgas (5x1)
                </CardTitle>
                {fazendaNomeVisivel ? (
                  <p className="text-base text-muted-foreground">
                    {fazendaNomeVisivel}
                  </p>
                ) : null}
              </div>
              {isAdminLike && minhasFazendas.length > 1 && (
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[240px]">
                  <Label htmlFor="folgas-fazenda">Fazenda</Label>
                  <Select
                    value={
                      fazendaAtiva &&
                      minhasFazendas.some((f) => f.id === fazendaAtiva.id)
                        ? String(fazendaAtiva.id)
                        : ""
                    }
                    onValueChange={async (v) => {
                      const id = Number(v);
                      const f = minhasFazendas.find((x) => x.id === id);
                      if (!f) return;
                      try {
                        await setFazendaAtiva(f);
                      } catch {
                        /* validação do contexto */
                      }
                    }}
                  >
                    <SelectTrigger id="folgas-fazenda" className="min-h-[44px]">
                      <SelectValue placeholder="Selecione a fazenda" />
                    </SelectTrigger>
                    <SelectContent>
                      {minhasFazendas.map((f) => (
                        <SelectItem key={f.id} value={String(f.id)}>
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="min-h-[44px] min-w-[44px]"
                  onClick={() => setMonth((m) => addMonths(m, -1))}
                  aria-label="Mês anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="min-w-[160px] text-center text-base font-medium capitalize">
                  {format(month, "MMMM yyyy", { locale: ptBR })}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="min-h-[44px] min-w-[44px]"
                  onClick={() => setMonth((m) => addMonths(m, 1))}
                  aria-label="Próximo mês"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
                {canManage && (
                  <>
                    <Button
                      type="button"
                      className="min-h-[44px]"
                      onClick={() => {
                        setFormError("");
                        if (config) {
                          setCfgAnchor(parseApiDate(config.data_anchor));
                          setCfgS0(String(config.usuario_slot_0));
                          setCfgS1(String(config.usuario_slot_1));
                          setCfgS2(String(config.usuario_slot_2));
                        } else {
                          setCfgAnchor(toYMD(new Date()));
                          setCfgS0("");
                          setCfgS1("");
                          setCfgS2("");
                        }
                        setCfgOpen(true);
                      }}
                    >
                      Configurar escala
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-[44px]"
                      onClick={() => {
                        setFormError("");
                        setGerarOpen(true);
                      }}
                      disabled={!config}
                    >
                      Gerar mês automático
                    </Button>
                  </>
                )}
              </div>

              {canManage && (
                <div className="flex max-w-md flex-col gap-2">
                  <Label htmlFor="folgas-filtro-func">Visualizar folgas de</Label>
                  <Select
                    value={
                      filtroFuncionarioIdEfetivo != null
                        ? String(filtroFuncionarioIdEfetivo)
                        : "__todos__"
                    }
                    onValueChange={(v) =>
                      setFiltroFuncionarioSelection(
                        v === "__todos__" ? null : Number(v)
                      )
                    }
                  >
                    <SelectTrigger
                      id="folgas-filtro-func"
                      className="min-h-[44px]"
                    >
                      <SelectValue placeholder="Todos os funcionários" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__todos__">
                        Todos os funcionários
                      </SelectItem>
                      {usuariosFolgasPermitidos
                        .slice()
                        .sort((a, b) =>
                          a.nome.localeCompare(b.nome, "pt-BR")
                        )
                        .map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.perfil === "FUNCIONARIO"
                              ? u.nome
                              : `${u.nome} (GERENTE)`}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {filtroVisualAtivo && (
                    <p className="text-base text-muted-foreground">
                      {contagemFolgasMesFiltrado} dia(s) de folga neste mês para
                      o funcionário selecionado. Demais dias aparecem esmaecidos.
                    </p>
                  )}
                </div>
              )}

              {!config && canManage && (
                <p className="text-base text-muted-foreground">
                  Defina primeiro a configuração (âncora e os três funcionários
                  no rodízio).
                </p>
              )}

              {canManage && config && equidadeComDesvio && (
                <p
                  className="rounded-md border border-amber-500/35 bg-amber-500/[0.08] px-3 py-2 text-base text-amber-950 dark:text-amber-50"
                  role="status"
                >
                  Aviso: no mês há diferença entre folgas registradas e o previsto pelo rodízio
                  5x1 para algum profissional. Veja o painel &quot;Equidade&quot; acima — as ações de
                  alterar e gerar continuam permitidas.
                </p>
              )}

              <TooltipProvider delayDuration={350} skipDelayDuration={150}>
                <div>
                  <div className="grid grid-cols-7 gap-1 text-center text-base font-medium text-muted-foreground">
                    {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                      (d) => (
                        <div key={d}>{d}</div>
                      )
                    )}
                  </div>
                  <div className="mt-1 grid grid-cols-7 gap-1">
                    {loadingEscala
                      ? calendarioDias.map((d) => (
                          <div
                            key={toYMD(d)}
                            className="min-h-[88px] rounded-md border animate-pulse bg-muted/30"
                          />
                        ))
                      : calendarioDias.map((d) => {
                          const ymd = toYMD(d);
                          const lista = porDia.get(ymd) ?? [];
                          const meuDia =
                            !!(
                              isFuncionario &&
                              user?.id &&
                              lista.some((x) => x.usuario_id === user.id)
                            );
                          return (
                            <FolgasCalendarioDia
                              key={ymd}
                              d={d}
                              month={month}
                              lista={lista}
                              rodizioDia={rodizioPorDiaMap.get(ymd) ?? null}
                              temAlerta={alertaPorDia.has(ymd)}
                              meuDia={meuDia}
                              isFuncionario={isFuncionario}
                              canManage={canManage}
                              filtroVisualAtivo={filtroVisualAtivo}
                              filtroFuncionarioId={filtroFuncionarioIdEfetivo}
                              userId={user?.id}
                              onAlterar={abrirAlterar}
                              onJustificar={abrirJustificar}
                            />
                          );
                        })}
                  </div>
                </div>
              </TooltipProvider>
            </CardContent>
          </Card>

          {canManage && historico.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">
                  Histórico recente (gestão)
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-64 overflow-y-auto">
                <FolgasHistoricoTable items={historico} />
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={cfgOpen} onOpenChange={setCfgOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configuração 5x1</DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              Data âncora (ex.: primeira quarta do João). Ordene os três usuários vinculados
              à fazenda: slot 1 folga no 1º dia do ciclo, slot 2 no 2º, slot 3 no 3º; depois
              três dias sem folga no rodízio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="folgas-cfg-anchor">Data âncora</Label>
              <DatePicker
                id="folgas-cfg-anchor"
                value={cfgAnchor}
                onChange={setCfgAnchor}
                placeholder="Selecione a data âncora"
              />
            </div>
            {["Slot 1 (1º dia folga)", "Slot 2", "Slot 3"].map((label, i) => {
              const val = [cfgS0, cfgS1, cfgS2][i];
              const set = [setCfgS0, setCfgS1, setCfgS2][i];
              const slotId = `folgas-cfg-slot-${i}`;
              return (
                <div key={label} className="space-y-2">
                  <Label htmlFor={slotId}>{label}</Label>
                  <Select value={val} onValueChange={set}>
                    <SelectTrigger id={slotId} className="min-h-[44px]">
                      <SelectValue placeholder="Usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {usuariosFolgasPermitidos.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.nome} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
            {formError && (
              <p className="text-base text-destructive">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCfgOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={() => saveCfgMutation.mutate()}
              disabled={saveCfgMutation.isPending}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={gerarOpen} onOpenChange={setGerarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar escala automática</DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              Preenche o mês visível ({inicioMes} a {fimMes}), mantendo dias já ajustados
              manualmente.
            </DialogDescription>
          </DialogHeader>
          {formError && (
            <p className="text-base text-destructive">{formError}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setGerarOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={() => gerarMutation.mutate()}
              disabled={gerarMutation.isPending}
            >
              Gerar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={alterOpen}
        onOpenChange={(open) => {
          setAlterOpen(open);
          if (!open) setAlterRodizioStep("form");
        }}
      >
        <DialogContent>
          {alterRodizioStep === "form" ? (
            <>
              <DialogHeader>
                <DialogTitle>Alterar dia {diaAlter}</DialogTitle>
                <DialogDescription className="text-base text-muted-foreground">
                  Substitui todos os registros do dia ou adiciona uma segunda folga (exige
                  motivo de exceção do dia).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5">
                {diaAlter && (
                  <p className="rounded-md border bg-muted/40 px-3 py-2 text-base">
                    <strong className="font-medium">Previsto pelo rodízio:</strong>{" "}
                    {labelRodizioPrevisto(
                      rodizioPorDiaMap.get(diaAlter) ?? undefined
                    ) ?? "Sem configuração ou dados de rodízio para esta data."}
                  </p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="folgas-alt-usuario">Quem folga</Label>
                  <Select value={altUsuario} onValueChange={setAltUsuario}>
                    <SelectTrigger id="folgas-alt-usuario" className="min-h-[44px]">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {usuariosFolgasPermitidos.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="folgas-alt-motivo">Motivo</Label>
                  <Input
                    id="folgas-alt-motivo"
                    value={altMotivo}
                    onChange={(e) => setAltMotivo(e.target.value)}
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="folgas-alt-modo">Modo</Label>
                  <Select
                    value={altModo}
                    onValueChange={(v) =>
                      setAltModo(v as "substituir" | "adicionar")
                    }
                  >
                    <SelectTrigger id="folgas-alt-modo" className="min-h-[44px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="substituir">Substituir o dia inteiro</SelectItem>
                      <SelectItem value="adicionar">Adicionar outra folga</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {altModo === "adicionar" && (
                  <div className="space-y-2">
                    <Label htmlFor="folgas-alt-excecao">
                      Motivo da exceção do dia (obrigatório se 2+ folgas)
                    </Label>
                    <Input
                      id="folgas-alt-excecao"
                      value={altExcecao}
                      onChange={(e) => setAltExcecao(e.target.value)}
                      className="min-h-[44px]"
                    />
                  </div>
                )}
                {formError && (
                  <p className="text-base text-destructive">{formError}</p>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAlterOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="lg"
                  onClick={() => tentarSalvarAlteracao()}
                  disabled={alterMutation.isPending || !altUsuario || !altMotivo}
                >
                  Salvar
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Confirmar alteração fora do rodízio</DialogTitle>
                <DialogDescription className="text-base text-muted-foreground">
                  Você está registrando uma folga diferente do previsto pelo ciclo 5x1 nesta data.
                  Deseja continuar?
                </DialogDescription>
              </DialogHeader>
              {formError && (
                <p className="text-base text-destructive">{formError}</p>
              )}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAlterRodizioStep("form")}
                >
                  Voltar
                </Button>
                <Button
                  type="button"
                  size="lg"
                  onClick={() => executarAlteracao()}
                  disabled={alterMutation.isPending}
                >
                  Confirmar e salvar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={justOpen} onOpenChange={setJustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Justificativa — {diaJust}</DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              Registre o motivo da sua folga neste dia. Apenas o perfil Funcionário pode
              enviar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="folgas-just-motivo">Motivo</Label>
              <Input
                id="folgas-just-motivo"
                value={justMotivo}
                onChange={(e) => setJustMotivo(e.target.value)}
                className="min-h-[44px]"
              />
            </div>
            {formError && (
              <p className="text-base text-destructive">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setJustOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={() => justMutation.mutate()}
              disabled={justMutation.isPending || !justMotivo}
            >
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

export default function FolgasPage() {
  return (
    <ProtectedRoute>
      <FolgasContent />
    </ProtectedRoute>
  );
}
