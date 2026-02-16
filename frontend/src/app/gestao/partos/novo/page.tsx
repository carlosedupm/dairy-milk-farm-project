"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { create } from "@/services/partos";
import { listByFazenda } from "@/services/animais";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoFormLayout } from "@/components/gestao/GestaoFormLayout";
import { AnimalSelect } from "@/components/animais/AnimalSelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/errors";

function NovoContent() {
  const router = useRouter();
  const { fazendaAtiva } = useFazendaAtiva();
  const queryClient = useQueryClient();
  const [animalId, setAnimalId] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 16));
  const [numeroCrias, setNumeroCrias] = useState("1");

  const { data: animaisData } = useQuery({
    queryKey: ["animais", fazendaAtiva?.id],
    queryFn: () => listByFazenda(fazendaAtiva!.id),
    enabled: !!fazendaAtiva?.id,
  });
  const animais = Array.isArray(animaisData) ? animaisData : [];

  const mutation = useMutation({
    mutationFn: () =>
      create({
        animal_id: Number(animalId),
        data: new Date(data).toISOString(),
        fazenda_id: fazendaAtiva!.id,
        numero_crias: Math.max(1, parseInt(numeroCrias, 10) || 1),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partos", fazendaAtiva?.id] });
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
      error={mutation.isError ? getApiErrorMessage(mutation.error, "Erro ao registrar.") : undefined}
      submitDisabled={!animalId}
    >
      <AnimalSelect
        animais={animais}
        value={animalId}
        onValueChange={setAnimalId}
        label="Animal (mãe)"
        placeholder="Selecione"
        femeasOnly
      />
      <div>
        <Label>Data/hora</Label>
        <Input type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} />
      </div>
      <div>
        <Label>Número de crias</Label>
        <Input
          type="number"
          min={1}
          value={numeroCrias}
          onChange={(e) => setNumeroCrias(e.target.value)}
        />
      </div>
    </GestaoFormLayout>
  );
}

export default function NovoPage() {
  return <ProtectedRoute><NovoContent /></ProtectedRoute>;
}
