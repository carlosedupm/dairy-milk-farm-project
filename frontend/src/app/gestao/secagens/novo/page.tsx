"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { create } from "@/services/secagens";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoFormLayout } from "@/components/gestao/GestaoFormLayout";
import {
  SecagemFormFields,
  useSecagemMinDate,
  type SecagemFormState,
} from "@/components/gestao/SecagemFormFields";
import {
  getApiErrorConformidadeCode,
  getApiErrorMessage,
} from "@/lib/errors";
import { todayISODate } from "@/lib/date-limits";
import { validateSecagemForm, type FieldErrors } from "@/lib/form-validation";
import { toast } from "@/hooks/use-toast";
import { useGestaoNovoUrlParams } from "@/hooks/useGestaoNovoUrlParams";
import { gestaoNovoSuccessPath } from "@/lib/gestaoNovoUrl";

function emptyFormState(animalId = ""): SecagemFormState {
  return {
    animalId,
    data: new Date().toISOString().slice(0, 10),
  };
}

function NovoContent() {
  const router = useRouter();
  const { animalId: preselectedAnimalId, hasPreselectedAnimal } =
    useGestaoNovoUrlParams();
  const { fazendaAtiva } = useFazendaAtiva();
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<SecagemFormState>(() =>
    emptyFormState(preselectedAnimalId)
  );
  const [formError, setFormError] = useState("");
  const [isValidationError, setIsValidationError] = useState(false);
  const [conformidadeCode, setConformidadeCode] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const fazendaId = fazendaAtiva?.id ?? 0;
  const minDate = useSecagemMinDate(formState.animalId);

  const mutation = useMutation({
    mutationFn: () =>
      create({
        animal_id: Number(formState.animalId),
        data_secagem: formState.data,
        fazenda_id: fazendaAtiva!.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secagens", fazendaAtiva?.id] });
      toast.success("Secagem registada");
      const aid = Number(formState.animalId);
      router.push(
        gestaoNovoSuccessPath(aid > 0 ? String(aid) : "", "/gestao/secagens"),
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
        <BackLink href="/gestao/secagens">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Selecione uma fazenda.</p>
      </PageContainer>
    );
  }

  const handleSubmit = () => {
    setFormError("");
    setConformidadeCode(undefined);
    const validation = validateSecagemForm(
      { animalId: formState.animalId, data: formState.data },
      { minDate, maxDate: todayISODate() }
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
      title="Registrar secagem"
      backHref="/gestao/secagens"
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
      <SecagemFormFields
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
