"use client";

import { useState } from "react";
import type { Fazenda, FazendaCreate } from "@/services/fazendas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { FormField } from "@/components/ui/form-field";
import { FormValidationAlert } from "@/components/ui/form-validation-alert";
import {
  getApiErrorConformidadeCode,
  getApiErrorMessage,
  parsePrefixedConformidadeMessage,
} from "@/lib/errors";
import { validateFazendaForm, type FieldErrors } from "@/lib/form-validation";

type Props = {
  initial?: Fazenda | null;
  onSubmit: (payload: FazendaCreate) => Promise<void>;
  isPending?: boolean;
  submitLabel?: string;
};

export function FazendaForm({
  initial,
  onSubmit,
  isPending = false,
  submitLabel = "Salvar",
}: Props) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [localizacao, setLocalizacao] = useState(initial?.localizacao ?? "");
  const [fundacao, setFundacao] = useState(
    initial?.fundacao ? initial.fundacao.slice(0, 10) : ""
  );
  const [error, setError] = useState("");
  const [conformidadeCode, setConformidadeCode] = useState<string | undefined>();
  const [isValidationError, setIsValidationError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setConformidadeCode(undefined);
    setFieldErrors({});

    const validation = validateFazendaForm({ nome });
    if (!validation.valid) {
      setFieldErrors(validation.fields);
      setError(validation.summary ?? "Corrija os campos assinalados.");
      setIsValidationError(true);
      return;
    }
    setIsValidationError(false);

    const payload: FazendaCreate = {
      nome: nome.trim(),
    };
    if (localizacao.trim()) payload.localizacao = localizacao.trim();
    if (fundacao.trim()) payload.fundacao = fundacao.trim();
    try {
      await onSubmit(payload);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Erro ao salvar. Tente novamente."));
      setConformidadeCode(getApiErrorConformidadeCode(err));
      setIsValidationError(false);
    }
  };

  const parsed = error ? parsePrefixedConformidadeMessage(error) : null;
  const displayMessage = parsed?.message ?? error;
  const displayCode = conformidadeCode ?? parsed?.conformidadeCode;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initial ? "Editar fazenda" : "Nova fazenda"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error?.trim() ? (
            <FormValidationAlert
              message={displayMessage}
              conformidadeCode={displayCode}
              isValidation={isValidationError}
            />
          ) : null}

          <FormField label="Nome" htmlFor="nome" required error={fieldErrors.nome}>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Fazenda São João"
            />
          </FormField>

          <div className="space-y-2">
            <Label htmlFor="localizacao">Localização</Label>
            <Input
              id="localizacao"
              value={localizacao}
              onChange={(e) => setLocalizacao(e.target.value)}
              placeholder="Ex.: Minas Gerais - MG"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fundacao">Data de fundação</Label>
            <DatePicker
              id="fundacao"
              value={fundacao || undefined}
              onChange={(v) => setFundacao(v)}
              placeholder="Selecione a data"
            />
          </div>
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending ? "Salvando…" : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
