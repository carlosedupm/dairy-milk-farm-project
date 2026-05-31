"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSafraCultura, createReceita, listFornecedoresByFazenda } from "@/services/agricultura";
import {
  getApiErrorConformidadeCode,
  getApiErrorMessage,
  parsePrefixedConformidadeMessage,
} from "@/lib/errors";
import { validateReceitaAgriculturaForm, type FieldErrors } from "@/lib/form-validation";
import { toast } from "@/hooks/use-toast";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { FormFieldError } from "@/components/ui/form-field-error";
import { FormValidationAlert } from "@/components/ui/form-validation-alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function NovaReceitaContent() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { fazendaAtiva } = useFazendaAtiva();
  const safraCulturaId = Number(params.id);

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [quantidadeKg, setQuantidadeKg] = useState("");
  const [precoPorKg, setPrecoPorKg] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [fornecedorId, setFornecedorId] = useState<string>("");
  const [formError, setFormError] = useState("");
  const [isValidationError, setIsValidationError] = useState(false);
  const [conformidadeCode, setConformidadeCode] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const { data: sc } = useQuery({
    queryKey: ["safras-culturas", safraCulturaId],
    queryFn: () => getSafraCultura(safraCulturaId),
    enabled: !Number.isNaN(safraCulturaId),
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores", fazendaAtiva?.id],
    queryFn: () => listFornecedoresByFazenda(fazendaAtiva!.id),
    enabled: !!fazendaAtiva?.id,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createReceita(safraCulturaId, {
        descricao: descricao || undefined,
        valor: parseFloat(valor),
        quantidade_kg: quantidadeKg ? parseFloat(quantidadeKg) : undefined,
        preco_por_kg: precoPorKg ? parseFloat(precoPorKg) : undefined,
        data,
        fornecedor_id: fornecedorId ? Number(fornecedorId) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receitas", safraCulturaId] });
      toast.success("Receita registrada");
      router.push(`/agricultura/safras-culturas/${safraCulturaId}`);
    },
    onError: (err: unknown) => {
      setFormError(getApiErrorMessage(err, "Erro ao registrar receita."));
      setConformidadeCode(getApiErrorConformidadeCode(err));
      setIsValidationError(false);
    },
  });

  const handleSubmit = () => {
    setFormError("");
    setConformidadeCode(undefined);
    setIsValidationError(false);
    setFieldErrors({});

    const validation = validateReceitaAgriculturaForm({ valor });
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
          <CardTitle>Registrar receita – {sc?.cultura} {sc?.ano}</CardTitle>
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
            <Label htmlFor="valor">Valor (R$) *</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              min="0"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              aria-invalid={fieldErrors.valor ? true : undefined}
            />
            <FormFieldError message={fieldErrors.valor} />
          </div>
          <div>
            <Label htmlFor="data">Data *</Label>
            <DatePicker id="data" value={data} onChange={setData} placeholder="Data da receita" />
          </div>
          {fornecedores.length > 0 && (
            <div>
              <Label htmlFor="fornecedor">Fornecedor / Cooperativa (opcional)</Label>
              <Select value={fornecedorId} onValueChange={setFornecedorId}>
                <SelectTrigger id="fornecedor">
                  <SelectValue placeholder="Onde entregou / vendeu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Nenhum —</SelectItem>
                  {fornecedores.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Input id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Venda grão milho" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="quantidade_kg">Quantidade kg (opcional)</Label>
              <Input id="quantidade_kg" type="number" step="0.01" value={quantidadeKg} onChange={(e) => setQuantidadeKg(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="preco_por_kg">Preço/kg (opcional)</Label>
              <Input id="preco_por_kg" type="number" step="0.0001" value={precoPorKg} onChange={(e) => setPrecoPorKg(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Salvando…" : "Registrar receita"}
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default function NovaReceitaPage() {
  return (
    <ProtectedRoute>
      <NovaReceitaContent />
    </ProtectedRoute>
  );
}
