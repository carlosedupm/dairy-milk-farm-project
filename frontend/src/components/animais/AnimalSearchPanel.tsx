"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getApiErrorMessage } from "@/lib/errors";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  type Animal,
  type AnimalContexto,
  getContexto,
  searchByIdentificacao,
} from "@/services/animais";
import {
  MOTIVO_RESTRICAO_LEITE_LABELS,
  type MotivoRestricaoLeite,
} from "@/services/restricoesLeite";
import {
  buildAnimalContextoLinhasResumo,
  formatAnimalContextoMeta,
  formatAnimalContextoStatusLinha,
} from "@/components/animais/animalResumoUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type AnimalSearchPanelProps = {
  /** Fecha o diálogo / painel ao navegar para a ficha do animal */
  onAntesNavegarDetalhe?: () => void;
  /** Foco inicial no campo (ex.: ao abrir o diálogo global) */
  autoFocus?: boolean;
  /** Oculta o campo de entrada (busca controlada pelo header) */
  hideInput?: boolean;
  /** Termo controlado externamente (ex.: input fixo no header) */
  identificacao?: string;
  onIdentificacaoChange?: (value: string) => void;
  /** `header`: menos texto de ajuda no overlay */
  variant?: "default" | "header";
};

const BUSCA_DEBOUNCE_MS = 400;

