"use client";

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
import { FolgasDiaDetalhesDialog } from "@/components/folgas/FolgasDiaDetalhesDialog";
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
import { useFolgasPage } from "@/hooks/useFolgasPage";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Info,
} from "lucide-react";

function FolgasContent() {
  const {
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
  } = useFolgasPage();

  return (
    <PageContainer variant="default">
      <div className="mb-4">
        {hasAlternativeLanding && <BackLink href="/">Voltar</BackLink>}
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
            <Card className="border-destructive/50 hidden md:block">
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

          {alertasNoMesCorrente.length > 0 && (
            <details className="md:hidden rounded-md border border-destructive/50 px-3 py-2">
              <summary className="cursor-pointer list-none text-base font-medium text-destructive">
                Alertas no mês ({alertasNoMesCorrente.length})
              </summary>
              <div className="mt-2 space-y-2 text-base">
                {alertasNoMesCorrente.map((a) => (
                  <p key={a.data}>
                    <strong>{parseApiDate(a.data)}</strong>: {a.motivo_alerta} ({a.quantidade_folga} folgas)
                  </p>
                ))}
              </div>
            </details>
          )}

          {canManage && config && resumoEquidade.length > 0 && (
            <Card
              className={`mt-6 hidden md:block ${equidadeDestaqueForte ? "border-amber-500/50 bg-amber-500/[0.06]" : "border-border"}`}
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

          {canManage && config && resumoEquidade.length > 0 && (
            <details
              className={`mt-6 rounded-md border px-3 py-2 md:hidden ${equidadeDestaqueForte ? "border-amber-500/50 bg-amber-500/[0.06]" : "border-border"}`}
            >
              <summary className="cursor-pointer list-none text-base font-medium">
                Equidade no mês (informativo)
              </summary>
              <div className="mt-3 space-y-3 text-base">
                <p className="text-muted-foreground">
                  Comparativo entre folgas <strong>registradas</strong> e o que o rodízio
                  <strong> prevê</strong> para cada slot.
                </p>
                {resumoEquidade.map((r) => (
                  <p key={r.usuario_id}>
                    <strong>{r.usuario_nome || `Usuário #${r.usuario_id}`}</strong>
                    {" — "}
                    {r.folgas_registradas} registrada(s) vs {r.folgas_teoricas_auto} prevista(s)
                    {r.delta !== 0 ? ` (Δ ${r.delta > 0 ? "+" : ""}${r.delta})` : ""}
                  </p>
                ))}
              </div>
            </details>
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
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
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
                  <span className="text-center text-base font-medium capitalize">
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
                </div>
                {canManage && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      className="min-h-[44px] w-full"
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
                      className="min-h-[44px] w-full"
                      onClick={() => {
                        setFormError("");
                        setGerarOpen(true);
                      }}
                      disabled={!config}
                    >
                      Gerar mês automático
                    </Button>
                  </div>
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
                              onOpenDetails={abrirDetalhesDia}
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

      <FolgasDiaDetalhesDialog
        open={diaDetalhesOpen}
        onOpenChange={fecharDetalhesDia}
        date={detalhesData}
        lista={detalhesLista}
        rodizioDia={detalhesRodizio}
        excecaoMotivoDia={detalhesExcecaoDia}
        canManage={canManage}
        isFuncionario={isFuncionario}
        meuDia={detalhesMeuDia}
        userId={user?.id}
        onAlterarDia={() => {
          if (!diaDetalhes) return;
          setDiaDetalhesOpen(false);
          abrirAlterar(diaDetalhes);
        }}
        onJustificarDia={() => {
          if (!diaDetalhes) return;
          setDiaDetalhesOpen(false);
          abrirJustificar(diaDetalhes);
        }}
      />
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
