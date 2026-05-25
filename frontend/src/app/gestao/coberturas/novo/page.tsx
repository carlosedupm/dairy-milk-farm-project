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
  coberturaFormSubmitDisabled,
  type CoberturaFormState,
} from "@/components/gestao/CoberturaFormFields";
import { getApiErrorMessage } from "@/lib/errors";
import { nowDatetimeLocalInputValue } from "@/lib/format";

function emptyFormState(): CoberturaFormState {
  return {
    animalId: "",
    tipo: "IA",
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
      router.push("/gestao/coberturas");
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

  return (
    <GestaoFormLayout
      title="Registrar cobertura"
      backHref="/gestao/coberturas"
      submitLabel="Registrar"
      onSubmit={() => mutation.mutate()}
      isPending={mutation.isPending}
      error={mutation.isError ? getApiErrorMessage(mutation.error, "Erro ao registrar.") : undefined}
      submitDisabled={coberturaFormSubmitDisabled(formState)}
    >
      <CoberturaFormFields
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
