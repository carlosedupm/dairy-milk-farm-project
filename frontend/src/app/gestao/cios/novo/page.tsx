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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function NovoContent() {
  const router = useRouter();
  const { fazendaAtiva } = useFazendaAtiva();
  const queryClient = useQueryClient();
  const [animalId, setAnimalId] = useState("");
  const [dataDetectado, setDataDetectado] = useState(new Date().toISOString().slice(0,16));
  const [metodo, setMetodo] = useState("");
  const [intensidade, setIntensidade] = useState("");

  const { data: animais = [] } = useQuery({
    queryKey: ["animais", fazendaAtiva?.id],
    queryFn: () => listByFazenda(fazendaAtiva!.id),
    enabled: !!fazendaAtiva?.id,
  });

  const mutation = useMutation({
    mutationFn: () => create({
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
    <PageContainer variant="narrow">
      <BackLink href="/gestao/cios">Voltar</BackLink>
      <Card className="mt-4">
        <CardHeader><CardTitle>Registrar cio</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Animal</Label>
            <select className="w-full border rounded px-3 py-2" value={animalId} onChange={(e) => setAnimalId(e.target.value)}>
              <option value="">Selecione</option>
              {animais.filter(a => a.sexo === "F").map((a) => (
                <option key={a.id} value={a.id}>{a.identificacao} ({a.raca ?? "-"})</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Data/hora detectado</Label>
            <Input type="datetime-local" value={dataDetectado} onChange={(e) => setDataDetectado(e.target.value)} />
          </div>
          <div>
            <Label>Método (opcional)</Label>
            <Input value={metodo} onChange={(e) => setMetodo(e.target.value)} placeholder="VISUAL, PEDOMETRO, RUFIAO" />
          </div>
          <div>
            <Label>Intensidade (opcional)</Label>
            <Input value={intensidade} onChange={(e) => setIntensidade(e.target.value)} placeholder="FRACO, MODERADO, FORTE" />
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
