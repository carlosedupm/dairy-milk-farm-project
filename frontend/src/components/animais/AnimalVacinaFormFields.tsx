"use client";

import type { Dispatch, SetStateAction } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormFieldError } from "@/components/ui/form-field-error";
import { useFormFieldError } from "@/contexts/FormFieldErrorsContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { todayISODate } from "@/lib/date-limits";
import { cn } from "@/lib/utils";
import {
  TIPOS_VACINA,
  TIPO_VACINA_LABELS,
  type SaveAnimalVacinaPayload,
} from "@/services/animalVacinas";

export type AnimalVacinaModo = "APLICADA" | "PREVISTA";

export type AnimalVacinaFormState = {
  modo: AnimalVacinaModo;
  tipoVacina: string;
  dose: string;
  dataPrevista: string;
  dataAplicacao: string;
  validadeDias: string;
  dataProximoReforco: string;
  lote: string;
  veterinario: string;
  observacoes: string;
};

export function emptyAnimalVacinaFormState(): AnimalVacinaFormState {
  return {
    modo: "APLICADA",
    tipoVacina: "AFTOSA",
    dose: "",
    dataPrevista: "",
    dataAplicacao: todayISODate(),
    validadeDias: "",
    dataProximoReforco: "",
    lote: "",
    veterinario: "",
    observacoes: "",
  };
}

type Props = {
  formState: AnimalVacinaFormState;
  setFormState: Dispatch<SetStateAction<AnimalVacinaFormState>>;
  /** GERENTE+ pode agendar prevista; FUNCIONARIO só registra aplicada (BRF-001 G1 #4). */
  canAgendar: boolean;
};

export function AnimalVacinaFormFields({
  formState,
  setFormState,
  canAgendar,
}: Props) {
  const tipoVacinaError = useFormFieldError("tipoVacina");
  const dataPrevistaError = useFormFieldError("dataPrevista");
  const dataAplicacaoError = useFormFieldError("dataAplicacao");
  const validadeDiasError = useFormFieldError("validadeDias");

  const isAplicada = formState.modo === "APLICADA";

  return (
    <>
      {canAgendar ? (
        <div className="space-y-2">
          <Label>Tipo de registro *</Label>
          <Select
            value={formState.modo}
            onValueChange={(v) =>
              setFormState((s) => ({ ...s, modo: v as AnimalVacinaModo }))
            }
          >
            <SelectTrigger className="text-foreground">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="APLICADA">Vacina já aplicada</SelectItem>
              <SelectItem value="PREVISTA">
                Agendar vacina prevista
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div className="space-y-2">
        <Label>Vacina *</Label>
        <Select
          value={formState.tipoVacina}
          onValueChange={(v) => setFormState((s) => ({ ...s, tipoVacina: v }))}
        >
          <SelectTrigger
            className={cn(
              "text-foreground",
              tipoVacinaError && "border-destructive"
            )}
            aria-invalid={tipoVacinaError ? true : undefined}
          >
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_VACINA.map((t) => (
              <SelectItem key={t} value={t}>
                {TIPO_VACINA_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormFieldError message={tipoVacinaError} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vacina-dose">Dose (opcional)</Label>
        <Input
          id="vacina-dose"
          value={formState.dose}
          onChange={(e) => setFormState((s) => ({ ...s, dose: e.target.value }))}
          placeholder="Ex.: 1ª dose, reforço anual"
          maxLength={60}
        />
      </div>
      {isAplicada ? (
        <div className="space-y-2">
          <Label>Data de aplicação *</Label>
          <DatePicker
            value={formState.dataAplicacao || undefined}
            onChange={(v) => setFormState((s) => ({ ...s, dataAplicacao: v }))}
            maxDate={todayISODate()}
            placeholder="Selecione a data"
          />
          <FormFieldError message={dataAplicacaoError} />
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Data prevista *</Label>
          <DatePicker
            value={formState.dataPrevista || undefined}
            onChange={(v) => setFormState((s) => ({ ...s, dataPrevista: v }))}
            placeholder="Selecione a data"
          />
          <FormFieldError message={dataPrevistaError} />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="vacina-validade">Validade em dias (opcional)</Label>
        <Input
          id="vacina-validade"
          type="number"
          min={1}
          inputMode="numeric"
          value={formState.validadeDias}
          onChange={(e) =>
            setFormState((s) => ({ ...s, validadeDias: e.target.value }))
          }
          placeholder="Ex.: 180 — calcula o próximo reforço ao aplicar"
        />
        <FormFieldError message={validadeDiasError} />
      </div>
      {isAplicada ? (
        <div className="space-y-2">
          <Label>Próximo reforço (opcional)</Label>
          <DatePicker
            value={formState.dataProximoReforco || undefined}
            onChange={(v) =>
              setFormState((s) => ({ ...s, dataProximoReforco: v }))
            }
            placeholder="Calculado pela validade quando vazio"
          />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="vacina-lote">Lote (opcional)</Label>
        <Input
          id="vacina-lote"
          value={formState.lote}
          onChange={(e) => setFormState((s) => ({ ...s, lote: e.target.value }))}
          maxLength={60}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vacina-veterinario">Veterinário (opcional)</Label>
        <Input
          id="vacina-veterinario"
          value={formState.veterinario}
          onChange={(e) =>
            setFormState((s) => ({ ...s, veterinario: e.target.value }))
          }
          maxLength={120}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vacina-obs">Observações (opcional)</Label>
        <Textarea
          id="vacina-obs"
          value={formState.observacoes}
          onChange={(e) =>
            setFormState((s) => ({ ...s, observacoes: e.target.value }))
          }
          placeholder="Reações, marca da vacina…"
          rows={3}
          className="min-h-[4.5rem]"
        />
      </div>
    </>
  );
}

export function animalVacinaFormToPayload(
  state: AnimalVacinaFormState
): SaveAnimalVacinaPayload {
  const isAplicada = state.modo === "APLICADA";
  return {
    tipo_vacina: state.tipoVacina,
    dose: state.dose.trim() || null,
    data_prevista: !isAplicada && state.dataPrevista.trim() ? state.dataPrevista : null,
    data_aplicacao: isAplicada && state.dataAplicacao.trim() ? state.dataAplicacao : null,
    validade_dias: state.validadeDias.trim() ? Number(state.validadeDias) : null,
    data_proximo_reforco:
      isAplicada && state.dataProximoReforco.trim()
        ? state.dataProximoReforco
        : null,
    lote: state.lote.trim() || null,
    veterinario: state.veterinario.trim() || null,
    observacoes: state.observacoes.trim() || null,
  };
}
