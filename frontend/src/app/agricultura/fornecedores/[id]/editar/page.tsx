"use client";

import { useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFornecedor, updateFornecedor } from "@/services/agricultura";
import type { FornecedorUpdate } from "@/services/agricultura";
import { getApiErrorConformidadeCode, getApiErrorMessage, parsePrefixedConformidadeMessage } from "@/lib/errors";
import { validateFornecedorForm, type FieldErrors } from "@/lib/form-validation";
import { toast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFieldError } from "@/components/ui/form-field-error";
import { FormValidationAlert } from "@/components/ui/form-validation-alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function EditarFornecedorContent() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params?.id ? parseInt(String(params.id), 10) : NaN;

  const [draft, setDraft] = useState({
    nome: "",
    tipo: "COOPERATIVA",
    contato: "",
    observacoes: "",
    ativo: true,
  });
  const [dirty, setDirty] = useState(false);
  const [formError, setFormError] = useState("");
  const [isValidationError, setIsValidationError] = useState(false);
  const [conformidadeCode, setConformidadeCode] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const { data: fornecedor, isLoading, error } = useQuery({
    queryKey: ["fornecedores", id],
    queryFn: () => getFornecedor(id),
    enabled: !Number.isNaN(id),
  });

  const initialForm = useMemo(
    () => ({
      nome: fornecedor?.nome ?? "",
      tipo: fornecedor?.tipo ?? "COOPERATIVA",
      contato: fornecedor?.contato ?? "",
      observacoes: fornecedor?.observacoes ?? "",
      ativo: fornecedor?.ativo ?? true,
    }),
    [fornecedor]
  );

  const form = dirty ? draft : initialForm;

  const updateMutation = useMutation({
    mutationFn: (p: FornecedorUpdate) => updateFornecedor(id, p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
      toast.success("Fornecedor atualizado");
      router.push(`/agricultura/fornecedores/${id}`);
    },
    onError: (err: unknown) => {
      setFormError(getApiErrorMessage(err, "Erro ao atualizar fornecedor."));
      setConformidadeCode(getApiErrorConformidadeCode(err));
      setIsValidationError(false);
    },
  });

  const handleSubmit = () => {
    setFormError("");
    setConformidadeCode(undefined);
    setIsValidationError(false);
    setFieldErrors({});

    const validation = validateFornecedorForm({ nome: form.nome });
    if (!validation.valid) {
      setFieldErrors(validation.fields);
      setFormError(validation.summary ?? "Corrija os campos assinalados.");
      setIsValidationError(true);
      return;
    }

    updateMutation.mutate({
      nome: form.nome,
      tipo: form.tipo,
      contato: form.contato || undefined,
      observacoes: form.observacoes || undefined,
      ativo: form.ativo,
    });
  };

  const parsed = formError ? parsePrefixedConformidadeMessage(formError) : null;
  const displayMessage = parsed?.message ?? formError;
  const displayCode = conformidadeCode ?? parsed?.conformidadeCode;

  if (!params?.id) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/agricultura/fornecedores">Voltar</BackLink>
        <p className="mt-4 text-muted-foreground">Carregando…</p>
      </PageContainer>
    );
  }

  if (Number.isNaN(id) || id <= 0) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/agricultura/fornecedores">Voltar</BackLink>
        <p className="mt-4 text-destructive">ID inválido.</p>
      </PageContainer>
    );
  }

  if (isLoading || (!error && !fornecedor)) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/agricultura/fornecedores">Voltar</BackLink>
        <p className="mt-4 text-muted-foreground">Carregando…</p>
      </PageContainer>
    );
  }

  if (error || !fornecedor) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/agricultura/fornecedores">Voltar</BackLink>
        <p className="mt-4 text-destructive">Fornecedor não encontrado.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="narrow">
      <BackLink href={`/agricultura/fornecedores/${id}`}>Voltar ao fornecedor</BackLink>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Editar fornecedor</CardTitle>
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
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => {
                setDirty(true);
                setDraft((prev) => ({ ...(dirty ? prev : initialForm), nome: e.target.value }));
              }}
              placeholder="Ex: Cooperativa XYZ"
              aria-invalid={fieldErrors.nome ? true : undefined}
            />
            <FormFieldError message={fieldErrors.nome} />
          </div>
          <div>
            <Label htmlFor="tipo">Tipo</Label>
            <Select
              value={form.tipo}
              onValueChange={(value) => {
                setDirty(true);
                setDraft((prev) => ({ ...(dirty ? prev : initialForm), tipo: value }));
              }}
            >
              <SelectTrigger id="tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COOPERATIVA">Cooperativa</SelectItem>
                <SelectItem value="REVENDA">Revenda</SelectItem>
                <SelectItem value="OUTRO">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="contato">Contato (opcional)</Label>
            <Input
              id="contato"
              value={form.contato}
              onChange={(e) => {
                setDirty(true);
                setDraft((prev) => ({ ...(dirty ? prev : initialForm), contato: e.target.value }));
              }}
              placeholder="Telefone ou e-mail"
            />
          </div>
          <div>
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Input
              id="observacoes"
              value={form.observacoes}
              onChange={(e) => {
                setDirty(true);
                setDraft((prev) => ({ ...(dirty ? prev : initialForm), observacoes: e.target.value }));
              }}
            />
          </div>
          <div>
            <Label htmlFor="ativo">Ativo</Label>
            <Select
              value={form.ativo ? "true" : "false"}
              onValueChange={(v) => {
                setDirty(true);
                setDraft((prev) => ({ ...(dirty ? prev : initialForm), ativo: v === "true" }));
              }}
            >
              <SelectTrigger id="ativo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default function EditarFornecedorPage() {
  return (
    <ProtectedRoute>
      <EditarFornecedorContent />
    </ProtectedRoute>
  );
}
