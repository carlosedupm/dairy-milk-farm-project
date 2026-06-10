"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { create } from "@/services/cios";
import { invalidateAnimalTimeline } from "@/services/animais";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoFormLayout } from "@/components/gestao/GestaoFormLayout";
import {
  CioFormFields,
  type CioFormState,
} from "@/components/gestao/CioFormFields";
import {
  getApiErrorConformidadeCode,
  getApiErrorMessage,
} from "@/lib/errors";
import { todayISODate } from "@/lib/date-limits";
import { validateCioForm, type FieldErrors } from "@/lib/form-validation";
import { toast } from "@/hooks/use-toast";
import { useGestaoNovoUrlParams } from "@/hooks/useGestaoNovoUrlParams";
import { gestaoNovoSuccessPath } from "@/lib/gestaoNovoUrl";
import { nowDatetimeLocalInputValue } from "@/lib/format";

function emptyFormState(animalId = ""): CioFormState {
  return {
    animalId,
    dataDetectado: nowDatetimeLocalInputValue(),
    metodo: "",
    intensidade: "",
  };
}

function NovoContent() {
  const router = useRouter();
  const { animalId: preselectedAnimalId } = useGestaoNovoUrlParams();
  const { fazendaAtiva } = useFazendaAtiva();
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<CioFormState>(() =>
    emptyFormState(preselectedAnimalId),
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
        data_detectado: new Date(formState.dataDetectado).toISOString(),
        fazenda_id: fazendaAtiva!.id,
        metodo_deteccao: formState.metodo || undefined,
        intensidade: formState.intensidade || undefined,
      }),
    onSuccess: async () => {
      const aid = Number(formState.animalId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cios", fazendaAtiva?.id] }),
        ...(aid > 0
          ? [
              queryClient.invalidateQueries({ queryKey: ["animais", aid] }),
              queryClient.invalidateQueries({
                queryKey: ["animais", aid, "contexto"],
              }),
              invalidateAnimalTimeline(queryClient, aid),
            ]
          : []),
      ]);
      toast.success("Cio registado");
      router.push(
        gestaoNovoSuccessPath(aid > 0 ? String(aid) : "", "/gestao/cios"),
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
        <BackLink href="/gestao/cios">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Selecione uma fazenda.</p>
      </PageContainer>
    );
  }

  const handleSubmit = () => {
    setFormError("");
    setConformidadeCode(undefined);
    const validation = validateCioForm(formState, { maxDate: todayISODate() });
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
      title="Registrar cio"
      backHref="/gestao/cios"
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
      <CioFormFields
        fazendaId={fazendaId}
        formState={formState}
        setFormState={setFormState}
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
