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
import {
  getApiErrorMessage,
  parsePrefixedConformidadeMessage,
} from "@/lib/errors";

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
      onSuccess();
      onOpenChange(false);
      setForm(emptyForm());
    },
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setForm(emptyForm());
      createMutation.reset();
    }
    onOpenChange(next);
  };

  const createErrorMsg = createMutation.error
    ? getApiErrorMessage(createMutation.error, "Erro ao criar alerta.")
    : "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo alerta manual</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="alerta-titulo">Título</Label>
            <Input
              id="alerta-titulo"
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              maxLength={200}
            />
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
              manualInput
            />
          </div>
          {createErrorMsg ? (
            <FormValidationAlert
              {...parsePrefixedConformidadeMessage(createErrorMsg)}
            />
          ) : null}
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
            disabled={!form.titulo.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? "A criar…" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
