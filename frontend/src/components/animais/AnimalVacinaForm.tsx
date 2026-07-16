"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  canAgendarVacina,
  canCriarVacina,
  canEditarVacina,
} from "@/config/appAccess";
import { GestaoFormLayout } from "@/components/gestao/GestaoFormLayout";
import {
  AnimalVacinaFormFields,
  animalVacinaFormToPayload,
  emptyAnimalVacinaFormState,
  type AnimalVacinaFormState,
} from "@/components/animais/AnimalVacinaFormFields";
import {
  animalVacinasListQueryKey,
  create,
  update,
  type AnimalVacinaRegistro,
} from "@/services/animalVacinas";
import { animalSaudeListQueryKey } from "@/services/animalSaude";
import { invalidateAnimalTimeline } from "@/services/animais";
import {
  getApiErrorConformidadeCode,
  getApiErrorMessage,
} from "@/lib/errors";
import {
  validateAnimalVacinaForm,
  type FieldErrors,
} from "@/lib/form-validation";
import { toast } from "@/hooks/use-toast";
import { animalFichaVacinasTabHref } from "@/components/animais/ficha/animalFichaTabs";

type Props = {
  animalId: number;
  mode: "create" | "edit";
  initial?: AnimalVacinaRegistro;
  vacinaId?: number;
  forceReadOnly?: boolean;
};

function stateFromRegistro(row: AnimalVacinaRegistro): AnimalVacinaFormState {
  return {
    modo: row.data_aplicacao ? "APLICADA" : "PREVISTA",
    tipoVacina: row.tipo_vacina,
    dose: row.dose ?? "",
    dataPrevista: row.data_prevista.slice(0, 10),
    dataAplicacao: row.data_aplicacao ? row.data_aplicacao.slice(0, 10) : "",
    validadeDias: row.validade_dias != null ? String(row.validade_dias) : "",
    dataProximoReforco: row.data_proximo_reforco
      ? row.data_proximo_reforco.slice(0, 10)
      : "",
    lote: row.lote ?? "",
    veterinario: row.veterinario ?? "",
    observacoes: row.observacoes ?? "",
  };
}

export function AnimalVacinaForm({
  animalId,
  mode,
  initial,
  vacinaId,
  forceReadOnly = false,
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const perfil = user?.perfil;

  const [formState, setFormState] = useState<AnimalVacinaFormState>(() =>
    initial ? stateFromRegistro(initial) : emptyAnimalVacinaFormState()
  );
  const [formError, setFormError] = useState("");
  const [isValidationError, setIsValidationError] = useState(false);
  const [conformidadeCode, setConformidadeCode] = useState<
    string | undefined
  >();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const listHref = animalFichaVacinasTabHref(animalId);
  const canSubmit =
    mode === "create" ? canCriarVacina(perfil) : canEditarVacina(perfil);
  const canAgendar = canAgendarVacina(perfil);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = animalVacinaFormToPayload(formState);
      if (mode === "create") {
        return create(animalId, payload);
      }
      if (!vacinaId) throw new Error("ID do registro em falta");
      return update(animalId, vacinaId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: animalVacinasListQueryKey(animalId),
      });
      queryClient.invalidateQueries({
        queryKey: animalSaudeListQueryKey(animalId),
      });
      queryClient.invalidateQueries({ queryKey: ["animais", animalId] });
      queryClient.invalidateQueries({
        queryKey: ["animais", animalId, "contexto"],
      });
      invalidateAnimalTimeline(queryClient, animalId);
      if (vacinaId) {
        queryClient.invalidateQueries({
          queryKey: ["animais", animalId, "vacinas", vacinaId],
        });
      }
      toast.success(
        mode === "create" ? "Vacina registrada" : "Vacina atualizada"
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
        O seu perfil não pode registrar vacinas deste animal.
      </p>
    );
  }

  const readOnly = forceReadOnly || (mode === "edit" && !canSubmit);

  const handleSubmit = () => {
    if (readOnly) return;
    setFormError("");
    setConformidadeCode(undefined);
    const validation = validateAnimalVacinaForm(formState);
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

  return (
    <GestaoFormLayout
      title={
        readOnly
          ? "Detalhe da vacina"
          : mode === "create"
            ? "Nova vacina"
            : "Editar vacina"
      }
      backHref={listHref}
      submitLabel={mode === "create" ? "Registrar" : "Salvar"}
      onSubmit={handleSubmit}
      isPending={mutation.isPending}
      hideSubmit={readOnly}
      error={formError}
      errorConformidadeCode={
        conformidadeCode ??
        (mutation.isError
          ? getApiErrorConformidadeCode(mutation.error)
          : undefined)
      }
      isValidationError={isValidationError}
      fieldErrors={fieldErrors}
    >
      <p className="text-muted-foreground text-sm">
        {readOnly
          ? "Visualização apenas — o seu perfil não pode editar vacinas."
          : "Vacina aplicada cria automaticamente um caso preventivo concluído na tab Saúde. Vacina prevista atrasada gera alerta automático."}
      </p>
      <fieldset disabled={readOnly} className="min-w-0 space-y-5 border-0 p-0 m-0">
        <AnimalVacinaFormFields
          formState={formState}
          setFormState={setFormState}
          canAgendar={canAgendar}
        />
      </fieldset>
    </GestaoFormLayout>
  );
}
