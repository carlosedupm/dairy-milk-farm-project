"use client";

import { useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSafraCultura, createProducao } from "@/services/agricultura";
import {
  getApiErrorConformidadeCode,
  getApiErrorMessage,
  parsePrefixedConformidadeMessage,
} from "@/lib/errors";
import { validateProducaoAgriculturaForm, type FieldErrors } from "@/lib/form-validation";
import { toast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveSafraCulturaDateRange } from "@/lib/agricultura-date-limits";
import { DatePickerUnificado } from "@/components/ui/date-picker";
import { FormFieldError } from "@/components/ui/form-field-error";
import { FormValidationAlert } from "@/components/ui/form-validation-alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function NovaProducaoContent() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const safraCulturaId = Number(params.id);

  const [destino, setDestino] = useState("GRAO");
  const [quantidadeKg, setQuantidadeKg] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [observacoes, setObservacoes] = useState("");
  const [formError, setFormError] = useState("");
  const [isValidationError, setIsValidationError] = useState(false);
  const [conformidadeCode, setConformidadeCode] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const { data: sc } = useQuery({
    queryKey: ["safras-culturas", safraCulturaId],
    queryFn: () => getSafraCultura(safraCulturaId),
    enabled: !Number.isNaN(safraCulturaId),
  });

  const safraRange = useMemo(() => resolveSafraCulturaDateRange(sc), [sc]);

  const createMutation = useMutation({
    mutationFn: () =>
      createProducao(safraCulturaId, {
        destino,
        quantidade_kg: parseFloat(quantidadeKg),
        data,
        observacoes: observacoes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["producoes", safraCulturaId] });
      toast.success("Produção registrada");
      router.push(`/agricultura/safras-culturas/${safraCulturaId}`);
    },
    onError: (err: unknown) => {
      setFormError(getApiErrorMessage(err, "Erro ao registrar produção."));
      setConformidadeCode(getApiErrorConformidadeCode(err));
      setIsValidationError(false);
    },
  });

  const handleSubmit = () => {
    setFormError("");
    setConformidadeCode(undefined);
    setIsValidationError(false);
    setFieldErrors({});

    const validation = validateProducaoAgriculturaForm(
      { quantidadeKg, data },
      { safraRange }
    );
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

  if (Number.isNaN(safraCulturaId)) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/agricultura/areas">Voltar</BackLink>
        <p className="mt-4 text-destructive">ID inválido.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="narrow">
      <BackLink href={`/agricultura/safras-culturas/${safraCulturaId}`}>Voltar à safra/cultura</BackLink>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Registrar produção – {sc?.cultura} {sc?.ano}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formError?.trim() ? (
            <FormValidationAlert
              message={displayMessage}
              conformidadeCode={displayCode}
              isValidation={isValidationError}
            />
          ) : null}
          <div>
            <Label htmlFor="destino">Destino *</Label>
            <Select value={destino} onValueChange={setDestino}>
              <SelectTrigger id="destino">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SILAGEM">Silagem (alimentação rebanho)</SelectItem>
                <SelectItem value="GRAO">Grão (para venda)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="quantidade_kg">Quantidade (kg) *</Label>
            <Input
              id="quantidade_kg"
              type="number"
              step="0.01"
              min="0.01"
              value={quantidadeKg}
              onChange={(e) => setQuantidadeKg(e.target.value)}
              aria-invalid={fieldErrors.quantidadeKg ? true : undefined}
            />
            <FormFieldError message={fieldErrors.quantidadeKg} />
          </div>
          <div>
            <Label htmlFor="data">Data *</Label>
            <DatePickerUnificado
              id="data"
              value={data}
              onChange={setData}
              placeholder="Data da produção"
              minDate={safraRange.minDate}
              maxDate={safraRange.maxDate}
            />
            <FormFieldError message={fieldErrors.data} />
          </div>
          <div>
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Input id="observacoes" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Salvando…" : "Registrar produção"}
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default function NovaProducaoPage() {
  return (
    <ProtectedRoute>
      <NovaProducaoContent />
    </ProtectedRoute>
  );
}
