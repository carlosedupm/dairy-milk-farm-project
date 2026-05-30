"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  canCriarRegistroSaude,
  canEditarRegistroSaude,
} from "@/config/appAccess";
import { GestaoFormLayout } from "@/components/gestao/GestaoFormLayout";
import {
  AnimalSaudeFormFields,
  animalSaudeFormSubmitDisabled,
  animalSaudeFormToPayload,
  emptyAnimalSaudeFormState,
  type AnimalSaudeFormState,
} from "@/components/animais/AnimalSaudeFormFields";
import {
  animalSaudeListQueryKey,
  create,
  update,
  type AnimalSaudeRegistro,
} from "@/services/animalSaude";
import { invalidateAnimalTimeline } from "@/services/animais";
import { getApiErrorMessage } from "@/lib/errors";

type Props = {
  animalId: number;
  mode: "create" | "edit";
  initial?: AnimalSaudeRegistro;
  saudeId?: number;
};

function stateFromRegistro(row: AnimalSaudeRegistro): AnimalSaudeFormState {
  return {
    tipoCaso: row.tipo_caso,
    dataInicio: row.data_inicio.slice(0, 10),
    dataFim: row.data_fim ? row.data_fim.slice(0, 10) : "",
    status: row.status,
    observacoes: row.observacoes ?? "",
  };
}

export function AnimalSaudeForm({ animalId, mode, initial, saudeId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const perfil = user?.perfil;

  const [formState, setFormState] = useState<AnimalSaudeFormState>(() =>
    initial ? stateFromRegistro(initial) : emptyAnimalSaudeFormState()
  );

  const listHref = `/animais/${animalId}/saude`;
  const canSubmit =
    mode === "create" ? canCriarRegistroSaude(perfil) : canEditarRegistroSaude(perfil);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = animalSaudeFormToPayload(formState);
      if (mode === "create") {
        return create(animalId, payload);
      }
      if (!saudeId) throw new Error("ID do registo em falta");
      return update(animalId, saudeId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: animalSaudeListQueryKey(animalId),
      });
      queryClient.invalidateQueries({ queryKey: ["animais", animalId] });
      queryClient.invalidateQueries({
        queryKey: ["animais", animalId, "contexto"],
      });
      invalidateAnimalTimeline(queryClient, animalId);
      if (saudeId) {
        queryClient.invalidateQueries({
          queryKey: ["animais", animalId, "saude", saudeId],
        });
      }
      router.push(listHref);
    },
  });

  if (!canSubmit) {
    return (
      <p className="text-muted-foreground">
        O seu perfil não pode{" "}
        {mode === "create" ? "registar" : "editar"} casos de saúde deste animal.
      </p>
    );
  }

  return (
    <GestaoFormLayout
      title={mode === "create" ? "Novo registo de saúde" : "Editar registo de saúde"}
      backHref={listHref}
      submitLabel={mode === "create" ? "Registrar" : "Salvar"}
      onSubmit={() => mutation.mutate()}
      isPending={mutation.isPending}
      error={
        mutation.isError
          ? getApiErrorMessage(
              mutation.error,
              mode === "create" ? "Erro ao registrar." : "Erro ao salvar."
            )
          : undefined
      }
      submitDisabled={animalSaudeFormSubmitDisabled(formState)}
    >
      <p className="text-muted-foreground text-sm">
        O status de saúde do animal na ficha é recalculado automaticamente com
        base nos casos ativos após guardar.
      </p>
      <AnimalSaudeFormFields formState={formState} setFormState={setFormState} />
    </GestaoFormLayout>
  );
}
