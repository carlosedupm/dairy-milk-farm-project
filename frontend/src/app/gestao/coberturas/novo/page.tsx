"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { create } from "@/services/coberturas";
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

const TIPOS = ["IA", "IATF", "MONTA_NATURAL", "TE"];

function NovoContent() {
  const router = useRouter();
  const { fazendaAtiva } = useFazendaAtiva();
  const queryClient = useQueryClient();
  const [animalId, setAnimalId] = useState("");
  const [tipo, setTipo] = useState("IA");
  const [data, setData] = useState(new Date().toISOString().slice(0, 16));
  const [touroAnimalId, setTouroAnimalId] = useState("");
  const [touroInfo, setTouroInfo] = useState("");

  const { data: animais = [] } = useQuery({
    queryKey: ["animais", fazendaAtiva?.id],
    queryFn: () => listByFazenda(fazendaAtiva!.id),
    enabled: !!fazendaAtiva?.id,
  });

  const isMontaNatural = tipo === "MONTA_NATURAL";
  const hasReprodutor = !!touroAnimalId || !!touroInfo.trim();

  const mutation = useMutation({
    mutationFn: () =>
      create({
        animal_id: Number(animalId),
        tipo,
        data: new Date(data).toISOString(),
        fazenda_id: fazendaAtiva!.id,
        // Para MONTA_NATURAL: priorizar touro_animal_id (vinculação); touro_info só quando reprodutor não está cadastrado
        touro_animal_id: touroAnimalId ? Number(touroAnimalId) : undefined,
        touro_info: touroAnimalId ? undefined : (touroInfo.trim() || undefined),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coberturas", fazendaAtiva?.id] });
      router.push("/gestao/coberturas");
    },
  });

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/gestao/coberturas">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Selecione uma fazenda.</p>
      </PageContainer>
    );
  }

  return (
    <GestaoFormLayout
      title="Registrar cobertura"
      backHref="/gestao/coberturas"
      submitLabel="Registrar"
      onSubmit={() => mutation.mutate()}
      isPending={mutation.isPending}
      error={mutation.isError ? getApiErrorMessage(mutation.error, "Erro ao registrar.") : undefined}
      submitDisabled={!animalId || (isMontaNatural && !hasReprodutor)}
    >
      <AnimalSelect
        animais={animais}
        value={animalId}
        onValueChange={setAnimalId}
        label="Animal (fêmea)"
        placeholder="Selecione"
        femeasOnly
      />
      <div>
        <Label>Tipo</Label>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            {TIPOS.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Data/hora</Label>
        <Input type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} />
      </div>
      <AnimalSelect
        animais={animais}
        value={touroAnimalId}
        onValueChange={(v) => {
          setTouroAnimalId(v);
          if (v) setTouroInfo(""); // Ao selecionar animal, limpar texto para priorizar vinculação
        }}
        label={isMontaNatural ? "Reprodutor (touro/boi) *" : "Reprodutor (opcional)"}
        placeholder="Selecione o touro ou boi cadastrado"
        reprodutoresOnly
      />
      <div>
        <Label>
          {isMontaNatural ? "Touro (só se não estiver cadastrado)" : "Touro/sêmen (opcional)"}
        </Label>
        <Input
          value={touroInfo}
          onChange={(e) => {
            setTouroInfo(e.target.value);
            if (e.target.value.trim()) setTouroAnimalId(""); // Ao digitar, limpar seleção
          }}
          placeholder="Nome ou código do touro/sêmen"
        />
      </div>
    </GestaoFormLayout>
  );
}

export default function NovoPage() {
  return <ProtectedRoute><NovoContent /></ProtectedRoute>;
}
