"use client";

import type { Dispatch, SetStateAction } from "react";
import { AnimalSelect } from "@/components/animais/AnimalSelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFieldError } from "@/components/ui/form-field-error";
import { useFormFieldError } from "@/contexts/FormFieldErrorsContext";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DateTimePickerPtBr } from "@/components/ui/datetime-picker-pt-br";
import { todayISODate } from "@/lib/date-limits";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Cobertura } from "@/services/coberturas";
import { formatDatePtBr } from "@/lib/format";
import {
  CLASSIFICACOES_OPERACIONAIS,
  METODOS_DIAGNOSTICO,
  OBS_SUGESTOES_AGUARDAR,
  OBS_SUGESTOES_VAZIA,
  classificacaoDefaultObs,
  classificacaoRequiresCobertura,
  type ClassificacaoOperacional,
} from "@/lib/toquesUtils";

export type ToqueFormState = {
  animalId: string;
  coberturaId: string;
  data: string;
  classificacao: ClassificacaoOperacional;
  gestacaoValor: string;
  gestacaoUnidade: "dias" | "meses";
  observacoes: string;
  veterinario: string;
  metodo: string;
};

type Props = {
  fazendaId: number;
  coberturasDoAnimal: Cobertura[];
  coberturaSelectValue: string;
  formState: ToqueFormState;
  setFormState: Dispatch<SetStateAction<ToqueFormState>>;
};

function obsSugestoesFor(classificacao: ClassificacaoOperacional): readonly string[] {
  if (classificacao === "VAZIA" || classificacao === "VAZIA_PEV") {
    return OBS_SUGESTOES_VAZIA;
  }
  if (
    classificacao === "CLOE" ||
    classificacao === "CL" ||
    classificacao === "RETOQUE"
  ) {
    return OBS_SUGESTOES_AGUARDAR;
  }
  return [];
}

export function ToqueFormFields({
  fazendaId,
  coberturasDoAnimal,
  coberturaSelectValue,
  formState,
  setFormState,
}: Props) {
  const precisaCobertura = classificacaoRequiresCobertura(formState.classificacao);
  const obsSugestoes = obsSugestoesFor(formState.classificacao);
  const animalIdError = useFormFieldError("animalId");
  const dataError = useFormFieldError("data");
  const classificacaoError = useFormFieldError("classificacao");
  const coberturaIdError = useFormFieldError("coberturaId");

  return (
    <>
      <AnimalSelect
        fazendaId={fazendaId}
        cicloContext="toque"
        value={formState.animalId}
        onValueChange={(value) =>
          setFormState((s) => ({ ...s, animalId: value, coberturaId: "" }))
        }
        label="Animal"
        placeholder="Selecione"
        femeasOnly
        error={animalIdError}
      />
      <div className="space-y-2">
        <Label htmlFor="toque-data-hora">Data e hora</Label>
        <DateTimePickerPtBr
          id="toque-data-hora"
          value={formState.data}
          maxDate={todayISODate()}
          onChange={(data) => setFormState((s) => ({ ...s, data }))}
          placeholder="Selecione data e hora"
        />
        <FormFieldError message={dataError} />
      </div>
      <div className="space-y-2">
        <Label>Diagnóstico</Label>
        <Select
          value={formState.classificacao}
          onValueChange={(v) =>
            setFormState((s) => ({
              ...s,
              classificacao: v as ClassificacaoOperacional,
              observacoes: classificacaoDefaultObs(v),
            }))
          }
        >
          <SelectTrigger
            className={cn(
              "text-foreground",
              classificacaoError && "border-destructive"
            )}
            aria-invalid={classificacaoError ? true : undefined}
          >
            <SelectValue placeholder="Selecione o diagnóstico" />
          </SelectTrigger>
          <SelectContent>
            {CLASSIFICACOES_OPERACIONAIS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormFieldError message={classificacaoError} />
      </div>

      {precisaCobertura ? (
        <div className="space-y-2">
          <Label htmlFor="cobertura">Cobertura vinculada *</Label>
          {coberturasDoAnimal.length === 0 ? (
            <p className="text-sm text-feedback-warning border border-feedback-warning/30 rounded-lg p-3 break-words">
              Não há cobertura registrada para este animal. Registre uma
              cobertura antes do toque positivo — é ela que abre a gestação
              confirmada e atualiza o status para prenhe.
            </p>
          ) : (
            <Select
              value={coberturaSelectValue}
              onValueChange={(coberturaId) =>
                setFormState((s) => ({ ...s, coberturaId }))
              }
            >
              <SelectTrigger
                id="cobertura"
                className={cn(
                  "text-foreground",
                  coberturaIdError && "border-destructive"
                )}
                aria-invalid={coberturaIdError ? true : undefined}
              >
                <SelectValue placeholder="Selecione a cobertura" />
              </SelectTrigger>
              <SelectContent>
                {coberturasDoAnimal.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {formatDatePtBr(c.data)} — {c.tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <FormFieldError message={coberturaIdError} />
        </div>
      ) : null}

      {formState.classificacao === "PRENHA" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gestacao-valor">Idade gestacional</Label>
            <Input
              id="gestacao-valor"
              inputMode="decimal"
              placeholder="Ex.: 5 ou 45"
              value={formState.gestacaoValor}
              onChange={(e) =>
                setFormState((s) => ({ ...s, gestacaoValor: e.target.value }))
              }
              className="text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label>Unidade</Label>
            <Select
              value={formState.gestacaoUnidade}
              onValueChange={(gestacaoUnidade) =>
                setFormState((s) => ({
                  ...s,
                  gestacaoUnidade: gestacaoUnidade as "dias" | "meses",
                }))
              }
            >
              <SelectTrigger className="text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meses">Meses</SelectItem>
                <SelectItem value="dias">Dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações (OBS)</Label>
        {obsSugestoes.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {obsSugestoes.map((s) => (
              <Button
                key={s}
                type="button"
                variant="outline"
                className="min-h-[44px]"
                onClick={() => setFormState((prev) => ({ ...prev, observacoes: s }))}
              >
                {s}
              </Button>
            ))}
          </div>
        ) : null}
        <Textarea
          id="observacoes"
          value={formState.observacoes}
          onChange={(e) =>
            setFormState((s) => ({ ...s, observacoes: e.target.value }))
          }
          placeholder="Ex.: PROTOCOLO, 0,5ML ECP, AGUARDAR"
          className="text-foreground min-h-[88px]"
          rows={3}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="veterinario">Veterinário / técnico</Label>
          <Input
            id="veterinario"
            value={formState.veterinario}
            onChange={(e) =>
              setFormState((s) => ({ ...s, veterinario: e.target.value }))
            }
            placeholder="Opcional"
            className="text-foreground"
          />
        </div>
        <div className="space-y-2">
          <Label>Método</Label>
          <Select
            value={formState.metodo}
            onValueChange={(metodo) => setFormState((s) => ({ ...s, metodo }))}
          >
            <SelectTrigger className="text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METODOS_DIAGNOSTICO.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}

export function toqueFormSubmitDisabled(
  formState: ToqueFormState,
  coberturaSelectValue: string,
  coberturasDoAnimalCount: number
): boolean {
  const precisaCobertura = classificacaoRequiresCobertura(formState.classificacao);
  if (!formState.animalId || !formState.data) return true;
  if (
    precisaCobertura &&
    !coberturaSelectValue &&
    coberturasDoAnimalCount === 0
  ) {
    return true;
  }
  return false;
}
