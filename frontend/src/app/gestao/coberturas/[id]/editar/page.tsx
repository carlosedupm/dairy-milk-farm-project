"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { get, update, type Cobertura } from "@/services/coberturas";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoFormLayout } from "@/components/gestao/GestaoFormLayout";
import {
  CoberturaFormFields,
  useCoberturaChronology,
  type CoberturaFormState,
} from "@/components/gestao/CoberturaFormFields";
import { GestaoEditarBloqueadoGuard } from "@/components/gestao/GestaoEditarBloqueadoGuard";
import {
  getApiErrorConformidadeCode,
  getApiErrorMessage,
} from "@/lib/errors";
import { todayISODate } from "@/lib/date-limits";
import { validateCoberturaForm, type FieldErrors } from "@/lib/form-validation";
import { toast } from "@/hooks/use-toast";
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
  const [formError, setFormError] = useState("");
  const [isValidationError, setIsValidationError] = useState(false);
  const [conformidadeCode, setConformidadeCode] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const chronology = useCoberturaChronology(formState.animalId);

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
      toast.success("Cobertura atualizada");
      router.push("/gestao/coberturas");
    },
    onError: (err: unknown) => {
      setFormError(getApiErrorMessage(err, "Erro ao salvar."));
      setConformidadeCode(getApiErrorConformidadeCode(err));
      setIsValidationError(false);
    },
  });

  const handleSubmit = () => {
    setFormError("");
    setConformidadeCode(undefined);
    const validation = validateCoberturaForm(formState, {
      ...chronology,
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

  const displayError =
    formError ||
    (mutation.isError
      ? getApiErrorMessage(mutation.error, "Erro ao salvar.")
      : undefined);

  return (
    <GestaoFormLayout
      title="Editar cobertura"
      backHref="/gestao/coberturas"
      submitLabel="Salvar"
      onSubmit={handleSubmit}
      isPending={mutation.isPending}
      error={displayError}
      errorConformidadeCode={
        conformidadeCode ??
        (mutation.isError ? getApiErrorConformidadeCode(mutation.error) : undefined)
      }
      isValidationError={isValidationError}
      fieldErrors={fieldErrors}
    >
      <CoberturaFormFields
        fazendaId={fazendaId}
        formState={formState}
        setFormState={setFormState}
        preserveSelected
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
    <GestaoEditarBloqueadoGuard
      animalId={cobertura.animal_id}
      fazendaId={fazendaAtiva.id}
      backHref="/gestao/coberturas"
    >
      <CoberturaEditForm
        key={cobertura.id}
        cobertura={cobertura}
        fazendaId={fazendaAtiva.id}
      />
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
