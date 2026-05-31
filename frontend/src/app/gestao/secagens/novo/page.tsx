"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { create } from "@/services/secagens";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoFormLayout } from "@/components/gestao/GestaoFormLayout";
import { AnimalSelect } from "@/components/animais/AnimalSelect";
import { DatePicker } from "@/components/ui/date-picker";
import { FormFieldError } from "@/components/ui/form-field-error";
import { todayISODate } from "@/lib/date-limits";
import { Label } from "@/components/ui/label";
import {
  getApiErrorConformidadeCode,
  getApiErrorMessage,
} from "@/lib/errors";
import { validateSecagemForm, type FieldErrors } from "@/lib/form-validation";
import { toast } from "@/hooks/use-toast";

function NovoContent() {
  const router = useRouter();
  const { fazendaAtiva } = useFazendaAtiva();
  const queryClient = useQueryClient();
  const [animalId, setAnimalId] = useState("");
  const [dataSecagem, setDataSecagem] = useState(new Date().toISOString().slice(0, 10));
  const [formError, setFormError] = useState("");
  const [isValidationError, setIsValidationError] = useState(false);
  const [conformidadeCode, setConformidadeCode] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const fazendaId = fazendaAtiva?.id ?? 0;

  const mutation = useMutation({
    mutationFn: () =>
      create({
        animal_id: Number(animalId),
        data_secagem: dataSecagem,
        fazenda_id: fazendaAtiva!.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secagens", fazendaAtiva?.id] });
      toast.success("Secagem registada");
      router.push("/gestao/secagens");
    },
    onError: (err: unknown) => {
      setFormError(getApiErrorMessage(err, "Erro ao registrar."));
      setConformidadeCode(getApiErrorConformidadeCode(err));
      setIsValidationError(false);
    },
  });

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/gestao/secagens">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Selecione uma fazenda.</p>
      </PageContainer>
    );
  }

  const handleSubmit = () => {
    setFormError("");
    setConformidadeCode(undefined);
    const validation = validateSecagemForm({
      animalId,
      data: dataSecagem,
    });
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
      ? getApiErrorMessage(mutation.error, "Erro ao registrar.")
      : undefined);

  return (
    <GestaoFormLayout
      title="Registrar secagem"
      backHref="/gestao/secagens"
      submitLabel="Registrar"
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
      <AnimalSelect
        fazendaId={fazendaId}
        cicloContext="secagem"
        value={animalId}
        onValueChange={setAnimalId}
        label="Animal"
        placeholder="Selecione"
        femeasOnly
        error={fieldErrors.animalId}
      />
      <div className="space-y-2">
        <Label>Data da secagem</Label>
        <DatePicker
          value={dataSecagem}
          onChange={setDataSecagem}
          maxDate={todayISODate()}
          placeholder="Selecione a data"
        />
        <FormFieldError message={fieldErrors.data} />
      </div>
    </GestaoFormLayout>
  );
}

export default function NovoPage() {
  return <ProtectedRoute><NovoContent /></ProtectedRoute>;
}
