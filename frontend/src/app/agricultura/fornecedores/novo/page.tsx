"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFornecedor } from "@/services/agricultura";
import {
  getApiErrorConformidadeCode,
  getApiErrorMessage,
  parsePrefixedConformidadeMessage,
} from "@/lib/errors";
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

function NovoFornecedorContent() {
  const router = useRouter();
  const { fazendaAtiva } = useFazendaAtiva();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("COOPERATIVA");
  const [contato, setContato] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [formError, setFormError] = useState("");
  const [isValidationError, setIsValidationError] = useState(false);
  const [conformidadeCode, setConformidadeCode] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const createMutation = useMutation({
    mutationFn: () =>
      createFornecedor(fazendaAtiva!.id, {
        nome,
        tipo,
        contato: contato || undefined,
        observacoes: observacoes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores", fazendaAtiva?.id] });
      toast.success("Fornecedor criado");
      router.push("/agricultura/fornecedores");
    },
    onError: (err: unknown) => {
      setFormError(getApiErrorMessage(err, "Erro ao criar fornecedor."));
      setConformidadeCode(getApiErrorConformidadeCode(err));
      setIsValidationError(false);
    },
  });

  const handleSubmit = () => {
    setFormError("");
    setConformidadeCode(undefined);
    setIsValidationError(false);
    setFieldErrors({});

    const validation = validateFornecedorForm({ nome });
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

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="narrow">
        <p className="text-muted-foreground">Selecione uma fazenda.</p>
        <BackLink href="/agricultura/fornecedores">Voltar</BackLink>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="narrow">
      <BackLink href="/agricultura/fornecedores">Voltar aos fornecedores</BackLink>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Novo fornecedor (cooperativa)</CardTitle>
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
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Cooperativa XYZ"
              aria-invalid={fieldErrors.nome ? true : undefined}
            />
            <FormFieldError message={fieldErrors.nome} />
          </div>
          <div>
            <Label htmlFor="tipo">Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
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
            <Input id="contato" value={contato} onChange={(e) => setContato(e.target.value)} placeholder="Telefone ou e-mail" />
          </div>
          <div>
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Input id="observacoes" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Salvando…" : "Criar fornecedor"}
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default function NovoFornecedorPage() {
  return (
    <ProtectedRoute>
      <NovoFornecedorContent />
    </ProtectedRoute>
  );
}
