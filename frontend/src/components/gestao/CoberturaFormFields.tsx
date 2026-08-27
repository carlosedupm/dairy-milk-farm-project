"use client";

import { useEffect, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimalSelect } from "@/components/animais/AnimalSelect";
import { applyAnimalProfileFilters } from "@/components/animais/animalSelectUtils";
import { useAnimaisOperacionalList } from "@/components/gestao/useAnimaisMap";
import { GestaoDateMinHint } from "@/components/gestao/GestaoDateMinHint";
import { get as getAnimal } from "@/services/animais";
import { listByAnimal as listCiosByAnimal } from "@/services/cios";
import { listByAnimal as listCoberturasByAnimal } from "@/services/coberturas";
import { listByFazenda as listProtocolosIatf } from "@/services/protocolos_iatf";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormFieldError } from "@/components/ui/form-field-error";
import { useFormFieldError } from "@/contexts/FormFieldErrorsContext";
import { DateTimePickerUnificado } from "@/components/ui/datetime-picker-pt-br";
import { todayISODate } from "@/lib/date-limits";
import { coberturaChronologyFromCios, type GestaoChronologyContext } from "@/lib/gestao-date-limits";
import { formatDatePtBr } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
export const COBERTURA_TIPOS = ["IA", "IATF", "MONTA_NATURAL", "TE"] as const;

const TIPOS_IA = new Set(["IA", "IATF", "TE"]);

export type CoberturaFormState = {
  animalId: string;
  cioId: string;
  tipo: string;
  data: string;
  touroAnimalId: string;
  touroInfo: string;
  semenPartida: string;
  tecnico: string;
  protocoloId: string;
  observacoes: string;
};

type Props = {
  fazendaId: number;
  formState: CoberturaFormState;
  setFormState: Dispatch<SetStateAction<CoberturaFormState>>;
  preserveSelected?: boolean;
  coberturaId?: number;
};

export function useCoberturaChronology(
  animalId: string,
  cioId?: string
): GestaoChronologyContext {
  const animalIdNum = Number(animalId);
  const { data: cios = [] } = useQuery({
    queryKey: ["cios", "by-animal", animalIdNum],
    queryFn: () => listCiosByAnimal(animalIdNum),
    enabled: animalIdNum > 0,
  });
  return useMemo(
    () => coberturaChronologyFromCios(cios, cioId),
    [cios, cioId]
  );
}

/** @deprecated Use useCoberturaChronology — retorna apenas minDate. */
export function useCoberturaMinDate(animalId: string): string | undefined {
  return useCoberturaChronology(animalId).minDate;
}

