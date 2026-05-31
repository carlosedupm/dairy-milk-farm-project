"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createArea } from "@/services/agricultura";
import {
  getApiErrorConformidadeCode,
  getApiErrorMessage,
  parsePrefixedConformidadeMessage,
} from "@/lib/errors";
import { validateAreaForm, type FieldErrors } from "@/lib/form-validation";
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

function NovaAreaContent() {
  const router = useRouter();
  const { fazendaAtiva } = useFazendaAtiva();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [hectares, setHectares] = useState("");
  const [descricao, setDescricao] = useState("");
  const [formError, setFormError] = useState("");
  const [isValidationError, setIsValidationError] = useState(false);
  const [conformidadeCode, setConformidadeCode] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const createMutation = useMutation({
    mutationFn: () =>
      createArea(fazendaAtiva!.id, {
        nome,
        hectares: parseFloat(hectares) || 0,
        descricao: descricao || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas", fazendaAtiva?.id] });
      toast.success("Área criada");
      router.push("/agricultura/areas");
    },
    onError: (err: unknown) => {
      setFormError(getApiErrorMessage(err, "Erro ao criar área."));
      setConformidadeCode(getApiErrorConformidadeCode(err));
      setIsValidationError(false);
    },
  });

  const handleSubmit = () => {
    setFormError("");
    setConformidadeCode(undefined);
    setIsValidationError(false);
    setFieldErrors({});

    const validation = validateAreaForm({ nome, hectares });
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
        <BackLink href="/agricultura/areas">Voltar</BackLink>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="narrow">
      <BackLink href="/agricultura/areas">Voltar às áreas</BackLink>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Nova área / Talhão</CardTitle>
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
              placeholder="Ex: Talhão Norte"
              aria-invalid={fieldErrors.nome ? true : undefined}
            />
            <FormFieldError message={fieldErrors.nome} />
          </div>
          <div>
            <Label htmlFor="hectares">Hectares</Label>
            <Input
              id="hectares"
              type="number"
              step="0.01"
              min="0.01"
              value={hectares}
              onChange={(e) => setHectares(e.target.value)}
              placeholder="Ex: 10,5"
              aria-invalid={fieldErrors.hectares ? true : undefined}
            />
            <FormFieldError message={fieldErrors.hectares} />
          </div>
          <div>
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Input id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Salvando…" : "Criar área"}
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default function NovaAreaPage() {
  return (
    <ProtectedRoute>
      <NovaAreaContent />
    </ProtectedRoute>
  );
}
