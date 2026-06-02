"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { Animal } from "@/services/animais";
import {
  createAlertaManual,
  SEVERIDADE_ALERTA_LABELS,
  SEVERIDADES_ALERTA,
  type SeveridadeAlerta,
} from "@/services/alertas";
import { AnimalSelect } from "@/components/animais/AnimalSelect";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormFieldError } from "@/components/ui/form-field-error";
import { FormValidationAlert } from "@/components/ui/form-validation-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  getApiErrorConformidadeCode,
  getApiErrorMessage,
  parsePrefixedConformidadeMessage,
} from "@/lib/errors";
import { validateCriarAlertaForm, type FieldErrors } from "@/lib/form-validation";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fazendaId: number;
  animais: Animal[];
  onSuccess: () => void;
};

function emptyForm() {
  return {
    titulo: "",
    descricao: "",
    severidade: "MEDIA" as SeveridadeAlerta,
    animalId: "",
    dataPrevista: "",
  };
}

export function CriarAlertaDialog({
  open,
  onOpenChange,
  fazendaId,
  animais,
  onSuccess,
}: Props) {
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [isValidationError, setIsValidationError] = useState(false);
  const [conformidadeCode, setConformidadeCode] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const createMutation = useMutation({
    mutationFn: () =>
      createAlertaManual(fazendaId, {
        tipo: "MANUAL",
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || null,
        severidade: form.severidade,
        animal_id: form.animalId ? Number(form.animalId) : null,
        data_prevista: form.dataPrevista || null,
      }),
    onSuccess: () => {
      toast.success("Alerta criado");
      onSuccess();
      onOpenChange(false);
      setForm(emptyForm());
      setFormError("");
      setFieldErrors({});
    },
    onError: (err: unknown) => {
      setFormError(getApiErrorMessage(err, "Erro ao criar alerta."));
      setConformidadeCode(getApiErrorConformidadeCode(err));
      setIsValidationError(false);
    },
  });

  const clearErrors = () => {
    setFormError("");
    setConformidadeCode(undefined);
    setIsValidationError(false);
    setFieldErrors({});
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setForm(emptyForm());
      clearErrors();
      createMutation.reset();
    }
    onOpenChange(next);
  };

  const handleSubmit = () => {
    clearErrors();

    const validation = validateCriarAlertaForm({ titulo: form.titulo });
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo alerta manual</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {formError?.trim() ? (
            <FormValidationAlert
              message={displayMessage}
              conformidadeCode={displayCode}
              isValidation={isValidationError}
            />
          ) : null}
          <div className="space-y-1">
            <Label htmlFor="alerta-titulo">Título</Label>
            <Input
              id="alerta-titulo"
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              maxLength={200}
              aria-invalid={fieldErrors.titulo ? true : undefined}
            />
            <FormFieldError message={fieldErrors.titulo} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="alerta-descricao">Descrição</Label>
            <Textarea
              id="alerta-descricao"
              value={form.descricao}
              onChange={(e) =>
                setForm((f) => ({ ...f, descricao: e.target.value }))
              }
              rows={3}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="alerta-severidade">Severidade</Label>
            <Select
              value={form.severidade}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, severidade: v as SeveridadeAlerta }))
              }
            >
              <SelectTrigger id="alerta-severidade">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERIDADES_ALERTA.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SEVERIDADE_ALERTA_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AnimalSelect
            id="alerta-animal"
            animais={animais}
            value={form.animalId}
            onValueChange={(animalId) =>
              setForm((f) => ({ ...f, animalId }))
            }
            label="Animal (opcional)"
            placeholder="Nenhum animal"
            semDataSaida
          />
          <div className="space-y-1">
            <Label htmlFor="alerta-data">Data prevista (opcional)</Label>
            <DatePicker
              id="alerta-data"
              value={form.dataPrevista || undefined}
              onChange={(dataPrevista) =>
                setForm((f) => ({ ...f, dataPrevista }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="lg"
            className="min-h-[44px]"
            disabled={createMutation.isPending}
            onClick={handleSubmit}
          >
            {createMutation.isPending ? "A criar…" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
