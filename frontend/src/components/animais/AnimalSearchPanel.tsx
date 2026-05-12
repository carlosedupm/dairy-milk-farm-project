"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getApiErrorMessage } from "@/lib/errors";
import { formatDatePtBr } from "@/lib/format";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function formatNumberPtBr(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export type AnimalSearchPanelProps = {
  /** Fecha o diálogo / painel ao navegar para a ficha do animal */
  onAntesNavegarDetalhe?: () => void;
  /** Foco inicial no campo (ex.: ao abrir o diálogo global) */
  autoFocus?: boolean;
};

const BUSCA_DEBOUNCE_MS = 400;

export function AnimalSearchPanel({
  onAntesNavegarDetalhe,
  autoFocus = false,
}: AnimalSearchPanelProps) {
  const [identificacao, setIdentificacao] = useState("");
  const debouncedTermo = useDebouncedValue(identificacao.trim(), BUSCA_DEBOUNCE_MS);
  const buscaSeq = useRef(0);

  const [resultados, setResultados] = useState<Animal[]>([]);
  const [contexto, setContexto] = useState<AnimalContexto | null>(null);
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [loadingContexto, setLoadingContexto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [buscaExecutada, setBuscaExecutada] = useState(false);

  const totalResultados = useMemo(() => resultados.length, [resultados]);

  const aguardandoDebounce =
    identificacao.trim().length > 0 &&
    identificacao.trim() !== debouncedTermo &&
    !loadingBusca &&
    !loadingContexto;

  const executarBusca = useCallback(async (termo: string) => {
    const trimmed = termo.trim();
    const seq = ++buscaSeq.current;

    if (!trimmed) {
      setResultados([]);
      setContexto(null);
      setBuscaExecutada(false);
      setErro(null);
      setLoadingBusca(false);
      setLoadingContexto(false);
      return;
    }

    setLoadingBusca(true);
    setErro(null);
    setContexto(null);

    try {
      const items = await searchByIdentificacao(trimmed);
      if (seq !== buscaSeq.current) return;

      setResultados(items);
      setBuscaExecutada(true);

      if (items.length === 1) {
        setLoadingContexto(true);
        const ctx = await getContexto(items[0].id);
        if (seq !== buscaSeq.current) return;
        setContexto(ctx);
      }
    } catch (err: unknown) {
      if (seq !== buscaSeq.current) return;
      setErro(
        getApiErrorMessage(err, "Não foi possível pesquisar o animal agora."),
      );
      setResultados([]);
      setBuscaExecutada(true);
    } finally {
      if (seq === buscaSeq.current) {
        setLoadingBusca(false);
        setLoadingContexto(false);
      }
    }
  }, []);

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

  return (
    <div className="min-w-0 space-y-4">
      <form onSubmit={handleSubmitRapido} className="min-w-0 space-y-1.5">
        <Input
          value={identificacao}
          onChange={(event) => setIdentificacao(event.target.value)}
          placeholder="Ex.: 123, brinco, nome ou parte da identificação"
          aria-label="Pesquisar animal por identificação"
          autoFocus={autoFocus}
          aria-busy={loadingBusca || loadingContexto}
          className="min-w-0"
        />
        <p className="text-xs text-muted-foreground">
          {loadingBusca || loadingContexto
            ? "Pesquisando…"
            : aguardandoDebounce
              ? "Aguardando pausa na digitação…"
              : "Os resultados aparecem automaticamente após você parar de digitar."}
        </p>
      </form>

      {erro ? <p className="text-sm text-destructive">{erro}</p> : null}

      {buscaExecutada && !loadingBusca && totalResultados === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum animal encontrado para essa identificação.
        </p>
      ) : null}

      {totalResultados > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {totalResultados === 1
              ? "1 animal encontrado."
              : `${totalResultados} animais encontrados.`}
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
        </div>
      ) : null}

      {loadingContexto ? (
        <p className="text-sm text-muted-foreground">Carregando contexto…</p>
      ) : null}

      {contexto ? (
        <div className="min-w-0 space-y-2 rounded-lg border p-4">
          {contexto.restricao_leite_ativa ? (
            <div
              className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
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
            Animal: {contexto.animal.identificacao}
          </p>
          <p className="break-words text-sm text-muted-foreground">
            Saúde: {contexto.animal.status_saude ?? "Não informado"} |
            Reprodutivo:{" "}
            {contexto.animal.status_reprodutivo ?? "Não informado"}
          </p>
          <p className="break-words text-sm text-muted-foreground">
            Data de nascimento:{" "}
            {contexto.animal.data_nascimento
              ? formatDatePtBr(contexto.animal.data_nascimento)
              : "Não informada"}
          </p>
          <p className="break-words text-sm text-muted-foreground">
            Produção: {formatNumberPtBr(contexto.resumo_producao.total_litros)} L
            total | média{" "}
            {formatNumberPtBr(contexto.resumo_producao.media_litros)} L |
            registros: {contexto.resumo_producao.total_registros}
          </p>
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
