"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { create } from "@/services/lactacoes";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoFormLayout } from "@/components/gestao/GestaoFormLayout";
import { AnimalSelect } from "@/components/animais/AnimalSelect";
import { DatePicker } from "@/components/ui/date-picker";
import { FormFieldError } from "@/components/ui/form-field-error";
import { todayISODate } from "@/lib/date-limits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getApiErrorConformidadeCode,
  getApiErrorMessage,
} from "@/lib/errors";
import { validateLactacaoForm, type FieldErrors } from "@/lib/form-validation";
import { toast } from "@/hooks/use-toast";

function NovoContent() {
  const router = useRouter();
  const { fazendaAtiva } = useFazendaAtiva();
  const queryClient = useQueryClient();
  const [animalId, setAnimalId] = useState("");
  const [numeroLactacao, setNumeroLactacao] = useState("1");
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10));
  const [formError, setFormError] = useState("");
  const [isValidationError, setIsValidationError] = useState(false);
  const [conformidadeCode, setConformidadeCode] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const fazendaId = fazendaAtiva?.id ?? 0;

  const mutation = useMutation({
    mutationFn: () =>
      create({
        animal_id: Number(animalId),
        numero_lactacao: Math.max(1, parseInt(numeroLactacao, 10) || 1),
        data_inicio: dataInicio,
        fazenda_id: fazendaAtiva!.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lactacoes", fazendaAtiva?.id] });
      toast.success("Lactação registada");
      router.push("/gestao/lactacoes");
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
        <BackLink href="/gestao/lactacoes">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Selecione uma fazenda.</p>
      </PageContainer>
    );
  }

  const handleSubmit = () => {
    setFormError("");
    setConformidadeCode(undefined);
    const validation = validateLactacaoForm({ animalId, dataInicio });
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
      title="Registrar lactação"
      backHref="/gestao/lactacoes"
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
        cicloContext="lactacao"
        value={animalId}
        onValueChange={setAnimalId}
        label="Animal"
        placeholder="Selecione"
        femeasOnly
        error={fieldErrors.animalId}
      />
      <div>
        <Label>Número da lactação</Label>
        <Input
          type="number"
          min={1}
          value={numeroLactacao}
          onChange={(e) => setNumeroLactacao(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Data de início</Label>
        <DatePicker
          value={dataInicio}
          onChange={setDataInicio}
          maxDate={todayISODate()}
          placeholder="Selecione a data"
        />
        <FormFieldError message={fieldErrors.dataInicio} />
      </div>
    </GestaoFormLayout>
  );
}

export default function NovoPage() {
  return <ProtectedRoute><NovoContent /></ProtectedRoute>;
}
