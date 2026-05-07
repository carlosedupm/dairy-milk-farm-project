"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { create as createParto, type PartoCriaInput } from "@/services/partos";
import { listByFazenda } from "@/services/animais";
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
import { nowDatetimeLocalInputValue } from "@/lib/format";
import { defaultCriaLinha } from "@/components/gestao/cria-constants";

function emptyFormState(): PartoFormState {
  return {
    animalId: "",
    data: nowDatetimeLocalInputValue(),
    numeroCrias: "1",
    crias: [defaultCriaLinha()],
    tipo: "",
    gestacaoId: "",
    complicacoes: "",
    observacoes: "",
  };
}

function NovoContent() {
  const router = useRouter();
  const { fazendaAtiva } = useFazendaAtiva();
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<PartoFormState>(() => emptyFormState());

  const fazendaId = fazendaAtiva?.id ?? 0;

  const { data: animais = [] } = useQuery({
    queryKey: ["animais", fazendaId],
    queryFn: () => listByFazenda(fazendaId),
    enabled: fazendaId > 0,
  });

  const { data: gestacoes = [] } = useQuery({
    queryKey: ["gestacoes", fazendaId],
    queryFn: () => listGestacoesByFazenda(fazendaId),
    enabled: fazendaId > 0,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const n = Math.max(1, parseInt(formState.numeroCrias, 10) || 1);
      if (formState.crias.length !== n) {
        throw new Error(
          "Ajuste o número de animais na cria para coincidir com os dados informados (linhas abaixo)."
        );
      }
      const criasPayload: PartoCriaInput[] = [];
      for (let i = 0; i < n; i++) {
        const row = formState.crias[i]!;
        let peso: number | undefined;
        if (row.condicao === "VIVO" && row.peso.trim()) {
          const p = Number(row.peso.trim().replace(",", "."));
          if (!Number.isFinite(p) || p < 0) {
            throw new Error(`Peso inválido na cria ${i + 1}. Use número em kg (ex.: 38 ou 38,5).`);
          }
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
      const parto = await createParto({
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
      return parto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partos", fazendaAtiva?.id] });
      queryClient.invalidateQueries({ queryKey: ["animais", fazendaAtiva?.id] });
      router.push("/gestao/partos");
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

  return (
    <GestaoFormLayout
      title="Registrar parto"
      backHref="/gestao/partos"
      submitLabel="Registrar"
      onSubmit={() => mutation.mutate()}
      isPending={mutation.isPending}
      error={
        mutation.isError
          ? mutation.error instanceof Error
            ? mutation.error.message
            : getApiErrorMessage(mutation.error, "Erro ao registrar.")
          : undefined
      }
      submitDisabled={!formState.animalId || !formState.data}
    >
      <PartoFormFields
        animais={animais}
        gestacoes={gestacoes}
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
