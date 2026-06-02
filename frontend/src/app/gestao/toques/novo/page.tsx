"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { create } from "@/services/toques";
import { listByFazenda as listCoberturasByFazenda } from "@/services/coberturas";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoFormLayout } from "@/components/gestao/GestaoFormLayout";
import {
  ToqueFormFields,
  useToqueMinDate,
  type ToqueFormState,
} from "@/components/gestao/ToqueFormFields";
import {
  getApiErrorConformidadeCode,
  getApiErrorMessage,
} from "@/lib/errors";
import { todayISODate } from "@/lib/date-limits";
import { validateToqueForm, type FieldErrors } from "@/lib/form-validation";
import { toast } from "@/hooks/use-toast";
import { invalidateAnimalTimeline } from "@/services/animais";
import { useGestaoNovoUrlParams } from "@/hooks/useGestaoNovoUrlParams";
import { gestaoNovoSuccessPath } from "@/lib/gestaoNovoUrl";
import { nowDatetimeLocalInputValue } from "@/lib/format";
import {
  classificacaoRequiresCobertura,
  gestacaoToDias,
} from "@/lib/toquesUtils";

function emptyFormState(animalId = ""): ToqueFormState {
  return {
    animalId,
    coberturaId: "",
    data: nowDatetimeLocalInputValue(),
    classificacao: "PRENHA",
    gestacaoValor: "",
    gestacaoUnidade: "meses",
    observacoes: "",
    veterinario: "",
    metodo: "PALPACAO",
  };
}

function NovoContent() {
  const router = useRouter();
  const { animalId: preselectedAnimalId, hasPreselectedAnimal } =
    useGestaoNovoUrlParams();
  const { fazendaAtiva } = useFazendaAtiva();
  const queryClient = useQueryClient();

  const [formState, setFormState] = useState<ToqueFormState>(() =>
    emptyFormState(preselectedAnimalId)
  );
  const [formError, setFormError] = useState("");
  const [isValidationError, setIsValidationError] = useState(false);
  const [conformidadeCode, setConformidadeCode] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const fazendaId = fazendaAtiva?.id ?? 0;
  const precisaCobertura = classificacaoRequiresCobertura(formState.classificacao);

  const { data: coberturasFazenda = [] } = useQuery({
    queryKey: ["coberturas", fazendaId],
    queryFn: () => listCoberturasByFazenda(fazendaId),
    enabled: fazendaId > 0 && precisaCobertura,
  });

  const coberturasDoAnimal = useMemo(() => {
    const aid = Number(formState.animalId);
    if (!aid) return [];
    return coberturasFazenda
      .filter((c) => c.animal_id === aid)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [formState.animalId, coberturasFazenda]);

  const coberturaSelectValue = useMemo(() => {
    if (!formState.coberturaId) {
      if (coberturasDoAnimal.length === 1) {
        return coberturasDoAnimal[0].id.toString();
      }
      return "";
    }
    if (
      coberturasDoAnimal.some((c) => c.id.toString() === formState.coberturaId)
    ) {
      return formState.coberturaId;
    }
    return coberturasDoAnimal.length === 1
      ? coberturasDoAnimal[0].id.toString()
      : "";
  }, [formState.coberturaId, coberturasDoAnimal]);

  const minDate = useToqueMinDate(
    coberturasDoAnimal,
    formState.coberturaId,
    coberturaSelectValue
  );

  const mutation = useMutation({
    mutationFn: () => {
      const coberturaIdNum = precisaCobertura ? Number(coberturaSelectValue) : 0;
      const diasGestacao =
        formState.classificacao === "PRENHA"
          ? gestacaoToDias(formState.gestacaoValor, formState.gestacaoUnidade)
          : null;
      return create({
        animal_id: Number(formState.animalId),
        data: new Date(formState.data).toISOString(),
        classificacao_operacional: formState.classificacao,
        fazenda_id: fazendaId,
        cobertura_id:
          precisaCobertura && coberturaIdNum > 0 ? coberturaIdNum : null,
        dias_gestacao_estimados: diasGestacao,
        metodo: formState.metodo || null,
        veterinario: formState.veterinario.trim() || null,
        observacoes: formState.observacoes.trim() || null,
      });
    },
    onSuccess: async () => {
      toast.success("Toque registado");
      const aid = Number(formState.animalId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["toques", fazendaId] }),
        queryClient.invalidateQueries({ queryKey: ["animais"] }),
        queryClient.invalidateQueries({ queryKey: ["animais", aid] }),
        queryClient.invalidateQueries({ queryKey: ["animais", "contexto"] }),
        invalidateAnimalTimeline(queryClient, aid > 0 ? aid : undefined),
        queryClient.invalidateQueries({ queryKey: ["resumo-pecuario"] }),
        queryClient.invalidateQueries({ queryKey: ["gestacoes"] }),
        queryClient.invalidateQueries({ queryKey: ["coberturas", fazendaId] }),
      ]);
      router.push(
        gestaoNovoSuccessPath(
          aid > 0 ? String(aid) : "",
          "/gestao/toques",
        ),
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
        <BackLink href="/gestao/toques">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Selecione uma fazenda.</p>
      </PageContainer>
    );
  }

  const handleSubmit = () => {
    setFormError("");
    setConformidadeCode(undefined);
    const validation = validateToqueForm(
      {
        animalId: formState.animalId,
        data: formState.data,
        classificacao: formState.classificacao,
        coberturaId: coberturaSelectValue,
      },
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
      title="Registrar toque (diagnóstico)"
      backHref="/gestao/toques"
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
      <ToqueFormFields
        fazendaId={fazendaId}
        coberturasDoAnimal={coberturasDoAnimal}
        coberturaSelectValue={coberturaSelectValue}
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
