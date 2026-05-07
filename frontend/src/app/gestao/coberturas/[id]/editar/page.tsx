"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { listByFazenda } from "@/services/animais";
import { get, update, type Cobertura } from "@/services/coberturas";
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
import { toDatetimeLocalInputValue } from "@/lib/format";

function initialFormState(c: Cobertura): CoberturaFormState {
  const linked = c.touro_animal_id != null && c.touro_animal_id > 0;
  return {
    animalId: c.animal_id.toString(),
    tipo: c.tipo,
    data: c.data ? toDatetimeLocalInputValue(c.data) : "",
    touroAnimalId: linked ? String(c.touro_animal_id) : "",
    touroInfo: linked ? "" : (c.touro_info ?? ""),
    observacoes: c.observacoes ?? "",
  };
}

type CoberturaEditFormProps = {
  cobertura: Cobertura;
  fazendaId: number;
};

function CoberturaEditForm({ cobertura, fazendaId }: CoberturaEditFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState(() => initialFormState(cobertura));

  const { data: animais = [] } = useQuery({
    queryKey: ["animais", fazendaId],
    queryFn: () => listByFazenda(fazendaId),
    enabled: fazendaId > 0,
  });

  const mutation = useMutation({
    mutationFn: () =>
      update(cobertura.id, {
        animal_id: Number(formState.animalId),
        tipo: formState.tipo,
        data: new Date(formState.data).toISOString(),
        fazenda_id: fazendaId,
        touro_animal_id: formState.touroAnimalId ? Number(formState.touroAnimalId) : undefined,
        touro_info: formState.touroAnimalId
          ? undefined
          : formState.touroInfo.trim() || undefined,
        observacoes: formState.observacoes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coberturas", fazendaId] });
      queryClient.invalidateQueries({ queryKey: ["cobertura", cobertura.id] });
      router.push("/gestao/coberturas");
    },
  });

  return (
    <GestaoFormLayout
      title="Editar cobertura"
      backHref="/gestao/coberturas"
      submitLabel="Salvar"
      onSubmit={() => mutation.mutate()}
      isPending={mutation.isPending}
      error={
        mutation.isError ? getApiErrorMessage(mutation.error, "Erro ao salvar.") : undefined
      }
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

function EditarContent() {
  const params = useParams();
  const id = Number(params.id);
  const { fazendaAtiva } = useFazendaAtiva();

  const { data: cobertura, isLoading } = useQuery({
    queryKey: ["cobertura", id],
    queryFn: () => get(id),
    enabled: id > 0,
  });

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/gestao/coberturas">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Selecione uma fazenda.</p>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/gestao/coberturas">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Carregando…</p>
      </PageContainer>
    );
  }

  if (!cobertura || cobertura.fazenda_id !== fazendaAtiva.id) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/gestao/coberturas">Voltar</BackLink>
        <p className="text-destructive mt-4">Registro não encontrado.</p>
      </PageContainer>
    );
  }

  return (
    <CoberturaEditForm key={cobertura.id} cobertura={cobertura} fazendaId={fazendaAtiva.id} />
  );
}

export default function EditarPage() {
  return (
    <ProtectedRoute>
      <EditarContent />
    </ProtectedRoute>
  );
}
