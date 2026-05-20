"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Cio } from "@/services/cios";
import { get, update } from "@/services/cios";
import { listByFazenda } from "@/services/animais";
import type { Animal } from "@/services/animais";
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
import { toDatetimeLocalInputValue } from "@/lib/format";

function initialFormState(cio: Cio): CioFormState {
  return {
    animalId: cio.animal_id.toString(),
    dataDetectado: cio.data_detectado
      ? toDatetimeLocalInputValue(cio.data_detectado)
      : "",
    metodo: cio.metodo_deteccao ?? "",
    intensidade: cio.intensidade ?? "",
  };
}

type CioEditFormProps = {
  cio: Cio;
  animais: Animal[];
  fazendaId: number;
};

function CioEditForm({ cio, animais, fazendaId }: CioEditFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState(() => initialFormState(cio));

  const mutation = useMutation({
    mutationFn: () =>
      update(cio.id, {
        animal_id: Number(formState.animalId),
        data_detectado: new Date(formState.dataDetectado).toISOString(),
        fazenda_id: cio.fazenda_id,
        metodo_deteccao: formState.metodo || undefined,
        intensidade: formState.intensidade || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cios", fazendaId] });
      queryClient.invalidateQueries({ queryKey: ["cio", cio.id] });
      router.push("/gestao/cios");
    },
  });

  return (
    <GestaoFormLayout
      title="Editar cio"
      backHref="/gestao/cios"
      submitLabel="Salvar"
      onSubmit={() => mutation.mutate()}
      isPending={mutation.isPending}
      error={
        mutation.isError ? getApiErrorMessage(mutation.error, "Erro ao salvar.") : undefined
      }
      submitDisabled={cioFormSubmitDisabled(formState)}
    >
      <CioFormFields animais={animais} formState={formState} setFormState={setFormState} />
    </GestaoFormLayout>
  );
}

function EditarContent() {
  const params = useParams();
  const id = Number(params.id);
  const { fazendaAtiva } = useFazendaAtiva();

  const { data: cio, isLoading: loadingCio } = useQuery({
    queryKey: ["cio", id],
    queryFn: () => get(id),
    enabled: id > 0,
  });

  const { data: animais = [] } = useQuery({
    queryKey: ["animais", "by-fazenda", fazendaAtiva?.id],
    queryFn: () => listByFazenda(fazendaAtiva!.id),
    enabled: !!fazendaAtiva?.id,
  });

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/gestao/cios">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Selecione uma fazenda.</p>
      </PageContainer>
    );
  }

  if (loadingCio) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/gestao/cios">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Carregando…</p>
      </PageContainer>
    );
  }

  if (!cio) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/gestao/cios">Voltar</BackLink>
        <p className="text-destructive mt-4">Registro não encontrado.</p>
      </PageContainer>
    );
  }

  if (cio.fazenda_id !== fazendaAtiva.id) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/gestao/cios">Voltar</BackLink>
        <p className="text-destructive mt-4">Registro não encontrado.</p>
      </PageContainer>
    );
  }

  return (
    <CioEditForm key={cio.id} cio={cio} animais={animais} fazendaId={fazendaAtiva.id} />
  );
}

export default function EditarPage() {
  return (
    <ProtectedRoute>
      <EditarContent />
    </ProtectedRoute>
  );
}
