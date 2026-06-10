"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Cio } from "@/services/cios";
import { get, update } from "@/services/cios";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoFormLayout } from "@/components/gestao/GestaoFormLayout";
import {
  CioFormFields,
  type CioFormState,
} from "@/components/gestao/CioFormFields";
import { GestaoEditarBloqueadoGuard } from "@/components/gestao/GestaoEditarBloqueadoGuard";
import {
  getApiErrorConformidadeCode,
  getApiErrorMessage,
} from "@/lib/errors";
import { todayISODate } from "@/lib/date-limits";
import { validateCioForm, type FieldErrors } from "@/lib/form-validation";
import { toast } from "@/hooks/use-toast";
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
  fazendaId: number;
};

function CioEditForm({ cio, fazendaId }: CioEditFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState(() => initialFormState(cio));
  const [formError, setFormError] = useState("");
  const [isValidationError, setIsValidationError] = useState(false);
  const [conformidadeCode, setConformidadeCode] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

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
      toast.success("Cio atualizado");
      router.push("/gestao/cios");
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
    const validation = validateCioForm(formState, { maxDate: todayISODate() });
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

  const displayError =
    formError ||
    (mutation.isError
      ? getApiErrorMessage(mutation.error, "Erro ao salvar.")
      : undefined);

  return (
    <GestaoFormLayout
      title="Editar cio"
      backHref="/gestao/cios"
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
      <CioFormFields
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

  const { data: cio, isLoading: loadingCio } = useQuery({
    queryKey: ["cio", id],
    queryFn: () => get(id),
    enabled: id > 0,
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
    <GestaoEditarBloqueadoGuard
      animalId={cio.animal_id}
      fazendaId={fazendaAtiva.id}
      backHref="/gestao/cios"
    >
      <CioEditForm key={cio.id} cio={cio} fazendaId={fazendaAtiva.id} />
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
