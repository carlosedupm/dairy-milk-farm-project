"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { create } from "@/services/coberturas";
import { useAnimaisOperacionalList } from "@/components/gestao/useAnimaisMap";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoFormLayout } from "@/components/gestao/GestaoFormLayout";
import {
  CoberturaFormFields,
  type CoberturaFormState,
} from "@/components/gestao/CoberturaFormFields";
import {
  getApiErrorConformidadeCode,
  getApiErrorMessage,
} from "@/lib/errors";
import { validateCoberturaForm, type FieldErrors } from "@/lib/form-validation";
import { toast } from "@/hooks/use-toast";
import { nowDatetimeLocalInputValue } from "@/lib/format";

function emptyFormState(): CoberturaFormState {
  return {
    animalId: "",
    tipo: "MONTA_NATURAL",
    data: nowDatetimeLocalInputValue(),
    touroAnimalId: "",
    touroInfo: "",
    observacoes: "",
  };
}

function NovoContent() {
  const router = useRouter();
  const { fazendaAtiva } = useFazendaAtiva();
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<CoberturaFormState>(() => emptyFormState());
  const [formError, setFormError] = useState("");
  const [isValidationError, setIsValidationError] = useState(false);
  const [conformidadeCode, setConformidadeCode] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const fazendaId = fazendaAtiva?.id ?? 0;

  const { data: animais = [] } = useAnimaisOperacionalList(fazendaId);

  const mutation = useMutation({
    mutationFn: () =>
      create({
        animal_id: Number(formState.animalId),
        tipo: formState.tipo,
        data: new Date(formState.data).toISOString(),
        fazenda_id: fazendaAtiva!.id,
        touro_animal_id: formState.touroAnimalId ? Number(formState.touroAnimalId) : undefined,
        touro_info: formState.touroAnimalId
          ? undefined
          : formState.touroInfo.trim() || undefined,
        observacoes: formState.observacoes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coberturas", fazendaAtiva?.id] });
      toast.success("Cobertura registada");
      router.push("/gestao/coberturas");
    },
    onError: (err: unknown) => {
      setFormError(getApiErrorMessage(err, "Erro ao registrar."));
      setConformidadeCode(getApiErrorConformidadeCode(err));
      setIsValidationError(false);
    },
  });

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/gestao/coberturas">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Selecione uma fazenda.</p>
      </PageContainer>
    );
  }

  const handleSubmit = () => {
    setFormError("");
    setConformidadeCode(undefined);
    const validation = validateCoberturaForm(formState);
    if (!validation.valid) {
      setFieldErrors(validation.fields);
      setFormError(validation.summary ?? "Corrija os campos assinalados.");
      setIsValidationError(true);
      return;
    }
    setFieldErrors({});
    setIsValidationError(false);
    mutation.mutate();
  };

  const displayError =
    formError ||
    (mutation.isError
      ? getApiErrorMessage(mutation.error, "Erro ao registrar.")
      : undefined);

  return (
    <GestaoFormLayout
      title="Registrar cobertura"
      backHref="/gestao/coberturas"
      submitLabel="Registrar"
      onSubmit={handleSubmit}
      isPending={mutation.isPending}
      error={displayError}
      errorConformidadeCode={
        conformidadeCode ??
        (mutation.isError ? getApiErrorConformidadeCode(mutation.error) : undefined)
      }
      isValidationError={isValidationError}
      fieldErrors={fieldErrors}
    >
      <CoberturaFormFields
        fazendaId={fazendaId}
        animais={animais}
        formState={formState}
        setFormState={setFormState}
      />
    </GestaoFormLayout>
  );
}

export default function NovoPage() {
  return (
    <ProtectedRoute>
      <NovoContent />
    </ProtectedRoute>
  );
}
