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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TIPOS = ["IA", "IATF", "MONTA_NATURAL", "TE"];

function NovoContent() {
  const router = useRouter();
  const { fazendaAtiva } = useFazendaAtiva();
  const queryClient = useQueryClient();
  const [animalId, setAnimalId] = useState("");
  const [tipo, setTipo] = useState("IA");
  const [data, setData] = useState(new Date().toISOString().slice(0,16));
  const [touroInfo, setTouroInfo] = useState("");

  const { data: animais = [] } = useQuery({
    queryKey: ["animais", fazendaAtiva?.id],
    queryFn: () => listByFazenda(fazendaAtiva!.id),
    enabled: !!fazendaAtiva?.id,
  });

  const mutation = useMutation({
    mutationFn: () => create({
      animal_id: Number(animalId),
      tipo,
      data: new Date(data).toISOString(),
      fazenda_id: fazendaAtiva!.id,
      touro_info: touroInfo || undefined,
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
    <PageContainer variant="narrow">
      <BackLink href="/gestao/coberturas">Voltar</BackLink>
      <Card className="mt-4">
        <CardHeader><CardTitle>Registrar cobertura</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Animal (fêmea)</Label>
            <select className="w-full border rounded px-3 py-2" value={animalId} onChange={(e) => setAnimalId(e.target.value)}>
              <option value="">Selecione</option>
              {animais.filter(a => a.sexo === "F").map((a) => (
                <option key={a.id} value={a.id}>{a.identificacao}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Tipo</Label>
            <select className="w-full border rounded px-3 py-2" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <Label>Data/hora</Label>
            <Input type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div>
            <Label>Touro/sêmen (opcional)</Label>
            <Input value={touroInfo} onChange={(e) => setTouroInfo(e.target.value)} placeholder="Nome ou código" />
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