export function CoberturaFormFields({
  fazendaId,
  formState,
  setFormState,
  preserveSelected = false,
  coberturaId,
}: Props) {
  const isMontaNatural = formState.tipo === "MONTA_NATURAL";
  const showCamposIa = TIPOS_IA.has(formState.tipo);
  const showProtocolo = formState.tipo === "IATF";
  const animalIdError = useFormFieldError("animalId");
  const cioIdError = useFormFieldError("cioId");
  const dataError = useFormFieldError("data");
  const touroError = useFormFieldError("touro");
  const { minDate } = useCoberturaChronology(formState.animalId, formState.cioId);

  const { data: animaisFazenda = [], isLoading: loadingAnimais } =
    useAnimaisOperacionalList(fazendaId);

  const animalIdNum = Number(formState.animalId);
  const { data: cios = [], isFetched: ciosFetched } = useQuery({
    queryKey: ["cios", "by-animal", animalIdNum],
    queryFn: () => listCiosByAnimal(animalIdNum),
    enabled: animalIdNum > 0,
  });
  const { data: coberturasAnimal = [], isFetched: coberturasFetched } = useQuery({
    queryKey: ["coberturas", "by-animal", animalIdNum],
    queryFn: () => listCoberturasByAnimal(animalIdNum),
    enabled: animalIdNum > 0,
  });
  const { data: protocolos = [] } = useQuery({
    queryKey: ["protocolos-iatf", fazendaId],
    queryFn: () => listProtocolosIatf(fazendaId),
    enabled: showProtocolo && fazendaId > 0,
  });

  const ciosDisponiveis = useMemo(() => {
    const linked = new Set(
      coberturasAnimal
        .filter((c) => c.cio_id && c.id !== coberturaId)
        .map((c) => c.cio_id as number)
    );
    return [...cios]
      .filter((ci) => !linked.has(ci.id))
      .sort(
        (a, b) =>
          new Date(b.data_detectado).getTime() -
          new Date(a.data_detectado).getTime()
      );
  }, [cios, coberturasAnimal, coberturaId]);

  useEffect(() => {
    if (animalIdNum <= 0) return;
    if (!ciosFetched || !coberturasFetched) return;
    if (formState.cioId && ciosDisponiveis.some((c) => c.id.toString() === formState.cioId)) {
      return;
    }
    const latest = ciosDisponiveis[0];
    setFormState((s) => ({
      ...s,
      cioId: latest ? latest.id.toString() : "",
    }));
  }, [
    animalIdNum,
    ciosDisponiveis,
    ciosFetched,
    coberturasFetched,
    formState.cioId,
    setFormState,
  ]);

  const touroIdNum = Number(formState.touroAnimalId);
  const touroMissingFromList =
    touroIdNum > 0 &&
    !animaisFazenda.some((a) => a.id === touroIdNum);

  const { data: touroPreservado } = useQuery({
    queryKey: ["animais", touroIdNum],
    queryFn: () => getAnimal(touroIdNum),
    enabled: touroMissingFromList,
  });

  const animaisParaTouro = useMemo(() => {
    const base = [...animaisFazenda];
    if (
      touroPreservado &&
      !base.some((a) => a.id === touroPreservado.id)
    ) {
      base.unshift(touroPreservado);
    }
    return base;
  }, [animaisFazenda, touroPreservado]);

  const reprodutoresDisponiveis = useMemo(
    () =>
      applyAnimalProfileFilters(animaisParaTouro, {
        reprodutoresOnly: true,
      }),
    [animaisParaTouro],
  );

  useEffect(() => {
    if (
      !isMontaNatural ||
      formState.touroAnimalId ||
      formState.touroInfo.trim() ||
      loadingAnimais
    ) {
      return;
    }
    if (reprodutoresDisponiveis.length === 1) {
      setFormState((s) => ({
        ...s,
        touroAnimalId: reprodutoresDisponiveis[0]!.id.toString(),
      }));
    }
  }, [
    isMontaNatural,
    formState.touroAnimalId,
    formState.touroInfo,
    loadingAnimais,
    reprodutoresDisponiveis,
    setFormState,
  ]);

  const protocolosAtivos = useMemo(
    () => protocolos.filter((p) => p.ativo),
    [protocolos]
  );

  return (
    <>
      <AnimalSelect
        fazendaId={fazendaId}
        cicloContext="cobertura"
        preserveSelected={preserveSelected}
        value={formState.animalId}
        onValueChange={(value) =>
          setFormState((s) => ({ ...s, animalId: value, cioId: "" }))
        }
        label="Animal (fêmea)"
        placeholder="Selecione"
        femeasOnly
        error={animalIdError}
      />
      <div className="space-y-2">
        <Label>Cio vinculado</Label>
        <Select
          value={formState.cioId || undefined}
          onValueChange={(cioId) => setFormState((s) => ({ ...s, cioId }))}
          disabled={animalIdNum <= 0}
        >
          <SelectTrigger className="text-foreground">
            <SelectValue
              placeholder={
                animalIdNum <= 0
                  ? "Selecione o animal primeiro"
                  : ciosDisponiveis.length === 0
                    ? "Nenhum cio disponível"
                    : "Selecione o cio"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {ciosDisponiveis.map((ci) => (
              <SelectItem key={ci.id} value={ci.id.toString()}>
                {formatDatePtBr(ci.data_detectado)}
                {ci.metodo_deteccao ? ` · ${ci.metodo_deteccao}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormFieldError message={cioIdError} />
      </div>
      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select
          value={formState.tipo}
          onValueChange={(tipo) =>
            setFormState((s) => ({
              ...s,
              tipo,
              protocoloId: tipo === "IATF" ? s.protocoloId : "",
            }))
          }
        >
          <SelectTrigger className="text-foreground">
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            {COBERTURA_TIPOS.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cobertura-data-hora">Data e hora</Label>
        <DateTimePickerUnificado
          id="cobertura-data-hora"
          value={formState.data}
          maxDate={todayISODate()}
          minDate={minDate}
          onChange={(v) => setFormState((s) => ({ ...s, data: v }))}
          placeholder="Selecione data e hora"
        />
        <GestaoDateMinHint
          minDate={minDate}
          prefix="Data mínima: após o cio de"
        />
        <FormFieldError message={dataError} />
      </div>
      <AnimalSelect
        animais={animaisParaTouro}
        value={formState.touroAnimalId}
        onValueChange={(v) => {
          setFormState((s) => ({
            ...s,
            touroAnimalId: v,
            touroInfo: v ? "" : s.touroInfo,
          }));
        }}
        label={isMontaNatural ? "Reprodutor (touro/boi) *" : "Reprodutor (opcional)"}
        placeholder={
          loadingAnimais
            ? "A carregar reprodutores…"
            : reprodutoresDisponiveis.length === 0
              ? "Nenhum touro/boi no rebanho"
              : "Selecione o touro ou boi cadastrado"
        }
        disabled={loadingAnimais}
        reprodutoresOnly
        error={isMontaNatural ? touroError : undefined}
      />
      {isMontaNatural &&
      !loadingAnimais &&
      reprodutoresDisponiveis.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Cadastre um animal com sexo masculino e categoria Touro ou Boi (ex. Maxo)
          para aparecer aqui, ou preencha o campo de touro abaixo.
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="cobertura-touro-info">
          {isMontaNatural ? "Touro (só se não estiver cadastrado)" : "Touro/sêmen (opcional)"}
        </Label>
        <Input
          id="cobertura-touro-info"
          value={formState.touroInfo}
          onChange={(e) => {
            const touroInfo = e.target.value;
            setFormState((s) => ({
              ...s,
              touroInfo,
              touroAnimalId: touroInfo.trim() ? "" : s.touroAnimalId,
            }));
          }}
          placeholder="Nome ou código do touro/sêmen"
          className={cn(
            "text-foreground",
            isMontaNatural && touroError && "border-destructive"
          )}
          aria-invalid={isMontaNatural && touroError ? true : undefined}
        />
        {isMontaNatural ? <FormFieldError message={touroError} /> : null}
      </div>
      {showCamposIa ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="cobertura-semen">Partida de sêmen (opcional)</Label>
            <Input
              id="cobertura-semen"
              value={formState.semenPartida}
              onChange={(e) =>
                setFormState((s) => ({ ...s, semenPartida: e.target.value }))
              }
              placeholder="Lote ou partida"
              className="text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cobertura-tecnico">Técnico (opcional)</Label>
            <Input
              id="cobertura-tecnico"
              value={formState.tecnico}
              onChange={(e) =>
                setFormState((s) => ({ ...s, tecnico: e.target.value }))
              }
              placeholder="Nome do técnico"
              className="text-foreground"
            />
          </div>
        </>
      ) : null}
      {showProtocolo ? (
        <div className="space-y-2">
          <Label>Protocolo IATF (opcional)</Label>
          <Select
            value={formState.protocoloId || "__none__"}
            onValueChange={(v) =>
              setFormState((s) => ({
                ...s,
                protocoloId: v === "__none__" ? "" : v,
              }))
            }
          >
            <SelectTrigger className="text-foreground">
              <SelectValue placeholder="Nenhum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum</SelectItem>
              {protocolosAtivos.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="cobertura-observacoes">Observações (opcional)</Label>
        <Textarea
          id="cobertura-observacoes"
          value={formState.observacoes}
          onChange={(e) =>
            setFormState((s) => ({ ...s, observacoes: e.target.value }))
          }
          placeholder="Informações adicionais"
          className="text-foreground min-h-[88px]"
        />
      </div>
    </>
  );
}

export function coberturaFormSubmitDisabled(formState: CoberturaFormState): boolean {
  const hasReprodutor =
    !!formState.touroAnimalId || !!formState.touroInfo.trim();
  const montaOk = formState.tipo !== "MONTA_NATURAL" || hasReprodutor;
  return !formState.animalId || !formState.cioId || !formState.data || !montaOk;
}
