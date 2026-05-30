"use client";

import type { Dispatch, SetStateAction } from "react";
import { AnimalSelect } from "@/components/animais/AnimalSelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePickerPtBr } from "@/components/ui/datetime-picker-pt-br";
import { todayISODate } from "@/lib/date-limits";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Animal } from "@/services/animais";

/** Valores aceitos pela API (backend). */
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
  animais: Animal[];
  formState: CoberturaFormState;
  setFormState: Dispatch<SetStateAction<CoberturaFormState>>;
  preserveSelected?: boolean;
};

export function CoberturaFormFields({
  fazendaId,
  animais,
  formState,
  setFormState,
  preserveSelected = false,
}: Props) {
  const isMontaNatural = formState.tipo === "MONTA_NATURAL";

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
      </div>
      <AnimalSelect
        animais={animais}
        value={formState.touroAnimalId}
        onValueChange={(v) => {
          setFormState((s) => ({
            ...s,
            touroAnimalId: v,
            touroInfo: v ? "" : s.touroInfo,
          }));
        }}
        label={isMontaNatural ? "Reprodutor (touro/boi) *" : "Reprodutor (opcional)"}
        placeholder="Selecione o touro ou boi cadastrado"
        reprodutoresOnly
      />
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
          className="text-foreground"
        />
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

/** Para MONTA_NATURAL exige reprodutor por animal cadastrado ou texto livre. */
export function coberturaFormSubmitDisabled(formState: CoberturaFormState): boolean {
  const hasReprodutor =
    !!formState.touroAnimalId || !!formState.touroInfo.trim();
  const montaOk = formState.tipo !== "MONTA_NATURAL" || hasReprodutor;
  return !formState.animalId || !formState.data || !montaOk;
}
