"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSafraCultura } from "@/services/agricultura";
import {
  getApiErrorConformidadeCode,
  getApiErrorMessage,
  parsePrefixedConformidadeMessage,
} from "@/lib/errors";
import {
  resolveColheitaDateLimits,
  resolvePlantioDateLimits,
} from "@/lib/agricultura-date-limits";
import { validateSafraCulturaForm, type FieldErrors } from "@/lib/form-validation";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePickerUnificado } from "@/components/ui/date-picker";
import { FormFieldError } from "@/components/ui/form-field-error";
import { FormValidationAlert } from "@/components/ui/form-validation-alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areaId: number;
  ano: number;
  areaNome?: string;
};

export function CreateSafraCulturaDialog({
  open,
  onOpenChange,
  areaId,
  ano,
  areaNome,
}: Props) {
  const queryClient = useQueryClient();
  const [cultura, setCultura] = useState("MILHO");
  const [status, setStatus] = useState("PLANTADA");
  const [dataPlantio, setDataPlantio] = useState("");
  const [dataColheita, setDataColheita] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [formError, setFormError] = useState("");
  const [isValidationError, setIsValidationError] = useState(false);
  const [conformidadeCode, setConformidadeCode] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const plantioLimits = useMemo(
    () => resolvePlantioDateLimits(ano, dataColheita || undefined),
    [ano, dataColheita]
  );
  const colheitaLimits = useMemo(
    () => resolveColheitaDateLimits(ano, dataPlantio || undefined),
    [ano, dataPlantio]
  );

  const handlePlantioChange = (value: string) => {
    setDataPlantio(value);
    if (
      dataColheita &&
      value &&
      dataColheita.slice(0, 10) < value.slice(0, 10)
    ) {
      setDataColheita("");
    }
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createSafraCultura({
        area_id: areaId,
        ano,
        cultura,
        status,
        data_plantio: dataPlantio || undefined,
        data_colheita: dataColheita || undefined,
        observacoes: observacoes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["safras-culturas", areaId, ano] });
      toast.success("Safra/cultura criada");
      onOpenChange(false);
      setCultura("MILHO");
      setStatus("PLANTADA");
      setDataPlantio("");
      setDataColheita("");
      setObservacoes("");
      setFormError("");
      setFieldErrors({});
    },
    onError: (err: unknown) => {
      setFormError(getApiErrorMessage(err, "Erro ao criar safra/cultura."));
      setConformidadeCode(getApiErrorConformidadeCode(err));
      setIsValidationError(false);
    },
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setFormError("");
      setConformidadeCode(undefined);
      setIsValidationError(false);
      setFieldErrors({});
      createMutation.reset();
    }
    onOpenChange(next);
  };

  const handleSubmit = () => {
    setFormError("");
    setConformidadeCode(undefined);
    setIsValidationError(false);
    setFieldErrors({});

    const validation = validateSafraCulturaForm({
      ano,
      dataPlantio,
      dataColheita,
    });
    if (!validation.valid) {
      setFieldErrors(validation.fields);
      setFormError(validation.summary ?? "Corrija os campos assinalados.");
      setIsValidationError(true);
      return;
    }

    createMutation.mutate();
  };

  const parsed = formError ? parsePrefixedConformidadeMessage(formError) : null;
  const displayMessage = parsed?.message ?? formError;
  const displayCode = conformidadeCode ?? parsed?.conformidadeCode;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova cultura – Safra {ano} – {areaNome ?? "Área"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {formError?.trim() ? (
            <FormValidationAlert
              message={displayMessage}
              conformidadeCode={displayCode}
              isValidation={isValidationError}
            />
          ) : null}
          <div>
            <Label htmlFor="cultura">Cultura</Label>
            <Select value={cultura} onValueChange={setCultura}>
              <SelectTrigger id="cultura">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MILHO">Milho</SelectItem>
                <SelectItem value="SOJA">Soja</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PLANEJADA">Planejada</SelectItem>
                <SelectItem value="PLANTADA">Plantada</SelectItem>
                <SelectItem value="EM_CRESCIMENTO">Em crescimento</SelectItem>
                <SelectItem value="COLHIDA">Colhida</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="data_plantio">Data do plantio (opcional)</Label>
            <DatePickerUnificado
              id="data_plantio"
              value={dataPlantio || undefined}
              onChange={handlePlantioChange}
              placeholder="Data do plantio"
              minDate={plantioLimits.minDate}
              maxDate={plantioLimits.maxDate}
              minYear={plantioLimits.minYear}
              maxYear={plantioLimits.maxYear}
            />
            <FormFieldError message={fieldErrors.dataPlantio} />
          </div>
          <div>
            <Label htmlFor="data_colheita">Data da colheita (opcional)</Label>
            <DatePickerUnificado
              id="data_colheita"
              value={dataColheita || undefined}
              onChange={setDataColheita}
              placeholder="Data da colheita"
              minDate={colheitaLimits.minDate}
              maxDate={colheitaLimits.maxDate}
              minYear={colheitaLimits.minYear}
              maxYear={colheitaLimits.maxYear}
            />
            <FormFieldError message={fieldErrors.dataColheita} />
          </div>
          <div>
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Input id="observacoes" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Salvando…" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
