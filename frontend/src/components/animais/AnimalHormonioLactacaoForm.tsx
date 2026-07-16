"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  canCriarHormonioLactacao,
  canEditarHormonioLactacao,
} from "@/config/appAccess";
import { GestaoFormLayout } from "@/components/gestao/GestaoFormLayout";
import {
  AnimalHormonioLactacaoFormFields,
  animalHormonioFormToPayload,
  emptyAnimalHormonioLactacaoFormState,
  type AnimalHormonioLactacaoFormState,
} from "@/components/animais/AnimalHormonioLactacaoFormFields";
import {
  create,
  hormonioLactacaoProtocoloQueryKey,
  hormoniosLactacaoListQueryKey,
  hormoniosLactacaoPendentesQueryKey,
  update,
  type HormonioLactacaoAplicacao,
} from "@/services/animalHormoniosLactacao";
import { animalSaudeListQueryKey } from "@/services/animalSaude";
import { invalidateAnimalTimeline } from "@/services/animais";
import {
  getApiErrorCode,
  getApiErrorConformidadeCode,
  getApiErrorMessage,
} from "@/lib/errors";
import { toast } from "@/hooks/use-toast";
import { animalFichaHormonioLactacaoTabHref } from "@/components/animais/ficha/animalFichaTabs";
import type { FieldErrors } from "@/lib/form-validation";

type Props = {
  animalId: number;
  fazendaId: number;
  mode: "create" | "edit";
  initial?: HormonioLactacaoAplicacao;
  aplicacaoId?: number;
};

function stateFromRegistro(
  row: HormonioLactacaoAplicacao,
): AnimalHormonioLactacaoFormState {
  return {
    produto: row.produto,
    dataAplicacao: row.data_aplicacao.slice(0, 10),
    lote: row.lote ?? "",
    observacoes: row.observacoes ?? "",
  };
}

const HORMONIO_API_ERROR_MESSAGES: Record<string, string> = {
  SEM_LACTACAO_ATIVA:
    "O animal não tem lactação ativa. Registe a lactação antes de aplicar hormônio.",
  SEM_GESTACAO_ATIVA:
    "O animal não tem gestação confirmada com parto previsto.",
  HORMONIO_SEM_TOQUE_PRENHE:
    "Falta o 1º toque prenhe após o início da lactação atual.",
  HORMONIO_INTERVALO_MINIMO:
    "Aguarde pelo menos 14 dias desde a dose anterior.",
  HORMONIO_JANELA_PRE_PARTO:
    "Não é permitido aplicar na janela de 70 dias antes do parto previsto.",
  PROTOCOLO_ENCERRADO:
    "O protocolo desta lactação já foi encerrado.",
};

function hormonioLactacaoApiErrorMessage(
  err: unknown,
  code: string | undefined,
  conformidade: string | undefined,
  fallback: string,
): string {
  if (code && HORMONIO_API_ERROR_MESSAGES[code]) {
    return HORMONIO_API_ERROR_MESSAGES[code];
  }
  return getApiErrorMessage(err, fallback);
}

function validateForm(state: AnimalHormonioLactacaoFormState): FieldErrors {
  const errors: FieldErrors = {};
  if (!state.produto) errors.produto = "Selecione o produto.";
  if (!state.dataAplicacao) errors.dataAplicacao = "Informe a data da aplicação.";
  return errors;
}

export function AnimalHormonioLactacaoForm({
  animalId,
  fazendaId,
  mode,
  initial,
  aplicacaoId,
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [formState, setFormState] = useState<AnimalHormonioLactacaoFormState>(
    () =>
      initial
        ? stateFromRegistro(initial)
        : emptyAnimalHormonioLactacaoFormState(),
  );
  const [formError, setFormError] = useState("");
  const [isValidationError, setIsValidationError] = useState(false);
  const [conformidadeCode, setConformidadeCode] = useState<
    string | undefined
  >();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const listHref = animalFichaHormonioLactacaoTabHref(animalId);
  const canSubmit =
    mode === "create"
      ? canCriarHormonioLactacao(user?.perfil)
      : canEditarHormonioLactacao(user?.perfil);
  const readOnly = mode === "edit" && !canSubmit;

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = animalHormonioFormToPayload(formState);
      if (mode === "create") return create(animalId, payload);
      if (!aplicacaoId) throw new Error("ID da aplicação inválido");
      return update(animalId, aplicacaoId, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: hormoniosLactacaoListQueryKey(animalId),
      });
      await queryClient.invalidateQueries({
        queryKey: hormonioLactacaoProtocoloQueryKey(animalId),
      });
      await queryClient.invalidateQueries({
        queryKey: hormoniosLactacaoPendentesQueryKey(fazendaId),
      });
      await queryClient.invalidateQueries({
        queryKey: animalSaudeListQueryKey(animalId),
      });
      invalidateAnimalTimeline(queryClient, animalId);
      toast.success(
        mode === "create"
          ? "Aplicação registrada."
          : "Aplicação atualizada.",
      );
      router.push(listHref);
    },
    onError: (err: unknown) => {
      const code = getApiErrorCode(err);
      const conformidade = getApiErrorConformidadeCode(err);
      setConformidadeCode(conformidade ?? code);
      setFormError(
        hormonioLactacaoApiErrorMessage(
          err,
          code,
          conformidade,
          mode === "create" ? "Erro ao registrar." : "Erro ao salvar.",
        ),
      );
      setIsValidationError(
        Boolean(conformidade) ||
          code === "SEM_LACTACAO_ATIVA" ||
          code === "SEM_GESTACAO_ATIVA" ||
          code === "HORMONIO_SEM_TOQUE_PRENHE" ||
          code === "HORMONIO_INTERVALO_MINIMO" ||
          code === "HORMONIO_JANELA_PRE_PARTO" ||
          code === "PROTOCOLO_ENCERRADO" ||
          code === "VALIDATION_ERROR",
      );
    },
  });

  const handleSubmit = () => {
    if (readOnly) return;
    setFormError("");
    setConformidadeCode(undefined);
    const errors = validateForm(formState);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setIsValidationError(true);
      return;
    }
    setIsValidationError(false);
    mutation.mutate();
  };

  return (
    <GestaoFormLayout
      title={
        readOnly
          ? "Detalhe da aplicação"
          : mode === "create"
            ? "Registrar hormônio de lactação"
            : "Editar aplicação"
      }
      backHref={listHref}
      onSubmit={handleSubmit}
      submitLabel={mode === "create" ? "Registrar" : "Salvar"}
      isPending={mutation.isPending}
      hideSubmit={readOnly}
      submitDisabled={!canSubmit}
      error={formError}
      isValidationError={isValidationError}
      errorConformidadeCode={conformidadeCode}
      fieldErrors={fieldErrors}
    >
      <p className="text-muted-foreground text-sm">
        {readOnly
          ? "Visualização apenas — o seu perfil não pode editar aplicações de hormônio."
          : "A data deve ser posterior ao início da lactação atual e ao 1º toque prenhe desta lactação. O registo usa a lactação e a gestação ativas hoje."}
      </p>
      <fieldset disabled={readOnly} className="min-w-0 space-y-5 border-0 p-0 m-0">
        <AnimalHormonioLactacaoFormFields
          formState={formState}
          setFormState={setFormState}
        />
      </fieldset>
    </GestaoFormLayout>
  );
}
