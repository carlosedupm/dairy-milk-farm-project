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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function NovoContent() {
  const router = useRouter();
  const { fazendaAtiva } = useFazendaAtiva();
  const queryClient = useQueryClient();
  const [animalId, setAnimalId] = useState("");
  const [numeroLactacao, setNumeroLactacao] = useState("1");
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0,10));

  const { data: animais = [] } = useQuery({
    queryKey: ["animais", fazendaAtiva?.id],
    queryFn: () => listByFazenda(fazendaAtiva!.id),
    enabled: !!fazendaAtiva?.id,
  });

  const mutation = useMutation({
    mutationFn: () => create({
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
    <PageContainer variant="narrow">
      <BackLink href="/gestao/lactacoes">Voltar</BackLink>
      <Card className="mt-4">
        <CardHeader><CardTitle>Registrar lactação</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Animal</Label>
            <select className="w-full border rounded px-3 py-2" value={animalId} onChange={(e) => setAnimalId(e.target.value)}>
              <option value="">Selecione</option>
              {animais.filter(a => a.sexo === "F").map((a) => (
                <option key={a.id} value={a.id}>{a.identificacao}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Número da lactação</Label>
            <Input type="number" min={1} value={numeroLactacao} onChange={(e) => setNumeroLactacao(e.target.value)} />
          </div>
          <div>
            <Label>Data de início</Label>
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={!animalId || mutation.isPending}>
            {mutation.isPending ? "Salvando…" : "Registrar"}
          </Button>
          {mutation.isError && <p className="text-destructive text-sm">Erro ao registrar.</p>}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default function NovoPage() {
  return <ProtectedRoute><NovoContent /></ProtectedRoute>;
}
