"use client";

import { useState } from "react";
import type { Animal } from "@/services/animais";
import type { Qualidade } from "@/services/producao";
import { QUALIDADES, QUALIDADE_LABELS } from "@/services/producao";
import { LitrosInput } from "@/components/producao/LitrosInput";
import { parseLitrosValue } from "@/lib/litros-format";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/ui/form-field";
import { FormValidationAlert } from "@/components/ui/form-validation-alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  getApiErrorConformidadeCode,
  getApiErrorMessage,
} from "@/lib/errors";
import { formatAnimalOptionLabel } from "@/components/animais/animalSelectUtils";

type Props = {
  animal: Animal;
  jaNoTurno: boolean;
  temRestricao: boolean;
  isPending?: boolean;
  onSubmit: (quantidade: number, qualidade?: Qualidade) => Promise<void>;
  onSkip: () => void;
};

export function OrdenhaAnimalCard({
  animal,
  jaNoTurno,
  temRestricao,
  isPending = false,
  onSubmit,
  onSkip,
}: Props) {
  const [quantidade, setQuantidade] = useState("");
  const [qualidade, setQualidade] = useState<Qualidade | undefined>();
  const [error, setError] = useState("");
  const [conformidadeCode, setConformidadeCode] = useState<string | undefined>();
  const [isValidation, setIsValidation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (jaNoTurno) return;
    setError("");
    setConformidadeCode(undefined);
    setIsValidation(false);
    const qtd = parseLitrosValue(quantidade);
    if (!(qtd > 0)) {
      setError("Informe a quantidade em litros.");
      setIsValidation(true);
      return;
    }
    try {
      await onSubmit(qtd, qualidade);
      setQuantidade("");
      setQualidade(undefined);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Erro ao registar. Tente novamente."));
      setConformidadeCode(getApiErrorConformidadeCode(err));
      setIsValidation(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface-elevated p-4 shadow-elevation1">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-base font-semibold text-content-primary">
            {formatAnimalOptionLabel(animal)}
          </p>
          <p className="text-sm text-content-secondary">Registar litros agora</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {temRestricao ? (
            <Badge
              variant="outline"
              className="border-feedback-warning/40 bg-feedback-warning/10 text-feedback-warning-foreground"
            >
              Leite no balde / descarte
            </Badge>
          ) : null}
          {jaNoTurno ? (
            <Badge
              variant="outline"
              className="border-feedback-info/40 bg-feedback-info/10 text-feedback-info"
            >
              Já neste turno
            </Badge>
          ) : null}
        </div>
      </div>

      {jaNoTurno ? (
        <p className="text-sm text-content-secondary" role="status">
          Esta vaca já tem produção registada neste turno. Escolha outra ou
          encerre a ordenha.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error.trim() ? (
            <FormValidationAlert
              message={error}
              conformidadeCode={conformidadeCode}
              isValidation={isValidation}
            />
          ) : null}

          <FormField label="Quantidade (litros)" htmlFor="ordenha-litros" required>
            <LitrosInput
              id="ordenha-litros"
              value={quantidade}
              onValueChange={setQuantidade}
              autoFocus
            />
          </FormField>

          <div className="space-y-2">
            <Label htmlFor="ordenha-qualidade">Qualidade (1-10)</Label>
            <Select
              value={qualidade?.toString() ?? ""}
              onValueChange={(v) =>
                setQualidade(v ? (Number(v) as Qualidade) : undefined)
              }
            >
              <SelectTrigger id="ordenha-qualidade" className="min-h-[44px]">
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

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-h-[44px]"
              onClick={onSkip}
              disabled={isPending}
            >
              Pular
            </Button>
            <Button
              type="submit"
              size="lg"
              className="min-h-[44px] flex-1"
              disabled={isPending}
            >
              {isPending ? "A guardar…" : "Registrar"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
