"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  ProducaoLeite,
  ProducaoCreate,
  Qualidade,
} from "@/services/producao";
import { QUALIDADES, QUALIDADE_LABELS } from "@/services/producao";
import { getMinhasFazendas, type Fazenda } from "@/services/fazendas";
import {
  get as getAnimal,
  listEmLactacaoByFazenda,
  type Animal,
} from "@/services/animais";
import { AnimalSelect } from "@/components/animais/AnimalSelect";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateTimePickerPtBr } from "@/components/ui/datetime-picker-pt-br";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiErrorMessage } from "@/lib/errors";
import {
  nowDatetimeLocalInputValue,
  toDatetimeLocalInputValue,
} from "@/lib/format";

type Props = {
  initial?: ProducaoLeite | null;
  onSubmit: (payload: ProducaoCreate) => Promise<void>;
  isPending?: boolean;
  submitLabel?: string;
  defaultFazendaId?: number;
  defaultAnimalId?: number;
  /** Quando definido, usa esta fazenda e não exibe o seletor de fazenda (usuário com uma única fazenda). */
  fazendaUnicaId?: number;
};

export function ProducaoForm({
  initial,
  onSubmit,
  isPending = false,
  submitLabel = "Salvar",
  defaultFazendaId,
  defaultAnimalId,
  fazendaUnicaId,
}: Props) {
  const { fazendaAtiva } = useFazendaAtiva();

  // Usar fazenda ativa como fallback se não tiver defaultFazendaId
  const initialFazendaId =
    fazendaUnicaId ?? defaultFazendaId ?? fazendaAtiva?.id ?? 0;

  const [fazendaId, setFazendaId] = useState<number>(initialFazendaId);
  const [animalId, setAnimalId] = useState<number>(
    initial?.animal_id ?? defaultAnimalId ?? 0
  );
  const [dataHora, setDataHora] = useState(
    initial?.data_hora
      ? toDatetimeLocalInputValue(initial.data_hora)
      : nowDatetimeLocalInputValue()
  );
  const [quantidade, setQuantidade] = useState<string>(
    initial?.quantidade?.toString() ?? ""
  );
  const [qualidade, setQualidade] = useState<Qualidade | undefined>(
    (initial?.qualidade as Qualidade) ?? undefined
  );
  const [error, setError] = useState("");

  // Usar fazendas vinculadas ao usuário (não todas)
  const { data: fazendas = [] } = useQuery<Fazenda[]>({
    queryKey: ["me", "fazendas"],
    queryFn: getMinhasFazendas,
  });

  const { data: animaisEmLactacao = [], isLoading: loadingAnimais } =
    useQuery<Animal[]>({
      queryKey: ["animais", "fazenda", fazendaId, "em-lactacao"],
      queryFn: () => listEmLactacaoByFazenda(fazendaId),
      enabled: fazendaId > 0,
    });

  const { data: animalEdicao } = useQuery({
    queryKey: ["animais", initial?.animal_id],
    queryFn: () => getAnimal(initial!.animal_id),
    enabled: !!initial?.animal_id,
  });

  /** Novo registro: só matrizes em lactação ativa; edição: inclui o animal do registo mesmo se a lactação já encerrou. */
  const animaisParaSelect = useMemo(() => {
    if (!initial) return animaisEmLactacao;
    if (!animalEdicao) return animaisEmLactacao;
    if (animaisEmLactacao.some((a) => a.id === animalEdicao.id)) {
      return animaisEmLactacao;
    }
    return [animalEdicao, ...animaisEmLactacao];
  }, [initial, animalEdicao, animaisEmLactacao]);

  const animalSelectValue = useMemo(() => {
    if (!animalId || animalId <= 0) return "";
    if (initial) return String(animalId);
    if (loadingAnimais) return String(animalId);
    if (animaisParaSelect.some((a) => a.id === animalId)) {
      return String(animalId);
    }
    return "";
  }, [animalId, initial, loadingAnimais, animaisParaSelect]);

  const linkAnimalIndisponivel =
    !initial &&
    defaultAnimalId != null &&
    defaultAnimalId > 0 &&
    fazendaId > 0 &&
    !loadingAnimais &&
    animaisEmLactacao.length > 0 &&
    animalSelectValue === "";

  const handleFazendaChange = (v: string) => {
    const nextFazendaId = Number(v);
    setFazendaId(nextFazendaId);
    if (!initial && !defaultAnimalId) {
      setAnimalId(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const idEnvio = initial ? animalId : Number(animalSelectValue);
    if (!idEnvio || idEnvio <= 0) {
      setError("Selecione um animal em lactação.");
      return;
    }
    const qtd = parseFloat(quantidade);
    if (isNaN(qtd) || qtd <= 0) {
      setError("Quantidade deve ser maior que zero.");
      return;
    }

    const payload: ProducaoCreate = {
      animal_id: idEnvio,
      quantidade: qtd,
      data_hora: dataHora ? `${dataHora}:00` : undefined,
      qualidade: qualidade,
    };

    try {
      await onSubmit(payload);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Erro ao salvar. Tente novamente."));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {initial ? "Editar produção" : "Registrar produção"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fazendaUnicaId != null ? (
              <div className="space-y-2">
                <Label>Fazenda</Label>
                <p className="text-sm text-muted-foreground py-2">
                  Fazenda vinculada ao seu perfil (única)
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="fazenda">Fazenda</Label>
                <Select
                  value={fazendaId?.toString() ?? ""}
                  onValueChange={handleFazendaChange}
                  disabled={!!initial}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione para filtrar animais" />
                  </SelectTrigger>
                  <SelectContent>
                    {fazendas.map((f) => (
                      <SelectItem key={f.id} value={f.id.toString()}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <AnimalSelect
              animais={animaisParaSelect}
              value={animalSelectValue}
              onValueChange={(v) => setAnimalId(Number(v))}
              label="Animal em lactação *"
              placeholder={
                fazendaId <= 0
                  ? "Selecione uma fazenda primeiro"
                  : loadingAnimais
                    ? "Carregando animais…"
                    : animaisParaSelect.length === 0
                      ? "Nenhum animal em lactação"
                      : "Selecione a matriz"
              }
              disabled={
                !fazendaId ||
                fazendaId <= 0 ||
                !!initial ||
                loadingAnimais ||
                (!initial && animaisParaSelect.length === 0)
              }
              femeasOnly
            />
          </div>

          {!initial && fazendaId > 0 && !loadingAnimais && animaisParaSelect.length === 0 ? (
            <p className="text-sm text-muted-foreground break-words">
              Não há animais em lactação ativa nesta fazenda. Registre um parto
              ou abra uma lactação antes de lançar produção.
            </p>
          ) : null}

          {linkAnimalIndisponivel ? (
            <p
              className="text-sm text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg p-3 break-words"
              role="alert"
            >
              O animal indicado no link não está em lactação ativa. Escolha uma
              matriz na lista acima.
            </p>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataHora">Data/Hora</Label>
              <DateTimePickerPtBr
                id="dataHora"
                value={dataHora}
                onChange={setDataHora}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade (litros) *</Label>
              <Input
                id="quantidade"
                type="number"
                step="0.01"
                min={0}
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder="Ex.: 25.5"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qualidade">Qualidade (1-10)</Label>
              <Select
                value={qualidade?.toString() ?? ""}
                onValueChange={(v) =>
                  setQualidade(v ? (Number(v) as Qualidade) : undefined)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {QUALIDADES.map((q) => (
                    <SelectItem key={q} value={q.toString()}>
                      {QUALIDADE_LABELS[q]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="text-base text-destructive">{error}</p>}

          <Button type="submit" size="lg" disabled={isPending}>
            {isPending ? "Salvando…" : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
