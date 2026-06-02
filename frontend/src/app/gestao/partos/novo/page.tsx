"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { create as createParto, type PartoCriaInput } from "@/services/partos";
import { animaisFazendaQueryKey } from "@/components/gestao/useAnimaisMap";
import { listByFazenda as listGestacoesByFazenda } from "@/services/gestacoes";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoFormLayout } from "@/components/gestao/GestaoFormLayout";
import {
  PartoFormFields,
  type PartoFormState,
} from "@/components/gestao/PartoFormFields";
import {
  getApiErrorConformidadeCode,
  getApiErrorMessage,
} from "@/lib/errors";
import { validatePartoForm, type FieldErrors } from "@/lib/form-validation";
import { toast } from "@/hooks/use-toast";
import { useGestaoNovoUrlParams } from "@/hooks/useGestaoNovoUrlParams";
import { gestaoNovoSuccessPath } from "@/lib/gestaoNovoUrl";
import { nowDatetimeLocalInputValue } from "@/lib/format";
import { defaultCriaLinha } from "@/components/gestao/cria-constants";

function emptyFormState(animalId = "", gestacaoId = ""): PartoFormState {
  return {
    animalId,
    data: nowDatetimeLocalInputValue(),
    numeroCrias: "1",
    crias: [defaultCriaLinha()],
    tipo: "",
    gestacaoId,
    complicacoes: "",
    observacoes: "",
  };
}

function NovoContent() {
  const router = useRouter();
  const { animalId: preselectedAnimalId, gestacaoId: preselectedGestacaoId, hasPreselectedAnimal } =
    useGestaoNovoUrlParams();
  const { fazendaAtiva } = useFazendaAtiva();
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<PartoFormState>(() =>
    emptyFormState(preselectedAnimalId, preselectedGestacaoId),
  );
  const [formError, setFormError] = useState("");
  const [isValidationError, setIsValidationError] = useState(false);
  const [conformidadeCode, setConformidadeCode] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const fazendaId = fazendaAtiva?.id ?? 0;

  const { data: gestacoes = [] } = useQuery({
    queryKey: ["gestacoes", fazendaId],
    queryFn: () => listGestacoesByFazenda(fazendaId),
    enabled: fazendaId > 0,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const n = Math.max(1, parseInt(formState.numeroCrias, 10) || 1);
      const criasPayload: PartoCriaInput[] = [];
      for (let i = 0; i < n; i++) {
        const row = formState.crias[i]!;
        let peso: number | undefined;
        if (row.condicao === "VIVO" && row.peso.trim()) {
          const p = Number(row.peso.trim().replace(",", "."));
          peso = p;
        }
        const ident = row.identificacao.trim();
        const raca = row.raca.trim();
        criasPayload.push({
          sexo: row.sexo,
          condicao: row.condicao,
          ...(peso !== undefined ? { peso } : {}),
          ...(ident ? { animal_identificacao: ident } : {}),
          ...(raca ? { animal_raca: raca } : {}),
        });
      }
      return createParto({
        animal_id: Number(formState.animalId),
        data: new Date(formState.data).toISOString(),
        fazenda_id: fazendaAtiva!.id,
        numero_crias: n,
        tipo: formState.tipo || undefined,
        gestacao_id: formState.gestacaoId ? Number(formState.gestacaoId) : null,
        complicacoes: formState.complicacoes.trim() || undefined,
        observacoes: formState.observacoes.trim() || undefined,
        crias: criasPayload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partos", fazendaAtiva?.id] });
      if (fazendaAtiva?.id) {
        queryClient.invalidateQueries({
          queryKey: animaisFazendaQueryKey(fazendaAtiva.id, "operacional"),
        });
        queryClient.invalidateQueries({
          queryKey: animaisFazendaQueryKey(fazendaAtiva.id, "todos"),
        });
      }
      toast.success("Parto registado");
      const aid = Number(formState.animalId);
      router.push(
        gestaoNovoSuccessPath(aid > 0 ? String(aid) : "", "/gestao/partos"),
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
        <BackLink href="/gestao/partos">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Selecione uma fazenda.</p>
      </PageContainer>
    );
  }

  const handleSubmit = () => {
    setFormError("");
    setConformidadeCode(undefined);
    const validation = validatePartoForm(formState);
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
      title="Registrar parto"
      backHref="/gestao/partos"
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
      <PartoFormFields
        fazendaId={fazendaId}
        gestacoes={gestacoes}
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
