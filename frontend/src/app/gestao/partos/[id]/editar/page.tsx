"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useAnimaisOperacionalList } from "@/components/gestao/useAnimaisMap";
import { get, update, type Parto } from "@/services/partos";
import { listByFazenda as listGestacoesByFazenda } from "@/services/gestacoes";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoFormLayout } from "@/components/gestao/GestaoFormLayout";
import {
  PartoFormFields,
  type PartoFormState,
} from "@/components/gestao/PartoFormFields";
import { getApiErrorMessage } from "@/lib/errors";
import { toDatetimeLocalInputValue } from "@/lib/format";
import { defaultCriaLinha } from "@/components/gestao/cria-constants";
import { PartoEditCriasPanel } from "@/components/gestao/PartoEditCriasPanel";
import { GestaoEditarBloqueadoGuard } from "@/components/gestao/GestaoEditarBloqueadoGuard";

function initialFormState(parto: Parto): PartoFormState {
  return {
    animalId: parto.animal_id.toString(),
    data: parto.data ? toDatetimeLocalInputValue(parto.data) : "",
    numeroCrias: String(parto.numero_crias ?? 1),
    crias: [defaultCriaLinha()],
    tipo: parto.tipo ?? "",
    gestacaoId: parto.gestacao_id ? String(parto.gestacao_id) : "",
    complicacoes: parto.complicacoes ?? "",
    observacoes: parto.observacoes ?? "",
  };
}

type PartoEditFormProps = {
  parto: Parto;
  fazendaId: number;
};

function PartoEditForm({ parto, fazendaId }: PartoEditFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState(() => initialFormState(parto));

  const { data: animais = [] } = useAnimaisOperacionalList(fazendaId);
  const { data: gestacoes = [] } = useQuery({
    queryKey: ["gestacoes", fazendaId],
    queryFn: () => listGestacoesByFazenda(fazendaId),
    enabled: fazendaId > 0,
  });

  const racaMae = useMemo(() => {
    const id = Number(formState.animalId);
    if (!id) return "";
    return (animais.find((a) => a.id === id)?.raca ?? "").trim();
  }, [animais, formState.animalId]);

  const mutation = useMutation({
    mutationFn: () =>
      update(parto.id, {
        animal_id: Number(formState.animalId),
        data: new Date(formState.data).toISOString(),
        fazenda_id: fazendaId,
        numero_crias: Math.max(1, parseInt(formState.numeroCrias, 10) || 1),
        tipo: formState.tipo || undefined,
        gestacao_id: formState.gestacaoId ? Number(formState.gestacaoId) : null,
        complicacoes: formState.complicacoes.trim() || undefined,
        observacoes: formState.observacoes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partos", fazendaId] });
      queryClient.invalidateQueries({ queryKey: ["parto", parto.id] });
      router.push("/gestao/partos");
    },
  });

  return (
    <GestaoFormLayout
      title="Editar parto"
      backHref="/gestao/partos"
      submitLabel="Salvar"
      onSubmit={() => mutation.mutate()}
      isPending={mutation.isPending}
      error={
        mutation.isError ? getApiErrorMessage(mutation.error, "Erro ao salvar.") : undefined
      }
      submitDisabled={!formState.animalId || !formState.data}
    >
      <PartoFormFields
        animais={animais}
        gestacoes={gestacoes}
        formState={formState}
        setFormState={setFormState}
        includeCriasRepeater={false}
      />
      <PartoEditCriasPanel
        partoId={parto.id}
        fazendaId={fazendaId}
        numeroCriasText={formState.numeroCrias}
        racaMae={racaMae || undefined}
        matrizAnimalId={parto.animal_id}
      />
    </GestaoFormLayout>
  );
}

function EditarContent() {
  const params = useParams();
  const id = Number(params.id);
  const { fazendaAtiva } = useFazendaAtiva();

  const { data: parto, isLoading } = useQuery({
    queryKey: ["parto", id],
    queryFn: () => get(id),
    enabled: id > 0,
  });

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/gestao/partos">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Selecione uma fazenda.</p>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/gestao/partos">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Carregando…</p>
      </PageContainer>
    );
  }

  if (!parto || parto.fazenda_id !== fazendaAtiva.id) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/gestao/partos">Voltar</BackLink>
        <p className="text-destructive mt-4">Registro não encontrado.</p>
      </PageContainer>
    );
  }

  return (
    <GestaoEditarBloqueadoGuard
      animalId={parto.animal_id}
      fazendaId={fazendaAtiva.id}
      backHref="/gestao/partos"
    >
      <PartoEditForm key={parto.id} parto={parto} fazendaId={fazendaAtiva.id} />
    </GestaoEditarBloqueadoGuard>
  );
}

export default function EditarPage() {
  return (
    <ProtectedRoute>
      <EditarContent />
    </ProtectedRoute>
  );
}