export function AnimalSearchPanel({
  onAntesNavegarDetalhe,
  autoFocus = false,
  hideInput = false,
  identificacao: identificacaoControlada,
  onIdentificacaoChange,
  variant = "default",
}: AnimalSearchPanelProps) {
  const [identificacaoInterno, setIdentificacaoInterno] = useState("");
  const isControlled =
    identificacaoControlada !== undefined &&
    onIdentificacaoChange !== undefined;
  const identificacao = isControlled
    ? identificacaoControlada
    : identificacaoInterno;
  const setIdentificacao = isControlled
    ? onIdentificacaoChange
    : setIdentificacaoInterno;
  const debouncedTermo = useDebouncedValue(identificacao.trim(), BUSCA_DEBOUNCE_MS);
  const buscaSeq = useRef(0);

  const [resultados, setResultados] = useState<Animal[]>([]);
  const [totalResultados, setTotalResultados] = useState(0);
  const [contexto, setContexto] = useState<AnimalContexto | null>(null);
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [loadingMais, setLoadingMais] = useState(false);
  const [loadingContexto, setLoadingContexto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [buscaExecutada, setBuscaExecutada] = useState(false);

  const aguardandoDebounce =
    identificacao.trim().length > 0 &&
    identificacao.trim() !== debouncedTermo &&
    !loadingBusca &&
    !loadingContexto &&
    !loadingMais;

  const executarBusca = useCallback(async (termo: string) => {
    const trimmed = termo.trim();
    const seq = ++buscaSeq.current;

    if (!trimmed) {
      setResultados([]);
      setTotalResultados(0);
      setContexto(null);
      setBuscaExecutada(false);
      setErro(null);
      setLoadingBusca(false);
      setLoadingMais(false);
      setLoadingContexto(false);
      return;
    }

    setLoadingBusca(true);
    setErro(null);
    setContexto(null);

    try {
      const page = await searchByIdentificacao(trimmed, { offset: 0 });
      if (seq !== buscaSeq.current) return;

      setResultados(page.animais);
      setTotalResultados(page.total);
      setBuscaExecutada(true);

      if (page.total === 1 && page.animais.length === 1) {
        setLoadingContexto(true);
        const ctx = await getContexto(page.animais[0].id);
        if (seq !== buscaSeq.current) return;
        setContexto(ctx);
      }
    } catch (err: unknown) {
      if (seq !== buscaSeq.current) return;
      setErro(
        getApiErrorMessage(err, "Não foi possível pesquisar o animal agora."),
      );
      setResultados([]);
      setTotalResultados(0);
      setBuscaExecutada(true);
    } finally {
      if (seq === buscaSeq.current) {
        setLoadingBusca(false);
        setLoadingContexto(false);
      }
    }
  }, []);

  const carregarMais = useCallback(async () => {
    const trimmed = identificacao.trim();
    if (!trimmed || resultados.length >= totalResultados) {
      return;
    }

    const seq = ++buscaSeq.current;
    setLoadingMais(true);
    setErro(null);

    try {
      const page = await searchByIdentificacao(trimmed, {
        offset: resultados.length,
      });
      if (seq !== buscaSeq.current) return;

      setResultados((prev) => [...prev, ...page.animais]);
      setTotalResultados(page.total);
    } catch (err: unknown) {
      if (seq !== buscaSeq.current) return;
      setErro(
        getApiErrorMessage(err, "Não foi possível carregar mais resultados."),
      );
    } finally {
      if (seq === buscaSeq.current) {
        setLoadingMais(false);
      }
    }
  }, [identificacao, resultados.length, totalResultados]);

  useEffect(() => {
    void executarBusca(debouncedTermo);
  }, [debouncedTermo, executarBusca]);

  function handleSubmitRapido(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void executarBusca(identificacao.trim());
  }

  async function handleSelecionarAnimal(animalId: number) {
    setLoadingContexto(true);
    setErro(null);
    try {
      const ctx = await getContexto(animalId);
      setContexto(ctx);
    } catch (err: unknown) {
      setErro(
        getApiErrorMessage(
          err,
          "Não foi possível carregar os detalhes do animal.",
        ),
      );
      setContexto(null);
    } finally {
      setLoadingContexto(false);
    }
  }

  const metaLinha = contexto
    ? formatAnimalContextoMeta(contexto.animal)
    : null;
  const statusLinha = contexto
    ? formatAnimalContextoStatusLinha(contexto.animal)
    : null;
  const linhasDetalhe = contexto
    ? buildAnimalContextoLinhasResumo({
        animal: contexto.animal,
        resumo_producao: contexto.resumo_producao,
        gestacao_resumo: contexto.gestacao_resumo,
      })
    : [];

  const showInputHelp =
    variant === "default" ||
    loadingBusca ||
    loadingContexto ||
    loadingMais ||
    aguardandoDebounce;

  const temMaisResultados = resultados.length < totalResultados;

  return (
    <div className="min-w-0 space-y-4">
      {!hideInput ? (
        <form onSubmit={handleSubmitRapido} className="min-w-0 space-y-1.5">
          <Input
            value={identificacao}
            onChange={(event) => setIdentificacao(event.target.value)}
            placeholder="Ex.: 123, brinco, nome ou parte da identificação"
            aria-label="Pesquisar animal por identificação"
            autoFocus={autoFocus}
            aria-busy={loadingBusca || loadingContexto || loadingMais}
            className="min-w-0"
          />
          {showInputHelp ? (
            <p className="text-xs text-muted-foreground">
              {loadingBusca || loadingContexto || loadingMais
                ? "Pesquisando…"
                : aguardandoDebounce
                  ? "Aguardando pausa na digitação…"
                  : variant === "default"
                    ? "Os resultados aparecem automaticamente após você parar de digitar."
                    : null}
            </p>
          ) : null}
        </form>
      ) : null}

      {erro ? <p className="text-sm text-destructive">{erro}</p> : null}

      {buscaExecutada && !loadingBusca && totalResultados === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum animal encontrado para essa identificação.
        </p>
      ) : null}

      {totalResultados > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Mostrando {resultados.length} de {totalResultados} resultados
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {resultados.map((animal) => (
              <Button
                key={animal.id}
                type="button"
                variant={
                  contexto?.animal.id === animal.id ? "default" : "outline"
                }
                className="h-auto min-h-11 justify-start whitespace-normal py-2.5 text-left break-words"
                onClick={() => handleSelecionarAnimal(animal.id)}
                disabled={loadingContexto}
              >
                {animal.identificacao}
              </Button>
            ))}
          </div>
          {temMaisResultados ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] w-full"
              onClick={() => void carregarMais()}
              disabled={loadingMais || loadingBusca}
              aria-busy={loadingMais}
            >
              {loadingMais ? "Carregando…" : "Ver mais"}
            </Button>
          ) : null}
        </div>
      ) : null}

      {loadingContexto ? (
        <p className="text-sm text-muted-foreground">Carregando contexto…</p>
      ) : null}

      {contexto ? (
        <div className="min-w-0 space-y-2 rounded-lg border p-4">
          {contexto.fora_do_rebanho ? (
            <div
              className="rounded-md border border-muted-foreground/30 bg-muted/50 px-3 py-2 text-sm"
              role="status"
            >
              <p className="font-medium">Animal fora do rebanho</p>
              <p className="text-muted-foreground mt-1 break-words">
                Consulta apenas — não registe novos eventos de ciclo ou
                produção para este animal.
              </p>
            </div>
          ) : null}
          {contexto.restricao_leite_ativa ? (
            <div
              className="rounded-md border border-feedback-warning/50 bg-feedback-warning/10 px-3 py-2 text-sm text-feedback-warning-foreground"
              role="status"
            >
              <p className="font-medium break-words">
                Leite para descarte (aguardando laboratório)
              </p>
              <p className="mt-1 break-words">
                Motivo:{" "}
                {MOTIVO_RESTRICAO_LEITE_LABELS[
                  contexto.restricao_leite_ativa.motivo as MotivoRestricaoLeite
                ] ?? contexto.restricao_leite_ativa.motivo}
                {contexto.restricao_leite_ativa.observacao
                  ? ` — ${contexto.restricao_leite_ativa.observacao}`
                  : null}
              </p>
            </div>
          ) : null}
          <p className="font-medium break-words text-foreground">
            {contexto.animal.identificacao}
          </p>
          {metaLinha ? (
            <p className="break-words text-sm text-muted-foreground">
              {metaLinha}
            </p>
          ) : null}
          {statusLinha ? (
            <p className="break-words text-sm text-muted-foreground">
              {statusLinha}
            </p>
          ) : null}
          {linhasDetalhe.map((linha) => (
            <p
              key={linha.label}
              className={
                linha.destaque
                  ? "break-words text-sm font-medium text-foreground"
                  : "break-words text-sm text-muted-foreground"
              }
            >
              <span className="text-muted-foreground">{linha.label}: </span>
              {linha.value}
            </p>
          ))}
          <Button asChild variant="secondary" size="sm">
            <Link
              href={`/animais/${contexto.animal.id}`}
              onClick={() => onAntesNavegarDetalhe?.()}
            >
              Abrir detalhes do animal
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
