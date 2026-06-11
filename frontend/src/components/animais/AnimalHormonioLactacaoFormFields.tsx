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
import {
  PRODUTOS_HORMONIO,
  PRODUTO_HORMONIO_LABELS,
  type SaveHormonioLactacaoPayload,
} from "@/services/animalHormoniosLactacao";

export type AnimalHormonioLactacaoFormState = {
  produto: string;
  dataAplicacao: string;
  lote: string;
  observacoes: string;
};

export function emptyAnimalHormonioLactacaoFormState(): AnimalHormonioLactacaoFormState {
  return {
    produto: "LACTROPIN",
    dataAplicacao: todayISODate(),
    lote: "",
    observacoes: "",
  };
}

type Props = {
  formState: AnimalHormonioLactacaoFormState;
  setFormState: Dispatch<SetStateAction<AnimalHormonioLactacaoFormState>>;
};

export function AnimalHormonioLactacaoFormFields({
  formState,
  setFormState,
}: Props) {
  const produtoError = useFormFieldError("produto");
  const dataAplicacaoError = useFormFieldError("dataAplicacao");

  return (
    <>
      <div className="space-y-2">
        <Label>Produto *</Label>
        <Select
          value={formState.produto}
          onValueChange={(v) => setFormState((s) => ({ ...s, produto: v }))}
        >
          <SelectTrigger className="text-foreground">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {PRODUTOS_HORMONIO.map((p) => (
              <SelectItem key={p} value={p}>
                {PRODUTO_HORMONIO_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormFieldError message={produtoError} />
      </div>
      <div className="space-y-2">
        <Label>Data da aplicação *</Label>
        <DatePicker
          value={formState.dataAplicacao}
          onChange={(v) =>
            setFormState((s) => ({ ...s, dataAplicacao: v ?? "" }))
          }
        />
        <FormFieldError message={dataAplicacaoError} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hormonio-lote">Lote</Label>
        <Input
          id="hormonio-lote"
          value={formState.lote}
          onChange={(e) =>
            setFormState((s) => ({ ...s, lote: e.target.value }))
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hormonio-obs">Observações</Label>
        <Textarea
          id="hormonio-obs"
          value={formState.observacoes}
          onChange={(e) =>
            setFormState((s) => ({ ...s, observacoes: e.target.value }))
          }
          rows={3}
        />
      </div>
    </>
  );
}

export function animalHormonioFormToPayload(
  state: AnimalHormonioLactacaoFormState,
): SaveHormonioLactacaoPayload {
  return {
    produto: state.produto,
    data_aplicacao: state.dataAplicacao,
    lote: state.lote.trim() || null,
    observacoes: state.observacoes.trim() || null,
  };
}
