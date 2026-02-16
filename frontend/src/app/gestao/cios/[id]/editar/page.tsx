"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Cio } from "@/services/cios";
import { get, update } from "@/services/cios";
import { listByFazenda } from "@/services/animais";
import type { Animal } from "@/services/animais";
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

const METODOS = ["VISUAL", "PEDOMETRO", "RUFIAO", "OUTRO"] as const;
const INTENSIDADES = ["FRACO", "MODERADO", "FORTE"] as const;

function initialFormState(cio: Cio) {
  return {
    animalId: cio.animal_id.toString(),
    dataDetectado: cio.data_detectado?.slice(0, 16) ?? "",
    metodo: cio.metodo_deteccao ?? "",
    intensidade: cio.intensidade ?? "",
  };
}

type CioEditFormProps = {
  cio: Cio;
  animais: Animal[];
  fazendaId: number;
};

function CioEditForm({ cio, animais, fazendaId }: CioEditFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState(() => initialFormState(cio));

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
      router.push("/gestao/cios");
    },
  });

  return (
    <GestaoFormLayout
      title="Editar cio"
      backHref="/gestao/cios"
      submitLabel="Salvar"
      onSubmit={() => mutation.mutate()}
      isPending={mutation.isPending}
      error={
        mutation.isError
          ? getApiErrorMessage(mutation.error, "Erro ao salvar.")
          : undefined
      }
      submitDisabled={!formState.animalId}
    >
      <AnimalSelect
        animais={animais}
        value={formState.animalId}
        onValueChange={(v) => setFormState((s) => ({ ...s, animalId: v }))}
        label="Animal"
        placeholder="Selecione"
        femeasOnly
      />
      <div>
        <Label>Data/hora detectado</Label>
        <Input
          type="datetime-local"
          value={formState.dataDetectado}
          onChange={(e) =>
            setFormState((s) => ({ ...s, dataDetectado: e.target.value }))
          }
        />
      </div>
      <div>
        <Label>Método (opcional)</Label>
        <Select
          value={formState.metodo}
          onValueChange={(v) => setFormState((s) => ({ ...s, metodo: v }))}
        >
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
        <Select
          value={formState.intensidade}
          onValueChange={(v) => setFormState((s) => ({ ...s, intensidade: v }))}
        >
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

function EditarContent() {
  const params = useParams();
  const id = Number(params.id);
  const { fazendaAtiva } = useFazendaAtiva();

  const { data: cio, isLoading: loadingCio } = useQuery({
    queryKey: ["cio", id],
    queryFn: () => get(id),
    enabled: id > 0,
  });

  const { data: animais = [] } = useQuery({
    queryKey: ["animais", fazendaAtiva?.id],
    queryFn: () => listByFazenda(fazendaAtiva!.id),
    enabled: !!fazendaAtiva?.id,
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

  return (
    <CioEditForm
      key={cio.id}
      cio={cio}
      animais={animais}
      fazendaId={fazendaAtiva.id}
    />
  );
}

export default function EditarPage() {
  return (
    <ProtectedRoute>
      <EditarContent />
    </ProtectedRoute>
  );
}
