"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { create } from "@/services/cios";
import { listByFazenda } from "@/services/animais";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoFormLayout } from "@/components/gestao/GestaoFormLayout";
import { AnimalSelect } from "@/components/animais/AnimalSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/errors";
import { nowDatetimeLocalInputValue } from "@/lib/format";

const METODOS = ["VISUAL", "PEDOMETRO", "RUFIAO", "OUTRO"] as const;
const INTENSIDADES = ["FRACO", "MODERADO", "FORTE"] as const;

function NovoContent() {
  const router = useRouter();
  const { fazendaAtiva } = useFazendaAtiva();
  const queryClient = useQueryClient();
  const [animalId, setAnimalId] = useState("");
  const [dataDetectado, setDataDetectado] = useState(nowDatetimeLocalInputValue());
  const [metodo, setMetodo] = useState<string>("");
  const [intensidade, setIntensidade] = useState<string>("");

  const { data: animais = [] } = useQuery({
    queryKey: ["animais", fazendaAtiva?.id],
    queryFn: () => listByFazenda(fazendaAtiva!.id),
    enabled: !!fazendaAtiva?.id,
  });

  const mutation = useMutation({
    mutationFn: () =>
      create({
        animal_id: Number(animalId),
        data_detectado: new Date(dataDetectado).toISOString(),
        fazenda_id: fazendaAtiva!.id,
        metodo_deteccao: metodo || undefined,
        intensidade: intensidade || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cios", fazendaAtiva?.id] });
      router.push("/gestao/cios");
    },
  });

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/gestao/cios">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Selecione uma fazenda.</p>
      </PageContainer>
    );
  }

  return (
    <GestaoFormLayout
      title="Registrar cio"
      backHref="/gestao/cios"
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
        <Label>Data/hora detectado</Label>
        <Input
          type="datetime-local"
          value={dataDetectado}
          onChange={(e) => setDataDetectado(e.target.value)}
        />
      </div>
      <div>
        <Label>Método (opcional)</Label>
        <Select value={metodo} onValueChange={setMetodo}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o método" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Nenhum</SelectItem>
            {METODOS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Intensidade (opcional)</Label>
        <Select value={intensidade} onValueChange={setIntensidade}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a intensidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Nenhuma</SelectItem>
            {INTENSIDADES.map((i) => (
              <SelectItem key={i} value={i}>
                {i}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </GestaoFormLayout>
  );
}

export default function NovoPage() {
  return <ProtectedRoute><NovoContent /></ProtectedRoute>;
}
