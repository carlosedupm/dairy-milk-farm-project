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
import {
  getApiErrorConformidadeCode,
  getApiErrorMessage,
} from "@/lib/errors";
import { validateAnimalSaudeForm, type FieldErrors } from "@/lib/form-validation";
import { todayISODate } from "@/lib/date-limits";
import { minDateFromAnimal } from "@/lib/saude-date-limits";
import type { Animal } from "@/services/animais";
import { toast } from "@/hooks/use-toast";
import { animalFichaSaudeTabHref } from "@/components/animais/ficha/animalFichaTabs";

type Props = {
  animalId: number;
  animal: Pick<Animal, "data_entrada" | "data_nascimento">;
  mode: "create" | "edit";
  initial?: AnimalSaudeRegistro;
  saudeId?: number;
  /** Força visualização mesmo se o perfil pudesse editar (ex.: animal baixado). */
  forceReadOnly?: boolean;
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

export function AnimalSaudeForm({
  animalId,
  animal,
  mode,
  initial,
  saudeId,
  forceReadOnly = false,
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const perfil = user?.perfil;

  const [formState, setFormState] = useState<AnimalSaudeFormState>(() =>
    initial ? stateFromRegistro(initial) : emptyAnimalSaudeFormState()
  );
  const [formError, setFormError] = useState("");
  const [isValidationError, setIsValidationError] = useState(false);
  const [conformidadeCode, setConformidadeCode] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const listHref = animalFichaSaudeTabHref(animalId);
  const animalMinDate = minDateFromAnimal(animal);
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
      toast.success(
        mode === "create"
          ? "Registo de saúde criado"
          : "Registo de saúde atualizado"
      );
      router.push(listHref);
    },
    onError: (err: unknown) => {
      setFormError(
        getApiErrorMessage(
          err,
          mode === "create" ? "Erro ao registrar." : "Erro ao salvar."
        )
      );
      setConformidadeCode(getApiErrorConformidadeCode(err));
      setIsValidationError(false);
    },
  });

  if (!canSubmit && mode === "create") {
    return (
      <p className="text-muted-foreground">
        O seu perfil não pode registar casos de saúde deste animal.
      </p>
    );
  }

  const readOnly = forceReadOnly || (mode === "edit" && !canSubmit);

  const handleSubmit = () => {
    if (readOnly) return;
    setFormError("");
    setConformidadeCode(undefined);
    const validation = validateAnimalSaudeForm(formState, {
      minDate: animalMinDate,
      maxDate: todayISODate(),
    });
    if (!validation.valid) {
      setFieldErrors(validation.fields);
      setFormError(validation.summary ?? "Corrija os campos assinalados.");
      setConformidadeCode(validation.conformidadeCode);
      setIsValidationError(true);
      return;
    }
    setFieldErrors({});
    setIsValidationError(false);
    mutation.mutate();
  };

  return (
    <GestaoFormLayout
      title={readOnly ? "Detalhe do registo de saúde" : mode === "create" ? "Novo registo de saúde" : "Editar registo de saúde"}
      backHref={listHref}
      submitLabel={mode === "create" ? "Registrar" : "Salvar"}
      onSubmit={handleSubmit}
      isPending={mutation.isPending}
      hideSubmit={readOnly}
      error={formError}
      errorConformidadeCode={
        conformidadeCode ??
        (mutation.isError ? getApiErrorConformidadeCode(mutation.error) : undefined)
      }
      isValidationError={isValidationError}
      fieldErrors={fieldErrors}
    >
      <p className="text-muted-foreground text-sm">
        {readOnly
          ? "Visualização apenas — o seu perfil não pode editar este registo."
          : "O status de saúde do animal na ficha é recalculado automaticamente com base nos casos ativos após guardar."}
      </p>
      <fieldset disabled={readOnly} className="min-w-0 space-y-5 border-0 p-0 m-0">
        <AnimalSaudeFormFields
          formState={formState}
          setFormState={setFormState}
          minDate={animalMinDate}
        />
      </fieldset>
    </GestaoFormLayout>
  );
}
