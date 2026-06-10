"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFieldError } from "@/components/ui/form-field-error";
import { todayISODate } from "@/lib/date-limits";
import { getApiErrorMessage } from "@/lib/errors";
import { toast } from "@/hooks/use-toast";
import {
  animalVacinasListQueryKey,
  aplicar,
  tipoVacinaLabel,
  type AnimalVacinaRegistro,
} from "@/services/animalVacinas";
import { animalSaudeListQueryKey } from "@/services/animalSaude";
import { invalidateAnimalTimeline } from "@/services/animais";

type Props = {
  animalId: number;
  vacina: AnimalVacinaRegistro | null;
  onOpenChange: (open: boolean) => void;
};

export function AnimalVacinaAplicarDialog({
  animalId,
  vacina,
  onOpenChange,
}: Props) {
  const queryClient = useQueryClient();
  const [dataAplicacao, setDataAplicacao] = useState(todayISODate());
  const [validadeDias, setValidadeDias] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      if (!vacina) throw new Error("Vacina em falta");
      const validade = validadeDias.trim() ? Number(validadeDias) : null;
      return aplicar(animalId, vacina.id, {
        data_aplicacao: dataAplicacao,
        validade_dias: validade,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: animalVacinasListQueryKey(animalId),
      });
      queryClient.invalidateQueries({
        queryKey: animalSaudeListQueryKey(animalId),
      });
      queryClient.invalidateQueries({ queryKey: ["animais", animalId] });
      queryClient.invalidateQueries({
        queryKey: ["animais", animalId, "contexto"],
      });
      invalidateAnimalTimeline(queryClient, animalId);
      toast.success("Vacina aplicada");
      setError("");
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      setError(getApiErrorMessage(err, "Não foi possível aplicar a vacina."));
    },
  });

  const handleConfirm = () => {
    setError("");
    if (!dataAplicacao.trim()) {
      setError("Informe a data de aplicação.");
      return;
    }
    if (validadeDias.trim() && Number(validadeDias) <= 0) {
      setError("Validade deve ser maior que zero.");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog
      open={vacina != null}
      onOpenChange={(open) => {
        if (!open) {
          setError("");
          setDataAplicacao(todayISODate());
          setValidadeDias("");
        }
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aplicar vacina</DialogTitle>
          <DialogDescription>
            {vacina
              ? `Vacina ${tipoVacinaLabel(vacina.tipo_vacina)}${
                  vacina.dose ? ` (${vacina.dose})` : ""
                } — o alerta de atraso será resolvido automaticamente.`
              : null}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Data de aplicação *</Label>
            <DatePicker
              value={dataAplicacao || undefined}
              onChange={setDataAplicacao}
              maxDate={todayISODate()}
              placeholder="Selecione a data"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vacina-validade">Validade em dias (opcional)</Label>
            <Input
              id="vacina-validade"
              type="number"
              min={1}
              inputMode="numeric"
              value={validadeDias}
              onChange={(e) => setValidadeDias(e.target.value)}
              placeholder="Ex.: 180 — calcula o próximo reforço"
            />
          </div>
          <FormFieldError message={error || undefined} />
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px]"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="min-h-[44px]"
            onClick={handleConfirm}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Aplicando…" : "Aplicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
