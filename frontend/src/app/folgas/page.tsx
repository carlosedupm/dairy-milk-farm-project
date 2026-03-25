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
import { getApiErrorMessage } from "@/lib/errors";
import { useMinhasFazendas } from "@/hooks/useMinhasFazendas";
import {
  podeGerenciarFolgas,
  getFolgasConfig,
  putFolgasConfig,
  getFolgasEscala,
  getFolgasAlertas,
  postFolgasGerar,
  postFolgasAlteracao,
  postFolgasJustificativa,
  getFolgasAlteracoes,
  listUsuariosVinculados,
  type EscalaFolga,
  type FolgasEscalaConfig,
  type UsuarioVinculado,
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
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

function toYMD(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function parseApiDate(s: string): string {
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function FolgasContent() {
  const { user } = useAuth();
  const { fazendaAtiva, setFazendaAtiva } = useFazendaAtiva();
  const queryClient = useQueryClient();
  const canManage = podeGerenciarFolgas(user?.perfil);
  const isFuncionario = user?.perfil === "FUNCIONARIO";
  const isAdminLike =
    user?.perfil === "ADMIN" || user?.perfil === "DEVELOPER";

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

  const { data: config } = useQuery({
    queryKey: ["folgas", "config", fazendaId],
    queryFn: () => getFolgasConfig(fazendaId!),
    enabled: !!fazendaId,
  });

  const { data: escala = [], isLoading: loadingEscala } = useQuery({
    queryKey: ["folgas", "escala", fazendaId, inicioMes, fimMes],
    queryFn: () => getFolgasEscala(fazendaId!, inicioMes, fimMes),
    enabled: !!fazendaId,
  });

  const { data: alertas = [] } = useQuery({
    queryKey: ["folgas", "alertas", fazendaId, inicioMes, fimMes],
    queryFn: () => getFolgasAlertas(fazendaId!, inicioMes, fimMes),
    enabled: !!fazendaId,
  });

  const { data: usuariosVinc = [] } = useQuery({
    queryKey: ["folgas", "usuarios", fazendaId],
    queryFn: () => listUsuariosVinculados(fazendaId!),
    enabled: !!fazendaId && canManage,
  });

  const { data: historico = [] } = useQuery({
    queryKey: ["folgas", "historico", fazendaId],
    queryFn: () => getFolgasAlteracoes(fazendaId!, 30),
    enabled: !!fazendaId && canManage,
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

  const calendarioDias = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [month]);

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

  const setFiltroFuncionarioSelection = (usuarioId: number | null) => {
    if (usuarioId == null || !fazendaId) {
      setFiltroFuncPorFazenda(null);
      return;
    }
    setFiltroFuncPorFazenda({ fazendaId, usuarioId });
  };

  const filtroVisualAtivo = canManage && filtroFuncionarioId != null;

  const contagemFolgasMesFiltrado = useMemo(() => {
    if (!filtroFuncionarioId) return 0;
    return escala.filter(
      (e) =>
        e.usuario_id === filtroFuncionarioId &&
        parseApiDate(e.data) >= inicioMes &&
        parseApiDate(e.data) <= fimMes
    ).length;
  }, [escala, filtroFuncionarioId, inicioMes, fimMes]);

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
      setAltMotivo("");
      setAltExcecao("");
      setFormError("");
    },
    onError: (e) => setFormError(getApiErrorMessage(e, "Erro ao alterar.")),
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
    setAltUsuario("");
    setAltMotivo("");
    setAltModo("substituir");
    setAltExcecao("");
    setFormError("");
    setAlterOpen(true);
  };

  const abrirJustificar = (ymd: string) => {
    setDiaJust(ymd);
    setJustMotivo("");
    setFormError("");
    setJustOpen(true);
  };

  const celulaDia = (d: Date) => {
    const ymd = toYMD(d);
    const fora = !isSameMonth(d, month);
    const lista = porDia.get(ymd) ?? [];
    const excecaoMotivoDia = lista[0]?.excecao_motivo_dia ?? null;
    const alerta = alertaPorDia.has(ymd);
    const meuDia =
      isFuncionario &&
      user?.id &&
      lista.some((x) => x.usuario_id === user.id);

    const listaVisivel =
      filtroVisualAtivo && filtroFuncionarioId != null
        ? lista.filter((e) => e.usuario_id === filtroFuncionarioId)
        : lista;
    const diaDestaqueFiltro =
      filtroVisualAtivo && !fora && listaVisivel.length > 0;
    const diaEsmaecidoFiltro =
      filtroVisualAtivo && !fora && listaVisivel.length === 0;
    const mostrarExcecaoDia =
      excecaoMotivoDia &&
      (canManage || (isFuncionario && meuDia)) &&
      (!filtroVisualAtivo || diaDestaqueFiltro);

    return (
      <div
        key={ymd}
        className={`min-h-[88px] border p-1 text-sm rounded-md ${
          fora ? "bg-muted/40 text-muted-foreground" : "bg-card"
        } ${alerta ? "ring-2 ring-destructive/60" : ""} ${
          diaDestaqueFiltro && !alerta
            ? "ring-2 ring-primary/50 bg-primary/5"
            : ""
        } ${diaEsmaecidoFiltro ? "opacity-45" : ""}`}
      >
        <div className="font-medium">{format(d, "d")}</div>
        <div className="space-y-0.5 mt-1">
          {listaVisivel.map((e) => (
            <div key={e.id} className="text-xs">
              <div className="truncate">
                {e.usuario_nome || `Usuário #${e.usuario_id}`}
                {e.origem === "MANUAL" && (
                  <span className="text-muted-foreground"> (aj.)</span>
                )}
                {e.justificada && <span className="text-muted-foreground"> ✓</span>}
              </div>
              {e.motivo &&
                (canManage || (isFuncionario && user?.id && e.usuario_id === user.id)) && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground truncate">
                    Motivo: {e.motivo}
                  </div>
                )}
            </div>
          ))}
          {!diaEsmaecidoFiltro &&
            listaVisivel.length === 0 &&
            !fora &&
            !excecaoMotivoDia && (
              <span className="text-xs text-muted-foreground">—</span>
            )}

          {!fora && mostrarExcecaoDia && (
            <div className="mt-1 text-[11px] text-muted-foreground truncate">
              Exceção do dia: {excecaoMotivoDia}
            </div>
          )}
        </div>
        {!fora && canManage && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 h-8 w-full text-xs"
            onClick={() => abrirAlterar(ymd)}
          >
            Alterar dia
          </Button>
        )}
        {!fora && isFuncionario && meuDia && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-1 h-8 w-full text-xs"
            onClick={() => abrirJustificar(ymd)}
          >
            Justificar
          </Button>
        )}
      </div>
    );
  };

  return (
    <PageContainer variant="default">
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <BackLink href="/">Voltar</BackLink>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <CalendarDays className="h-6 w-6" />
          Escala de folgas (5x1)
        </h1>
        {isAdminLike && minhasFazendas.length > 1 && (
          <div className="flex flex-col gap-2 sm:min-w-[240px]">
            <Label>Fazenda</Label>
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
                  /* validação do contexto; silencioso na troca rápida */
                }
              }}
            >
              <SelectTrigger className="min-h-[44px]">
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
      </div>

      {!fazendaId && !(isAdminLike && loadingMinhasFazendas) && (
        <p className="mt-6 text-muted-foreground">
          {isAdminLike && minhasFazendas.length === 0
            ? "Não há fazendas vinculadas à sua conta."
            : isAdminLike && minhasFazendas.length > 1
              ? "Selecione uma fazenda (acima ou no menu superior)."
              : "Não foi possível determinar a fazenda ativa. Verifique o vínculo da sua conta ou selecione uma fazenda no menu superior."}
        </p>
      )}

      {fazendaId && (
        <>
          {alertas.length > 0 && (
            <Card className="mt-4 border-destructive/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Alertas no mês
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {alertas.map((a) => (
                  <p key={a.data}>
                    <strong>{parseApiDate(a.data)}</strong>: {a.motivo_alerta} (
                    {a.quantidade_folga} folgas)
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
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
            <span className="text-base font-medium capitalize min-w-[160px] text-center">
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

          {canManage && fazendaId && (
            <div className="mt-3 flex flex-col gap-2 sm:max-w-md">
              <Label htmlFor="folgas-filtro-func">Visualizar folgas de</Label>
              <Select
                value={
                  filtroFuncionarioId != null
                    ? String(filtroFuncionarioId)
                    : "__todos__"
                }
                onValueChange={(v) =>
                  setFiltroFuncionarioSelection(
                    v === "__todos__" ? null : Number(v)
                  )
                }
              >
                <SelectTrigger id="folgas-filtro-func" className="min-h-[44px]">
                  <SelectValue placeholder="Todos os funcionários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todos__">Todos os funcionários</SelectItem>
                  {usuariosVinc
                    .slice()
                    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                    .map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.perfil && u.perfil !== "FUNCIONARIO"
                          ? `${u.nome} (${u.perfil})`
                          : u.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {filtroVisualAtivo && (
                <p className="text-sm text-muted-foreground">
                  {contagemFolgasMesFiltrado} dia(s) de folga neste mês para o
                  funcionário selecionado. Demais dias aparecem esmaecidos.
                </p>
              )}
            </div>
          )}

          {!config && canManage && (
            <p className="mt-2 text-sm text-muted-foreground">
              Defina primeiro a configuração (âncora e os três funcionários no rodízio).
            </p>
          )}

          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 mt-1">
            {loadingEscala
              ? calendarioDias.map((d) => (
                  <div
                    key={toYMD(d)}
                    className="min-h-[88px] border rounded-md animate-pulse bg-muted/30"
                  />
                ))
              : calendarioDias.map((d) => celulaDia(d))}
          </div>

          {canManage && historico.length > 0 && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="text-base">Histórico recente (gestão)</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2 max-h-64 overflow-y-auto">
                {historico.map((h) => (
                  <div key={h.id} className="border-b pb-2">
                    <span className="text-muted-foreground">
                      {format(new Date(h.created_at), "dd/MM/yyyy HH:mm")}
                    </span>{" "}
                    — <strong>{h.tipo}</strong>
                    {h.detalhes && (
                      <pre className="text-xs mt-1 whitespace-pre-wrap break-all">
                        {JSON.stringify(h.detalhes, null, 0)}
                      </pre>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={cfgOpen} onOpenChange={setCfgOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configuração 5x1</DialogTitle>
            <DialogDescription>
              Data âncora (ex.: primeira quarta do João). Ordene os três usuários vinculados
              à fazenda: slot 1 folga no 1º dia do ciclo, slot 2 no 2º, slot 3 no 3º; depois
              três dias sem folga no rodízio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="anchor">Data âncora</Label>
              <Input
                id="anchor"
                type="date"
                value={cfgAnchor}
                onChange={(e) => setCfgAnchor(e.target.value)}
                className="min-h-[44px]"
              />
            </div>
            {["Slot 1 (1º dia folga)", "Slot 2", "Slot 3"].map((label, i) => {
              const val = [cfgS0, cfgS1, cfgS2][i];
              const set = [setCfgS0, setCfgS1, setCfgS2][i];
              return (
                <div key={label} className="space-y-2">
                  <Label>{label}</Label>
                  <Select value={val} onValueChange={set}>
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="Usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {usuariosVinc.map((u) => (
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
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCfgOpen(false)}>
              Cancelar
            </Button>
            <Button
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
            <DialogDescription>
              Preenche o mês visível ({inicioMes} a {fimMes}), mantendo dias já ajustados
              manualmente.
            </DialogDescription>
          </DialogHeader>
          {formError && (
            <p className="text-sm text-destructive">{formError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setGerarOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => gerarMutation.mutate()}
              disabled={gerarMutation.isPending}
            >
              Gerar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={alterOpen} onOpenChange={setAlterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar dia {diaAlter}</DialogTitle>
            <DialogDescription>
              Substitui todos os registros do dia ou adiciona uma segunda folga (exige
              motivo de exceção do dia).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Quem folga</Label>
              <Select value={altUsuario} onValueChange={setAltUsuario}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {usuariosVinc.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input
                value={altMotivo}
                onChange={(e) => setAltMotivo(e.target.value)}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Modo</Label>
              <Select
                value={altModo}
                onValueChange={(v) =>
                  setAltModo(v as "substituir" | "adicionar")
                }
              >
                <SelectTrigger className="min-h-[44px]">
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
                <Label>Motivo da exceção do dia (obrigatório se 2+ folgas)</Label>
                <Input
                  value={altExcecao}
                  onChange={(e) => setAltExcecao(e.target.value)}
                  className="min-h-[44px]"
                />
              </div>
            )}
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlterOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => alterMutation.mutate()}
              disabled={alterMutation.isPending || !altUsuario || !altMotivo}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={justOpen} onOpenChange={setJustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Justificativa — {diaJust}</DialogTitle>
            <DialogDescription>
              Registre o motivo da sua folga neste dia. Apenas o perfil Funcionário pode
              enviar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input
                value={justMotivo}
                onChange={(e) => setJustMotivo(e.target.value)}
                className="min-h-[44px]"
              />
            </div>
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJustOpen(false)}>
              Cancelar
            </Button>
            <Button
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
