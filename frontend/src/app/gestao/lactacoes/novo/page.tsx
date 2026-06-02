"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { create } from "@/services/lactacoes";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoFormLayout } from "@/components/gestao/GestaoFormLayout";
import {
  LactacaoFormFields,
  type LactacaoFormState,
} from "@/components/gestao/LactacaoFormFields";
import {
  getApiErrorConformidadeCode,
  getApiErrorMessage,
} from "@/lib/errors";
import { todayISODate } from "@/lib/date-limits";
import { validateLactacaoForm, type FieldErrors } from "@/lib/form-validation";
import { toast } from "@/hooks/use-toast";
import { useGestaoNovoUrlParams } from "@/hooks/useGestaoNovoUrlParams";
import { gestaoNovoSuccessPath } from "@/lib/gestaoNovoUrl";

function emptyFormState(animalId = ""): LactacaoFormState {
  return {
    animalId,
    numeroLactacao: "1",
    dataInicio: new Date().toISOString().slice(0, 10),
  };
}

function NovoContent() {
  const router = useRouter();
  const { animalId: preselectedAnimalId, hasPreselectedAnimal } =
    useGestaoNovoUrlParams();
  const { fazendaAtiva } = useFazendaAtiva();
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<LactacaoFormState>(() =>
    emptyFormState(preselectedAnimalId)
  );
  const [formError, setFormError] = useState("");
  const [isValidationError, setIsValidationError] = useState(false);
  const [conformidadeCode, setConformidadeCode] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const fazendaId = fazendaAtiva?.id ?? 0;

  const mutation = useMutation({
    mutationFn: () =>
      create({
        animal_id: Number(formState.animalId),
        numero_lactacao: Math.max(1, parseInt(formState.numeroLactacao, 10) || 1),
        data_inicio: formState.dataInicio,
        fazenda_id: fazendaAtiva!.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lactacoes", fazendaAtiva?.id] });
      toast.success("Lactação registada");
      const aid = Number(formState.animalId);
      router.push(
        gestaoNovoSuccessPath(aid > 0 ? String(aid) : "", "/gestao/lactacoes"),
      );
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
        <BackLink href="/gestao/lactacoes">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Selecione uma fazenda.</p>
      </PageContainer>
    );
  }

  const handleSubmit = () => {
    setFormError("");
    setConformidadeCode(undefined);
    const validation = validateLactacaoForm(
      { animalId: formState.animalId, dataInicio: formState.dataInicio },
      { maxDate: todayISODate() }
    );
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
      title="Registrar lactação"
      backHref="/gestao/lactacoes"
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
      <LactacaoFormFields
        fazendaId={fazendaId}
        formState={formState}
        setFormState={setFormState}
        preserveSelected={hasPreselectedAnimal}
      />
    </GestaoFormLayout>
  );
}

function NovoPageFallback() {
  return (
    <PageContainer variant="narrow">
      <p className="text-muted-foreground">Carregando…</p>
    </PageContainer>
  );
}

export default function NovoPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<NovoPageFallback />}>
        <NovoContent />
      </Suspense>
    </ProtectedRoute>
  );
}
