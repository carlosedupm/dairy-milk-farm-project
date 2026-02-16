"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { create } from "@/services/lactacoes";
import { listByFazenda } from "@/services/animais";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoFormLayout } from "@/components/gestao/GestaoFormLayout";
import { AnimalSelect } from "@/components/animais/AnimalSelect";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/errors";

function NovoContent() {
  const router = useRouter();
  const { fazendaAtiva } = useFazendaAtiva();
  const queryClient = useQueryClient();
  const [animalId, setAnimalId] = useState("");
  const [numeroLactacao, setNumeroLactacao] = useState("1");
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10));

  const { data: animais = [] } = useQuery({
    queryKey: ["animais", fazendaAtiva?.id],
    queryFn: () => listByFazenda(fazendaAtiva!.id),
    enabled: !!fazendaAtiva?.id,
  });

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
      router.push("/gestao/lactacoes");
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

  return (
    <GestaoFormLayout
      title="Registrar lactação"
      backHref="/gestao/lactacoes"
      submitLabel="Registrar"
      onSubmit={() => mutation.mutate()}
      isPending={mutation.isPending}
      error={mutation.isError ? getApiErrorMessage(mutation.error, "Erro ao registrar.") : undefined}
      submitDisabled={!animalId}
    >
      <AnimalSelect
        animais={animais}
        value={animalId}
        onValueChange={setAnimalId}
        label="Animal"
        placeholder="Selecione"
        femeasOnly
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
      <div>
        <Label>Data de início</Label>
        <DatePicker value={dataInicio} onChange={setDataInicio} placeholder="Selecione a data" />
      </div>
    </GestaoFormLayout>
  );
}

export default function NovoPage() {
  return <ProtectedRoute><NovoContent /></ProtectedRoute>;
}
