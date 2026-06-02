"use client";

import { useEffect, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimalSelect } from "@/components/animais/AnimalSelect";
import { applyAnimalProfileFilters } from "@/components/animais/animalSelectUtils";
import { useAnimaisOperacionalList } from "@/components/gestao/useAnimaisMap";
import { get as getAnimal } from "@/services/animais";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormFieldError } from "@/components/ui/form-field-error";
import { useFormFieldError } from "@/contexts/FormFieldErrorsContext";
import { DateTimePickerPtBr } from "@/components/ui/datetime-picker-pt-br";
import { todayISODate } from "@/lib/date-limits";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
export const COBERTURA_TIPOS = ["IA", "IATF", "MONTA_NATURAL", "TE"] as const;

export type CoberturaFormState = {
  animalId: string;
  tipo: string;
  data: string;
  touroAnimalId: string;
  touroInfo: string;
  observacoes: string;
};

type Props = {
  fazendaId: number;
  formState: CoberturaFormState;
  setFormState: Dispatch<SetStateAction<CoberturaFormState>>;
  preserveSelected?: boolean;
};

export function CoberturaFormFields({
  fazendaId,
  formState,
  setFormState,
  preserveSelected = false,
}: Props) {
  const isMontaNatural = formState.tipo === "MONTA_NATURAL";
  const animalIdError = useFormFieldError("animalId");
  const dataError = useFormFieldError("data");
  const touroError = useFormFieldError("touro");

  const { data: animaisFazenda = [], isLoading: loadingAnimais } =
    useAnimaisOperacionalList(fazendaId);

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

  return (
    <>
      <AnimalSelect
        fazendaId={fazendaId}
        cicloContext="cobertura"
        preserveSelected={preserveSelected}
        value={formState.animalId}
        onValueChange={(value) => setFormState((s) => ({ ...s, animalId: value }))}
        label="Animal (fêmea)"
        placeholder="Selecione"
        femeasOnly
        error={animalIdError}
      />
      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select
          value={formState.tipo}
          onValueChange={(tipo) => setFormState((s) => ({ ...s, tipo }))}
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
        <DateTimePickerPtBr
          id="cobertura-data-hora"
          value={formState.data}
          maxDate={todayISODate()}
          onChange={(v) => setFormState((s) => ({ ...s, data: v }))}
          placeholder="Selecione data e hora"
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
  return !formState.animalId || !formState.data || !montaOk;
}
