"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { create } from "@/services/cios";
import { listByFazenda } from "@/services/animais";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoFormLayout } from "@/components/gestao/GestaoFormLayout";
import {
  CioFormFields,
  cioFormSubmitDisabled,
  type CioFormState,
} from "@/components/gestao/CioFormFields";
import { getApiErrorMessage } from "@/lib/errors";
import { nowDatetimeLocalInputValue } from "@/lib/format";

function emptyFormState(): CioFormState {
  return {
    animalId: "",
    dataDetectado: nowDatetimeLocalInputValue(),
    metodo: "",
    intensidade: "",
  };
}

function NovoContent() {
  const router = useRouter();
  const { fazendaAtiva } = useFazendaAtiva();
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<CioFormState>(() => emptyFormState());

  const fazendaId = fazendaAtiva?.id ?? 0;

  const { data: animais = [] } = useQuery({
    queryKey: ["animais", fazendaId],
    queryFn: () => listByFazenda(fazendaId),
    enabled: fazendaId > 0,
  });

  const mutation = useMutation({
    mutationFn: () =>
      create({
        animal_id: Number(formState.animalId),
        data_detectado: new Date(formState.dataDetectado).toISOString(),
        fazenda_id: fazendaAtiva!.id,
        metodo_deteccao: formState.metodo || undefined,
        intensidade: formState.intensidade || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cios", fazendaAtiva?.id] });
      router.push("/gestao/cios");
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

  return (
    <GestaoFormLayout
      title="Registrar cio"
      backHref="/gestao/cios"
      submitLabel="Registrar"
      onSubmit={() => mutation.mutate()}
      isPending={mutation.isPending}
      error={
        mutation.isError ? getApiErrorMessage(mutation.error, "Erro ao registrar.") : undefined
      }
      submitDisabled={cioFormSubmitDisabled(formState)}
    >
      <CioFormFields animais={animais} formState={formState} setFormState={setFormState} />
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
